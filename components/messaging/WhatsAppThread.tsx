"use client";

import { useState } from "react";
import type { AppUser, ChatRole, Conversation, WhatsAppMessage } from "@/lib/types";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/ui";

export default function WhatsAppThread({
  conversation,
  currentUser,
}: {
  conversation: Conversation;
  currentUser: AppUser;
}) {
  const sendMessage = useStore((s) => s.sendMessage);
  const [text, setText] = useState("");

  const waNumber = conversation.participant_phone.replace(/[^\d]/g, "");
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    `Hi ${conversation.participant_name}, regarding ${conversation.deal_title} on DealFlow`,
  )}`;

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: WhatsAppMessage = {
      id: `M-${Math.random().toString(36).slice(2, 8)}`,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.role as ChatRole,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    sendMessage(conversation.id, msg);
    setText("");
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400">
            {conversation.participant_name.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">{conversation.participant_name}</p>
            <p className="font-mono text-[11px] text-zinc-500">
              {conversation.participant_phone} · <span className="capitalize">{conversation.participant_role}</span>
            </p>
          </div>
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-emerald-700/50 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300 transition hover:bg-emerald-900/40"
        >
          <span>🟢</span> Open in WhatsApp
        </a>
      </div>

      {/* Messages */}
      <div
        className="flex-1 space-y-2 overflow-y-auto p-4"
        style={{
          minHeight: 220,
          maxHeight: 360,
          backgroundImage: "radial-gradient(#18181b 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {conversation.messages.map((m) => {
          const mine = m.sender_id === currentUser.id;
          const fromSeller = m.sender_role === "seller";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                  mine
                    ? "rounded-br-sm bg-emerald-700/30 text-emerald-50"
                    : fromSeller
                      ? "rounded-bl-sm bg-zinc-800 text-zinc-200"
                      : "rounded-bl-sm bg-indigo-900/30 text-indigo-100",
                )}
              >
                {!mine && <p className="mb-0.5 text-[10px] font-medium text-zinc-400">{m.sender_name}</p>}
                <p className="leading-snug">{m.text}</p>
                <p className="mt-1 text-right text-[10px] text-zinc-500">{timeAgo(m.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="input flex-1"
        />
        <button onClick={send} className="btn-primary px-4">
          Send
        </button>
      </div>
      <p className="border-t border-line bg-surface px-3 py-1.5 text-[10px] text-zinc-600">
        🔒 Messages are analysed by AI to power relationship management — never shared externally.
      </p>
    </div>
  );
}
