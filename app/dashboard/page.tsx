"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatAED, formatAEDCompact, timeAgo } from "@/lib/format";
import { nextTierProgress } from "@/lib/scoring";
import { cn, TIER_BADGE } from "@/lib/ui";
import DealCard from "@/components/deals/DealCard";
import MatchCard from "@/components/investors/MatchCard";
import Kpi from "@/components/ui/Kpi";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import EmptyState from "@/components/ui/EmptyState";
import { FadeUp, StaggerGrid, StaggerItem } from "@/components/ui/Motion";

export default function DashboardPage() {
  const user = useStore((s) => s.users[s.currentUserId]);
  if (!user) return null;

  if (user.role === "seller") return <SellerDashboard />;
  return <BuyerDashboard />;
}

function SellerDashboard() {
  const deals = useStore((s) => s.deals);
  const user = useStore((s) => s.users[s.currentUserId]);
  const myDeals = deals.filter((d) => d.seller_id === user.id);
  const totalViews = myDeals.reduce((a, d) => a + d.views, 0);
  const totalBids = myDeals.reduce((a, d) => a + d.bids.length, 0);
  const allMatches = myDeals.flatMap((d) => d.matched_investors);
  const avgMatch = allMatches.length
    ? Math.round(allMatches.reduce((a, m) => a + m.match_score, 0) / allMatches.length)
    : 0;
  const latestMatched = myDeals.find((d) => d.matched_investors.length);

  const activity = myDeals
    .flatMap((d) => d.bids.map((b) => ({ deal: d.title, ...b })))
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StaggerItem><Kpi label="Active Deals" value={myDeals.length} /></StaggerItem>
        <StaggerItem><Kpi label="Total Views" value={totalViews} /></StaggerItem>
        <StaggerItem><Kpi label="Bids Received" value={totalBids} /></StaggerItem>
        <StaggerItem><Kpi label="Avg Match Score" value={avgMatch} accent="text-indigo-300" /></StaggerItem>
      </StaggerGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100">Your Active Deals</h2>
            <Link href="/deals/new" className="text-xs text-indigo-400 hover:text-indigo-300">
              + New deal
            </Link>
          </div>
          {myDeals.length ? (
            <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {myDeals.map((d) => (
                <StaggerItem key={d.id}><DealCard deal={d} /></StaggerItem>
              ))}
            </StaggerGrid>
          ) : (
            <EmptyState
              icon="🏷️"
              title="No deals yet"
              description="List your first distressed asset and let the AI score it."
              ctaLabel="Submit a Deal"
              ctaHref="/deals/new"
            />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-100">Top Matched Investors</h2>
          {latestMatched ? (
            <div className="space-y-3">
              {latestMatched.matched_investors.slice(0, 3).map((m) => (
                <MatchCard key={m.investor_id} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState icon="💼" title="No matches yet" description="Investor matches appear once a deal is scored." />
          )}

          <FadeUp>
            <Link
              href="/deals/new"
              className="card card-hover flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">Submit New Deal</p>
                <p className="text-xs text-zinc-500">Get an AI score in seconds</p>
              </div>
              <span className="text-xl text-indigo-400">→</span>
            </Link>
          </FadeUp>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-100">Activity</h2>
        {activity.length ? (
          <div className="card divide-y divide-line">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-300">
                  New bid on <span className="text-zinc-100">{a.deal}</span> · {formatAED(a.amount_aed)}
                </span>
                <span className="text-xs text-zinc-500">{timeAgo(a.submitted_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📡" title="No recent activity" description="Bids and status changes will show up here." />
        )}
      </div>
    </div>
  );
}

function BuyerDashboard() {
  const deals = useStore((s) => s.deals);
  const user = useStore((s) => s.users[s.currentUserId]);
  const matched = deals.filter((d) => ["matched", "bidding", "under_offer"].includes(d.status));
  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek = deals.filter((d) => new Date(d.created_at).getTime() >= weekAgo);
  const myBids = deals.flatMap((d) =>
    d.bids.filter((b) => b.bidder_id === user.id).map((b) => ({ deal: d.title, ...b })),
  );
  const activeBids = myBids.filter((b) => b.status === "pending").length;
  const won = myBids.filter((b) => b.status === "accepted").length;
  const prog = nextTierProgress(user.credibility_score);

  return (
    <div className="space-y-6">
      <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StaggerItem><Kpi label="Credibility Score" value={user.credibility_score} accent="text-indigo-300" /></StaggerItem>
        <StaggerItem>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Tier</p>
            <div className="mt-2"><Badge className={TIER_BADGE[user.tier]}><span className="capitalize text-base">{user.tier}</span></Badge></div>
          </div>
        </StaggerItem>
        <StaggerItem><Kpi label="Active Bids" value={activeBids} /></StaggerItem>
        <StaggerItem><Kpi label="Deals Won" value={won} accent="text-emerald-400" /></StaggerItem>
      </StaggerGrid>

      <div className="card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300">Credibility progress</span>
          <span className="text-zinc-500">
            {prog.next ? `${prog.pointsNeeded} pts to ${prog.next}` : "Top tier reached"}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={user.credibility_score - prog.floor}
            max={prog.ceil - prog.floor}
            barClassName="bg-gradient-to-r from-indigo-500 to-emerald-500"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-100">Deals Matched To You</h2>
        {matched.length ? (
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matched.map((d) => (
              <StaggerItem key={d.id}><DealCard deal={d} /></StaggerItem>
            ))}
          </StaggerGrid>
        ) : (
          <EmptyState icon="🔍" title="No matched deals yet" description="Deals matching your mandate will appear here." ctaLabel="Browse all deals" ctaHref="/deals" />
        )}
      </div>

      {newThisWeek.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-zinc-100">New This Week</h2>
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newThisWeek.map((d) => (
              <StaggerItem key={d.id}><DealCard deal={d} compact /></StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-100">Your Bid History</h2>
        {myBids.length ? (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Deal</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Legitimacy</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {myBids.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-zinc-300">{b.deal}</td>
                    <td className="px-4 py-3 font-mono text-zinc-200">{formatAEDCompact(b.amount_aed)}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{b.ai_legitimacy_score}</td>
                    <td className="px-4 py-3">
                      <span className={cn("capitalize", b.status === "accepted" ? "text-emerald-400" : b.status === "rejected" ? "text-red-400" : "text-zinc-400")}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📋" title="No bids yet" description="Place a bid on a deal to start building your track record." ctaLabel="Browse deals" ctaHref="/deals" />
        )}
      </div>
    </div>
  );
}
