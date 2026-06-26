"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/ui";

const ROLES: { id: UserRole; label: string; icon: string }[] = [
  { id: "seller", label: "Seller", icon: "🏷️" },
  { id: "investor", label: "Investor", icon: "💼" },
  { id: "buyer", label: "Buyer", icon: "🤝" },
];

export default function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const setRole = useStore((s) => s.setRole);
  const currentUserId = useStore((s) => s.currentUserId);
  const users = useStore((s) => s.users);
  const user = users[currentUserId];
  const role = user?.role ?? "seller";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-2 text-left transition hover:border-zinc-600"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {user?.avatar_initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{user?.name}</p>
          <p className="text-xs capitalize text-zinc-500">{role} · demo</p>
        </div>
        <span className="text-zinc-600">⇅</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full z-20 mb-2 w-full overflow-hidden rounded-lg border border-line bg-card shadow-xl">
            <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-600">Switch demo role</p>
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-zinc-800",
                  r.id === role ? "text-indigo-300" : "text-zinc-300",
                )}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
                {r.id === role && <span className="ml-auto text-xs text-indigo-400">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
