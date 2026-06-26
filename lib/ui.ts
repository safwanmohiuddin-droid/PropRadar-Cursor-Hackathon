import type { DealStatus, Tier } from "./types";

/** Tailwind class bundles for colored pill badges. */
export const TIER_BADGE: Record<Tier, string> = {
  bronze: "border-amber-900/50 bg-amber-950/40 text-amber-500",
  silver: "border-zinc-600 bg-zinc-700/30 text-zinc-300",
  gold: "border-yellow-700/50 bg-yellow-900/30 text-yellow-400",
  platinum: "border-indigo-700/50 bg-indigo-900/30 text-indigo-300",
};

export const STATUS_BADGE: Record<DealStatus, string> = {
  pending_review: "border-zinc-700 bg-zinc-800 text-zinc-400",
  ai_scoring: "border-indigo-700/50 bg-indigo-900/30 text-indigo-300",
  matched: "border-sky-700/50 bg-sky-900/30 text-sky-300",
  bidding: "border-amber-700/50 bg-amber-900/30 text-amber-300",
  under_offer: "border-orange-700/50 bg-orange-900/30 text-orange-300",
  closed: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  withdrawn: "border-red-800/50 bg-red-950/40 text-red-400",
};

export const STATUS_LABEL: Record<DealStatus, string> = {
  pending_review: "Pending Review",
  ai_scoring: "AI Scoring",
  matched: "Matched",
  bidding: "Bidding Open",
  under_offer: "Under Offer",
  closed: "Closed",
  withdrawn: "Withdrawn",
};

export const INVESTOR_TYPE_BADGE: Record<string, string> = {
  sovereign_fund: "border-indigo-700/50 bg-indigo-900/30 text-indigo-300",
  family_office: "border-amber-700/50 bg-amber-900/30 text-amber-300",
  developer: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  hnwi: "border-violet-700/50 bg-violet-900/30 text-violet-300",
  reit: "border-blue-700/50 bg-blue-900/30 text-blue-300",
  private_equity: "border-orange-700/50 bg-orange-900/30 text-orange-300",
  institutional: "border-zinc-600 bg-zinc-700/30 text-zinc-300",
};

export function investorTypeBadge(type: string): string {
  return INVESTOR_TYPE_BADGE[type] ?? "border-zinc-700 bg-zinc-800 text-zinc-300";
}

export function investorTypeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Distress-score severity → label + classes. */
export function distressSeverity(score: number): {
  label: string;
  badge: string;
  ring: string;
} {
  if (score >= 80)
    return { label: "Critical", badge: "border-red-700/50 bg-red-950/50 text-red-400", ring: "#ef4444" };
  if (score >= 60)
    return { label: "High", badge: "border-amber-700/50 bg-amber-950/40 text-amber-400", ring: "#f59e0b" };
  return { label: "Moderate", badge: "border-orange-700/50 bg-orange-950/40 text-orange-400", ring: "#f97316" };
}

export function urgencyColor(days: number): string {
  if (days < 7) return "text-red-400";
  if (days < 21) return "text-amber-400";
  return "text-zinc-400";
}

export const ASSET_ICON: Record<string, string> = {
  villa: "🏡",
  apartment: "🏢",
  townhouse: "🏘️",
  penthouse: "🌆",
  plot: "🗺️",
  land: "🗺️",
  commercial: "🏬",
  office: "🏢",
  retail: "🛍️",
  hotel: "🏨",
  warehouse: "🏭",
};

export function assetIcon(type: string): string {
  return ASSET_ICON[type?.toLowerCase()] ?? "📦";
}

export const DISTRESS_REASONS = [
  { id: "relocation", label: "Relocation", icon: "✈️" },
  { id: "debt", label: "Debt", icon: "💳" },
  { id: "probate", label: "Probate", icon: "📜" },
  { id: "divorce", label: "Divorce", icon: "💔" },
  { id: "foreclosure", label: "Foreclosure", icon: "⚖️" },
  { id: "liquidation", label: "Liquidation", icon: "📉" },
];

export const ASSET_TYPES = [
  { id: "villa", label: "Villa", icon: "🏡" },
  { id: "apartment", label: "Apartment", icon: "🏢" },
  { id: "plot", label: "Plot", icon: "🗺️" },
  { id: "commercial", label: "Commercial", icon: "🏬" },
  { id: "warehouse", label: "Warehouse", icon: "🏭" },
  { id: "townhouse", label: "Townhouse", icon: "🏘️" },
];

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
