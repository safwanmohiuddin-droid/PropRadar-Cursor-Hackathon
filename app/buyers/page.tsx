"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { TIER_RULES, tierForScore } from "@/lib/scoring";
import { TIER_BADGE } from "@/lib/ui";
import Badge from "@/components/ui/Badge";
import Gauge from "@/components/ui/Gauge";
import { StaggerGrid, StaggerItem } from "@/components/ui/Motion";

interface BuyerRow {
  id: string;
  name: string;
  tier: keyof typeof TIER_BADGE;
  credibility: number;
  bids: number;
  won: number;
}

export default function BuyersPage() {
  const users = useStore((s) => s.users);
  const deals = useStore((s) => s.deals);

  const buyers = useMemo<BuyerRow[]>(() => {
    const map = new Map<string, BuyerRow>();
    // Seed from known users (investors/buyers).
    Object.values(users)
      .filter((u) => u.role !== "seller")
      .forEach((u) =>
        map.set(u.id, {
          id: u.id,
          name: u.name,
          tier: u.tier,
          credibility: u.credibility_score,
          bids: 0,
          won: 0,
        }),
      );
    // Aggregate bidders found across deals.
    for (const d of deals) {
      for (const b of d.bids) {
        const cur =
          map.get(b.bidder_id) ??
          ({
            id: b.bidder_id,
            name: b.bidder_name,
            tier: (b.bidder_tier as keyof typeof TIER_BADGE) ?? tierForScore(b.bidder_credibility),
            credibility: b.bidder_credibility,
            bids: 0,
            won: 0,
          } as BuyerRow);
        cur.bids += 1;
        if (b.status === "accepted") cur.won += 1;
        map.set(b.bidder_id, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.credibility - a.credibility);
  }, [users, deals]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">Buyers & Credibility</h1>
        <p className="text-sm text-zinc-500">
          Access scales with track record. Tiers gate who can bid on which slots.
        </p>
      </div>

      {/* Tier legend */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(TIER_RULES) as (keyof typeof TIER_RULES)[]).map((t) => (
          <div key={t} className="card p-4">
            <Badge className={TIER_BADGE[t]}>
              <span className="capitalize">{t}</span>
            </Badge>
            <p className="mt-2 text-xs text-zinc-500">{TIER_RULES[t].description}</p>
          </div>
        ))}
      </div>

      <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {buyers.map((b) => (
          <StaggerItem key={b.id}>
            <Link href={`/buyers/${b.id}`} className="block">
              <div className="card card-hover flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{b.name}</p>
                  <p className="font-mono text-[11px] text-zinc-600">{b.id}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={TIER_BADGE[b.tier]}>
                      <span className="capitalize">{b.tier}</span>
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {b.bids} bids · {b.won} won
                    </span>
                  </div>
                </div>
                <Gauge value={b.credibility} size={64} label="Cred." from="#6366f1" to="#10b981" />
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}
