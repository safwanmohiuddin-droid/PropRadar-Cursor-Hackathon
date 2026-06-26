"use client";

import type { DistressDeal } from "@/lib/types";
import { timeAgo } from "@/lib/format";

interface TimelineEvent {
  icon: string;
  label: string;
  actor?: string;
  at: string;
}

function buildEvents(deal: DistressDeal): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { icon: "📝", label: "Deal submitted", actor: "Seller", at: deal.created_at },
  ];
  const order: DistressDeal["status"][] = [
    "ai_scoring",
    "matched",
    "bidding",
    "under_offer",
    "closed",
  ];
  const reached = order.indexOf(deal.status);

  if (deal.distress_score && deal.status !== "ai_scoring") {
    events.push({ icon: "🤖", label: "AI scoring complete", actor: "Claude", at: deal.created_at });
  } else if (deal.status === "ai_scoring") {
    events.push({ icon: "🤖", label: "AI scoring in progress…", actor: "Claude", at: deal.created_at });
  }
  if (reached >= order.indexOf("matched") && deal.matched_investors.length) {
    events.push({
      icon: "💼",
      label: `${deal.matched_investors.length} investors matched`,
      actor: "Claude",
      at: deal.created_at,
    });
  }
  if (reached >= order.indexOf("bidding")) {
    events.push({ icon: "🔓", label: "Bidding opened", actor: "System", at: deal.created_at });
  }

  for (const bid of [...deal.bids].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  )) {
    const icon =
      bid.status === "accepted"
        ? "✅"
        : bid.status === "rejected"
          ? "⛔"
          : bid.status === "withdrawn"
            ? "↩️"
            : "💰";
    events.push({
      icon,
      label: `Bid ${bid.status}: ${(bid.amount_aed / 1e6).toFixed(2)}M`,
      actor: bid.bidder_name,
      at: bid.submitted_at,
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export default function DealTimeline({ deal }: { deal: DistressDeal }) {
  const events = buildEvents(deal);
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-200">Deal Timeline</h3>
      <ol className="relative space-y-4 border-l border-line pl-6">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-xs">
              {e.icon}
            </span>
            <p className="text-sm text-zinc-200">{e.label}</p>
            <p className="text-xs text-zinc-500">
              {e.actor} · {timeAgo(e.at)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
