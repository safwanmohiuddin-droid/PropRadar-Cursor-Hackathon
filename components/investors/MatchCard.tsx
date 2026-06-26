"use client";

import { toast } from "sonner";
import type { InvestorMatch } from "@/lib/types";
import { investorTypeBadge, investorTypeLabel } from "@/lib/ui";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

const ACTION_STYLE: Record<string, string> = {
  "Contact immediately": "bg-indigo-600 text-white hover:bg-indigo-500",
  "Schedule call": "border border-line text-zinc-200 hover:bg-zinc-800",
  "Add to watchlist": "border border-line text-zinc-400 hover:bg-zinc-800",
};

export default function MatchCard({ match }: { match: InvestorMatch }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge className={investorTypeBadge(match.investor_type)}>
            {investorTypeLabel(match.investor_type)}
          </Badge>
          <p className="mt-1.5 font-mono text-xs text-zinc-400">
            {match.investor_id} · {match.capital_range_aed}
          </p>
        </div>
        <span className="font-mono text-lg font-semibold text-zinc-50">{match.match_score}</span>
      </div>

      <div className="mt-2">
        <ProgressBar value={match.match_score} height="h-1.5" barClassName="bg-gradient-to-r from-indigo-500 to-emerald-500" />
      </div>

      <ul className="mt-3 space-y-1">
        {match.match_reasons.slice(0, 2).map((r, i) => (
          <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
            <span className="text-emerald-500">✓</span>
            {r}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs italic text-zinc-500">{match.risk_alignment}</p>

      <button
        onClick={() => toast.success(`Notified ${match.investor_id} — ${match.recommended_action}.`)}
        className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          ACTION_STYLE[match.recommended_action] ?? ACTION_STYLE["Add to watchlist"]
        }`}
      >
        {match.recommended_action}
      </button>
    </div>
  );
}
