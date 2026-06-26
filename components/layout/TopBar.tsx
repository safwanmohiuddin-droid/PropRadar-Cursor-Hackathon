"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import Badge from "@/components/ui/Badge";
import { TIER_BADGE } from "@/lib/ui";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function TopBar() {
  const user = useStore((s) => s.users[s.currentUserId]);
  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-background/80 px-5 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-zinc-50">
          {greeting()}, {user.name.split(" ")[0]}
        </h1>
        <p className="text-xs capitalize text-zinc-500">
          {user.role} workspace · {user.deals_completed} deals completed
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={TIER_BADGE[user.tier]}>
          <span className="capitalize">{user.tier}</span>
        </Badge>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
          <span className="text-[10px] uppercase text-zinc-500">Credibility</span>
          <span className="font-mono text-sm font-semibold text-zinc-100">{user.credibility_score}</span>
        </div>
        <Link
          href="/deals/new"
          className="hidden rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 sm:block"
        >
          + Submit Deal
        </Link>
      </div>
    </header>
  );
}
