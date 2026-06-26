# DealFlow — UAE Distressed Property Deal Platform

A two-sided, AI-powered marketplace where sellers publish distressed real-estate deals, Claude scores and matches them to investors, and a **credibility-gated bidding platform** allocates slots only to serious, verified buyers.

> Built for the Abu Dhabi AI PropTech Challenge using the starter-kit datasets. The app runs **fully offline on deterministic mock AI** — add an Anthropic key to switch on live Claude reasoning.

---

## 1. The Problem

UAE distressed property deals are opaque, chaotic, and dominated by unserious buyers who waste sellers' time. There is no structured, AI-powered pipeline connecting distressed assets to qualified investors through a trust-verified process.

## 2. What DealFlow Does

**Step 1 — List.** A seller publishes a distress deal with pricing and urgency details.

**Step 2 — Score & Match.** Claude scores the deal against 5,000 historical Abu Dhabi transactions, generates a distress score, a quality score, red/green flags, and matches it to the 5 most aligned investors from a database of 200.

**Step 3 — Bid.** A credibility-gated bidding platform opens. Only buyers who have completed past deals can access premium slots. AI evaluates every bid for legitimacy and auto-rejects lowballers (and docks their credibility).

## 3. Feature List

- **Public off-plan distress marketplace** — anyone can view and access every deal (no gating to browse); off-plan attributes (developer, handover, payment plan, % paid) are first-class, with an off-plan/ready filter
- **WhatsApp communication per deal** — buyers/investors connect to the seller in a WhatsApp-style thread (`wa.me` deep links); a dedicated Messages inbox aggregates all threads
- **AI relationship management** — Claude reads each WhatsApp thread and produces a relationship health score, sentiment, engagement level, intent signals, risks, and the next best action
- 5-step onboarding walkthrough with role selection
- AI deal scoring using Claude against real transaction data
- AI investor matching using mandate alignment + relationship scores
- Credibility-gated **bidding**: Bronze / Silver / Gold / Platinum tiers (viewing stays fully open)
- AI bid-legitimacy evaluation with auto-rejection of lowball offers
- Mock blockchain deal trail with hash verification UI + confirmation animation
- Market analytics dashboard: price trends, asset volumes, distress-reason mix, district intelligence, investor leaderboard
- Investor directory with relationship scoring and mandate profiles

## 4. How AI Is Used

Three distinct AI functions, each backed by a deterministic mock so the demo never breaks:

1. **Deal Scoring** (`/api/score-deal`) — Claude analyzes a free-text deal description against structured district transaction data to produce a distress score, quality score, urgency tier, and specific green/red flags.
2. **Investor Matching** (`/api/match-investors`) — investors are pre-filtered by capital, sector and risk, then Claude ranks the top 20 and returns the best 5 with per-investor reasoning. More than simple filter logic.
3. **Bid Legitimacy** (`/api/bid-evaluate`) — Claude scores a bid's seriousness 0–100 from amount, conditions, and bidder history. Scores under 40 are auto-rejected and cost the bidder 15 credibility points.
4. **Relationship Management** (`/api/relationship-insight`) — Claude ingests the WhatsApp thread between a seller and a buyer/investor and returns a relationship health score, sentiment, engagement level, intent signals, risks, and a recommended next action — turning raw chat into CRM intelligence.

If `ANTHROPIC_API_KEY` is unset (or any call fails), each route transparently falls back to a deterministic rules engine in `lib/mock.ts` + `lib/scoring.ts`.

## 5. The Credibility System

Buyer access scales with track record (`lib/scoring.ts`):

| Tier | Score | Access |
|---|---|---|
| Bronze | 0–24 | View deals only — cannot bid |
| Silver | 25–49 | Bid on up to 2 open slots per deal |
| Gold | 50–74 | Bid on any open slot, early access |
| Platinum | 75–100 | Pre-public access, 1 reserved slot per deal |

Credibility is earned by completing deals (+8 each) and verifying identity, and lost through lowball/withdrawn bids (−15). This filters out unserious buyers before they reach sellers — the core trust problem.

## 6. Mock Blockchain

**Tracks:** deal-creation hash, bid-submission events, status transitions, accepted-offer record.
**Why:** an immutable audit trail for high-value UAE real-estate transactions.
**Implementation:** pure UI simulation — a realistic `0x…` hash plus a confirmation animation that walks each new deal through `unverified → verified → on_chain`.

## 7. Data Sources

All CSVs live in [`data/`](data/) (copied from the starter kit). Synthetic except where noted.

| File | Used for |
|---|---|
| `districts.csv` | 20-district spine; base price/sqm, yield, infra score, centroid (map + joins) |
| `sample_transactions.csv` | Price/sqm comparables, quarterly trends, asset-volume charts |
| `sample_investors.csv` | The 200 investor mandates that deals are matched against |
| `sample_communities.csv` | Service-demand / resident-experience inputs to the district **gap score** |
| `osm_amenities.csv` (**real** OSM) | Amenity supply per district feeding the gap score |
| `sample_listings.csv` | Comparable active-listing counts per district |
| `sample_parcels.csv` | Loaded server-side; available for land-intelligence extensions |

## 8. How To Run

```bash
npm install
# add keys (optional) to .env.local:
#   ANTHROPIC_API_KEY=your_key_here
#   NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
npm run dev
# open http://localhost:3000
```

The app loads with demo data pre-populated. Use the **role switcher** in the sidebar footer to toggle between Seller, Investor, and Buyer perspectives. It works with no keys at all — Claude calls fall back to mock AI and maps fall back to a coordinate placeholder.

---

## Tech

Next.js 14 (App Router, TS) · Tailwind CSS · Framer Motion · Recharts · Zustand (persisted) · Papa Parse (server-side CSV) · Mapbox GL (optional) · Anthropic SDK (optional) · Inter + Geist Mono.

## Project layout

```
app/            routes: dashboard, deals, deals/new, deals/[id], investors, buyers, analytics, api/*
components/     layout (Sidebar/TopBar/RoleSwitcher), deals, investors, analytics, onboarding, ui
lib/            types, scoring (pure math), data (CSV loaders), demo-data, store (zustand), mock, anthropic
data/           starter-kit CSVs
```

License: MIT — synthetic data only; `osm_amenities.csv` is © OpenStreetMap contributors (ODbL).
