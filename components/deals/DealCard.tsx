"use client";

import Link from "next/link";
import type { DistressDeal } from "@/lib/types";
import { formatAEDCompact, formatPct } from "@/lib/format";
import {
  assetIcon,
  cn,
  distressSeverity,
  STATUS_BADGE,
  STATUS_LABEL,
  urgencyColor,
} from "@/lib/ui";
import { daysUntil } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export default function DealCard({
  deal,
  compact = false,
}: {
  deal: DistressDeal;
  blurred?: boolean; // deprecated — marketplace is fully public
  compact?: boolean;
}) {
  const sev = distressSeverity(deal.distress_score);
  const filled = deal.bids.filter((b) => b.status === "pending" || b.status === "accepted").length;
  const days = daysUntil(deal.bid_deadline);
  const offPlan = deal.completion_status === "off_plan";

  return (
    <Link href={`/deals/${deal.id}`} className="block">
      <div className="card card-hover relative h-full p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{assetIcon(deal.asset_type)}</span>
            <Badge className={sev.badge}>{sev.label}</Badge>
          </div>
          <Badge className={STATUS_BADGE[deal.status]}>{STATUS_LABEL[deal.status]}</Badge>
        </div>

        <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-zinc-100">{deal.title}</h3>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge>{deal.district}</Badge>
          <Badge className="border-zinc-700 bg-zinc-800 capitalize text-zinc-400">{deal.asset_type}</Badge>
          {offPlan ? (
            <Badge className="border-indigo-700/50 bg-indigo-900/30 text-indigo-300">Off-plan</Badge>
          ) : (
            <Badge className="border-emerald-700/50 bg-emerald-900/30 text-emerald-300">Ready</Badge>
          )}
        </div>

        <p className="mt-3 font-mono text-2xl font-semibold text-zinc-50">
          {formatAEDCompact(deal.asking_price_aed)}
        </p>
        <p className="text-xs text-emerald-400">{formatPct(deal.discount_pct)} below market</p>

        {!compact && (
          <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
            <span>{deal.size_sqm} sqm</span>
            {deal.bedrooms != null && <span>· {deal.bedrooms} bd</span>}
            <span className={cn("ml-auto flex items-center gap-1", urgencyColor(days))}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {days} days left
            </span>
          </div>
        )}

        {!compact && offPlan && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
            {deal.developer && <span>🏗 {deal.developer}</span>}
            {deal.handover_date && <span>· Handover {new Date(deal.handover_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>}
            {deal.paid_pct != null && <span>· {deal.paid_pct}% paid</span>}
          </div>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {filled} of {deal.bid_slots} slots filled
            </span>
            <span className="font-mono text-zinc-400">Quality {deal.deal_quality_score}</span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: deal.bid_slots }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < filled ? "bg-indigo-500" : "bg-zinc-800",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
