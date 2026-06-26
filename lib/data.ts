/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {
  District,
  Investor,
  Listing,
  MarketData,
  Parcel,
  QuarterPoint,
  ServerData,
  Transaction,
} from "./types";
import { normalize, relationshipScore } from "./scoring";

const DATA_DIR = path.join(process.cwd(), "data");

function readCsv<T>(file: string): T[] {
  const full = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(full, "utf8");
  const parsed = Papa.parse<T>(raw, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return parsed.data.filter((r): r is T => r != null && typeof r === "object");
}

/** Deterministic 0..1 PRNG seeded by a string (stable across reloads). */
function seeded(seedStr: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Title-case + trim a district name and resolve to canonical spelling. */
function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "50M-200M" -> [50_000_000, 200_000_000]; "600M-2.5B" -> [..., 2.5e9]. */
export function parseCapitalRange(range: string): [number, number] {
  const parse = (token: string): number => {
    const t = token.trim().toUpperCase();
    const mult = t.endsWith("B") ? 1_000_000_000 : 1_000_000;
    return parseFloat(t.replace(/[MB]/g, "")) * mult;
  };
  const parts = String(range).split("-");
  const min = parse(parts[0]);
  const max = parse(parts[parts.length - 1]);
  return [min, max];
}

// ---- Module-level caches (read each CSV once per server process) ----
let _districts: District[] | null = null;
let _investors: Investor[] | null = null;
let _market: MarketData | null = null;
let _canonical: Map<string, string> | null = null;

function quarterOf(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function buildCanonical(rawDistricts: { district: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rawDistricts) {
    const canon = String(r.district).trim();
    map.set(canon.toLowerCase(), canon);
  }
  return map;
}

export function resolveDistrict(name: string): string | null {
  if (!_canonical) getDistricts();
  const key = titleCase(String(name)).toLowerCase();
  return _canonical?.get(key) ?? _canonical?.get(String(name).trim().toLowerCase()) ?? null;
}

export function getDistricts(): District[] {
  if (_districts) return _districts;

  const rawDistricts = readCsv<any>("districts.csv");
  _canonical = buildCanonical(rawDistricts);

  const communities = readCsv<any>("sample_communities.csv");
  const transactions = readCsv<any>("sample_transactions.csv");
  const osm = readCsv<any>("osm_amenities.csv");

  // Latest transaction date for "last 12 months" window.
  let maxDate = 0;
  for (const t of transactions) {
    const ts = new Date(t.date).getTime();
    if (ts > maxDate) maxDate = ts;
  }
  const windowStart = maxDate - 365 * 24 * 3600 * 1000;

  // Aggregate per district.
  const txAgg: Record<string, { sum: number; n: number; total: number }> = {};
  for (const t of transactions) {
    const d = String(t.district).trim();
    if (!txAgg[d]) txAgg[d] = { sum: 0, n: 0, total: 0 };
    txAgg[d].total += 1;
    if (new Date(t.date).getTime() >= windowStart) {
      txAgg[d].sum += Number(t.price_per_sqm) || 0;
      txAgg[d].n += 1;
    }
  }

  const commAgg: Record<string, { demand: number; exp: number; n: number }> = {};
  for (const c of communities) {
    const d = String(c.district).trim();
    if (!commAgg[d]) commAgg[d] = { demand: 0, exp: 0, n: 0 };
    commAgg[d].demand += Number(c.service_demand_index) || 0;
    commAgg[d].exp += Number(c.resident_experience_score) || 0;
    commAgg[d].n += 1;
  }

  const amenityCount: Record<string, number> = {};
  for (const a of osm) {
    const d = String(a.district).trim();
    amenityCount[d] = (amenityCount[d] || 0) + 1;
  }

  // Resolve unjoined districts for logging.
  const unjoined = new Set<string>();
  const checkJoin = (rows: { district: string }[]) => {
    for (const r of rows) {
      const d = String(r.district).trim();
      if (!_canonical!.has(d.toLowerCase())) unjoined.add(d);
    }
  };
  checkJoin(communities);
  checkJoin(transactions);
  checkJoin(osm);
  if (unjoined.size) {
    // eslint-disable-next-line no-console
    console.warn("[data] districts that failed to join:", [...unjoined]);
  }

  // Ranges for gap_score normalization.
  const demandAvgs = rawDistricts.map((d) => {
    const a = commAgg[String(d.district).trim()];
    return a && a.n ? a.demand / a.n : 0;
  });
  const expAvgs = rawDistricts.map((d) => {
    const a = commAgg[String(d.district).trim()];
    return a && a.n ? a.exp / a.n : 0;
  });
  const amenityVals = rawDistricts.map((d) => amenityCount[String(d.district).trim()] || 0);

  const range = (arr: number[]): [number, number] => [Math.min(...arr), Math.max(...arr)];
  const demandR = range(demandAvgs);
  const expR = range(expAvgs);
  const amenityR = range(amenityVals);

  _districts = rawDistricts.map((d) => {
    const name = String(d.district).trim();
    const tx = txAgg[name];
    const comm = commAgg[name];
    const avgPrice = tx && tx.n ? Math.round(tx.sum / tx.n) : Number(d.base_sale_aed_sqm) || 0;
    const demandAvg = comm && comm.n ? comm.demand / comm.n : 0;
    const expAvg = comm && comm.n ? comm.exp / comm.n : 0;
    const amenities = amenityCount[name] || 0;

    const gap =
      (normalize(demandAvg, demandR[0], demandR[1]) * 0.4 +
        (1 - normalize(amenities, amenityR[0], amenityR[1])) * 0.4 +
        (1 - normalize(expAvg, expR[0], expR[1])) * 0.2) *
      100;

    return {
      district: name,
      area_type: String(d.area_type),
      profile: String(d.profile),
      base_sale_aed_sqm: Number(d.base_sale_aed_sqm) || 0,
      gross_yield_pct: Number(d.gross_yield_pct) || 0,
      infrastructure_score: Number(d.infrastructure_score) || 0,
      latitude: Number(d.latitude) || 0,
      longitude: Number(d.longitude) || 0,
      avg_price_sqm: avgPrice,
      transaction_count: tx ? tx.total : 0,
      gap_score: Math.round(gap),
    } as District;
  });

  return _districts;
}

export function getInvestors(): Investor[] {
  if (_investors) return _investors;
  const raw = readCsv<any>("sample_investors.csv");

  // First pass: parse + simulate portfolio/deals so we can compute ranges.
  const base = raw.map((r) => {
    const id = String(r.investor_id);
    const rng = seeded(id);
    const [capital_min, capital_max] = parseCapitalRange(r.capital_range_aed);
    const fit = Number(r.strategic_fit_score) || 0;
    const deals_closed = fit > 70 ? randInt(rng, 8, 15) : randInt(rng, 2, 7);
    const portfolio_size_aed = capital_max * 3;
    const risk = String(r.risk_profile);
    const response_rate = risk === "aggressive" ? 0.85 : risk === "balanced" ? 0.7 : 0.55;
    const horizon = String(r.investment_horizon);
    const avg_deal_time_days =
      horizon === "short"
        ? randInt(rng, 14, 30)
        : horizon === "medium"
          ? randInt(rng, 30, 60)
          : randInt(rng, 60, 120);
    return {
      investor_id: id,
      investor_type: String(r.investor_type),
      preferred_sector: String(r.preferred_sector),
      preferred_district: String(r.preferred_district).trim(),
      capital_range_aed: String(r.capital_range_aed),
      capital_min,
      capital_max,
      risk_profile: risk,
      investment_horizon: horizon,
      strategic_fit_score: fit,
      portfolio_size_aed,
      deals_closed,
      response_rate,
      avg_deal_time_days,
      relationship_score: 0,
    } as Investor;
  });

  const portfolios = base.map((b) => b.portfolio_size_aed);
  const dealsArr = base.map((b) => b.deals_closed);
  const portfolioRange: [number, number] = [Math.min(...portfolios), Math.max(...portfolios)];
  const dealsRange: [number, number] = [Math.min(...dealsArr), Math.max(...dealsArr)];

  _investors = base.map((b) => ({
    ...b,
    relationship_score: relationshipScore({
      portfolio_size_aed: b.portfolio_size_aed,
      deals_closed: b.deals_closed,
      response_rate: b.response_rate,
      investment_horizon: b.investment_horizon,
      strategic_fit_score: b.strategic_fit_score,
      portfolioRange,
      dealsRange,
    }),
  }));

  return _investors;
}

export function getListings(): Listing[] {
  return readCsv<Listing>("sample_listings.csv");
}

export function getTransactions(): Transaction[] {
  return readCsv<Transaction>("sample_transactions.csv");
}

export function getParcels(): Parcel[] {
  return readCsv<Parcel>("sample_parcels.csv");
}

export function getMarketData(): MarketData {
  if (_market) return _market;
  const transactions = readCsv<any>("sample_transactions.csv");
  const listings = readCsv<any>("sample_listings.csv");

  // Determine the last 8 quarters present in the data.
  const quarters = Array.from(new Set(transactions.map((t) => quarterOf(t.date)))).sort();
  const last8 = quarters.slice(-8);
  const last8Set = new Set(last8);

  const perDistrict: Record<string, Record<string, { sum: number; n: number }>> = {};
  const overall: Record<string, { sum: number; n: number }> = {};
  const assetVol: Record<string, number> = {};

  for (const t of transactions) {
    const q = quarterOf(t.date);
    const d = String(t.district).trim();
    const ppsqm = Number(t.price_per_sqm) || 0;
    assetVol[String(t.asset_type)] = (assetVol[String(t.asset_type)] || 0) + 1;
    if (!last8Set.has(q)) continue;
    if (!perDistrict[d]) perDistrict[d] = {};
    if (!perDistrict[d][q]) perDistrict[d][q] = { sum: 0, n: 0 };
    perDistrict[d][q].sum += ppsqm;
    perDistrict[d][q].n += 1;
    if (!overall[q]) overall[q] = { sum: 0, n: 0 };
    overall[q].sum += ppsqm;
    overall[q].n += 1;
  }

  const seriesByDistrict: Record<string, QuarterPoint[]> = {};
  for (const [d, qmap] of Object.entries(perDistrict)) {
    seriesByDistrict[d] = last8.map((q) => ({
      quarter: q,
      price: qmap[q] && qmap[q].n ? Math.round(qmap[q].sum / qmap[q].n) : 0,
    }));
  }
  const overallSeries: QuarterPoint[] = last8.map((q) => ({
    quarter: q,
    price: overall[q] && overall[q].n ? Math.round(overall[q].sum / overall[q].n) : 0,
  }));

  const listingCountByDistrict: Record<string, number> = {};
  for (const l of listings) {
    if (String(l.status) === "available") {
      const d = String(l.district).trim();
      listingCountByDistrict[d] = (listingCountByDistrict[d] || 0) + 1;
    }
  }

  const assetVolume = Object.entries(assetVol)
    .map(([asset_type, count]) => ({ asset_type, count }))
    .sort((a, b) => b.count - a.count);

  _market = { seriesByDistrict, overallSeries, assetVolume, listingCountByDistrict };
  return _market;
}

export function getServerData(): ServerData {
  return {
    districts: getDistricts(),
    investors: getInvestors(),
    market: getMarketData(),
  };
}
