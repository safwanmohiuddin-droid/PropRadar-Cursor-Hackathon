"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import RoleSwitcher from "./RoleSwitcher";
import { cn } from "@/lib/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/deals", label: "Deals", icon: "◈" },
  { href: "/messages", label: "Messages", icon: "✉" },
  { href: "/investors", label: "Investors", icon: "◍" },
  { href: "/buyers", label: "Buyers", icon: "⦿" },
  { href: "/analytics", label: "Analytics", icon: "◔" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const role = useStore((s) => s.users[s.currentUserId]?.role ?? "seller");

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
            D
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-50">DealFlow</p>
            <p className="text-[10px] text-zinc-500">UAE Distressed Exchange</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                isActive(item.href)
                  ? "bg-indigo-600/15 text-indigo-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {role === "seller" && (
            <Link
              href="/deals/new"
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-indigo-600/40 bg-indigo-600/10 px-3 py-2 text-sm font-medium text-indigo-300 transition hover:bg-indigo-600/20"
            >
              + New Deal
            </Link>
          )}
        </nav>

        <div className="border-t border-line p-3">
          <RoleSwitcher />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-surface/95 backdrop-blur md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
              isActive(item.href) ? "text-indigo-300" : "text-zinc-500",
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
