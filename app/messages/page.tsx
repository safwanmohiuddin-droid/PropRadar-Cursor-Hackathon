"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import WhatsAppThread from "@/components/messaging/WhatsAppThread";
import RelationshipPanel from "@/components/messaging/RelationshipPanel";
import EmptyState from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/ui";

export default function MessagesPage() {
  const conversations = useStore((s) => s.conversations);
  const deals = useStore((s) => s.deals);
  const user = useStore((s) => s.users[s.currentUserId]);

  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const activeDeal = active ? deals.find((d) => d.id === active.deal_id) : undefined;

  if (!conversations.length) {
    return (
      <EmptyState
        icon="💬"
        title="No conversations yet"
        description="When buyers or investors connect on WhatsApp about a deal, threads appear here and feed the AI relationship manager."
        ctaLabel="Browse deals"
        ctaHref="/deals"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">Messages</h1>
        <p className="text-sm text-zinc-500">
          WhatsApp conversations with buyers and investors — analysed by AI for relationship management.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversation list */}
        <div className="space-y-2 lg:col-span-1">
          {conversations.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "card w-full p-4 text-left transition",
                  active?.id === c.id ? "border-emerald-600/50" : "card-hover",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-100">{c.participant_name}</span>
                  <span className="text-[10px] text-zinc-500">{last ? timeAgo(last.timestamp) : ""}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{c.deal_title}</p>
                {last && <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{last.text}</p>}
              </button>
            );
          })}
        </div>

        {/* Active thread + relationship */}
        <div className="space-y-4 lg:col-span-2">
          {active && user && (
            <>
              <div className="flex items-center justify-between">
                <Link href={`/deals/${active.deal_id}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                  View deal: {active.deal_title} →
                </Link>
              </div>
              <WhatsAppThread conversation={active} currentUser={user} />
              <RelationshipPanel conversation={active} deal={activeDeal} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
