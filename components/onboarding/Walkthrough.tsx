"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/ui";

const TIERS = ["Bronze", "Silver", "Gold", "Platinum"];

export default function Walkthrough({ force = false }: { force?: boolean }) {
  const isOnboarded = useStore((s) => s.isOnboarded);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setRole = useStore((s) => s.setRole);
  const role = useStore((s) => s.users[s.currentUserId]?.role ?? "seller");
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [closed, setClosed] = useState(false);

  const open = (force || !isOnboarded) && !closed;
  const total = 5;

  function finish(go?: string) {
    setOnboarded();
    setClosed(true);
    if (go) router.push(go);
  }

  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const steps = [
    // 1
    <div key="1" className="text-center">
      <h2 className="text-2xl font-bold text-zinc-50">The UAE&apos;s First AI-Powered Distressed Property Exchange</h2>
      <p className="mt-3 text-zinc-400">
        Sellers list urgent deals. AI scores them. Qualified investors bid. Serious buyers only.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        {[
          { icon: "🏷️", label: "Distress Deal" },
          { icon: "🤖", label: "AI Score" },
          { icon: "💼", label: "Matched Investor" },
        ].map((c, i) => (
          <div key={c.label} className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="card flex w-28 flex-col items-center gap-1 p-4"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs text-zinc-400">{c.label}</span>
            </motion.div>
            {i < 2 && <span className="text-indigo-500">→</span>}
          </div>
        ))}
      </div>
    </div>,
    // 2
    <div key="2" className="text-center">
      <h2 className="text-2xl font-bold text-zinc-50">Two sides to every deal</h2>
      <p className="mt-2 text-zinc-400">Pick how you want to explore the demo — you can switch anytime.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => {
            setRole("seller");
            next();
          }}
          className="card card-hover border-indigo-600/40 p-5 text-left"
        >
          <p className="text-lg font-semibold text-indigo-300">I&apos;m Selling</p>
          <p className="mt-2 text-sm text-zinc-400">
            List your distressed asset. AI scores it instantly. Get matched to serious investors.
          </p>
        </button>
        <button
          onClick={() => {
            setRole("investor");
            next();
          }}
          className="card card-hover border-amber-600/40 p-5 text-left"
        >
          <p className="text-lg font-semibold text-amber-300">I&apos;m Buying or Investing</p>
          <p className="mt-2 text-sm text-zinc-400">
            Browse AI-curated deals. Your credibility score determines your access.
          </p>
        </button>
      </div>
    </div>,
    // 3
    <div key="3" className="text-center">
      <h2 className="text-2xl font-bold text-zinc-50">How AI Scoring Works</h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
        {["Deal Submitted", "Claude Analyzes vs Market Data", "Distress + Quality Score", "Investor Match List"].map(
          (s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="rounded-lg border border-line bg-surface px-3 py-2">{s}</span>
              {i < 3 && <span className="text-indigo-500">→</span>}
            </div>
          ),
        )}
      </div>
      <div className="card mx-auto mt-6 max-w-xs p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-200">Al Reem Villa</span>
          <span className="rounded-full border border-amber-700/50 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-300">
            Distress 74
          </span>
        </div>
        <p className="mt-2 font-mono text-lg text-zinc-50">AED 2,800,000</p>
        <p className="text-xs text-emerald-400">17.6% below market</p>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Every deal is evaluated against 5,000 historical transactions and 200 active investors in Abu Dhabi.
      </p>
    </div>,
    // 4
    <div key="4" className="text-center">
      <h2 className="text-2xl font-bold text-zinc-50">The Credibility System</h2>
      <div className="mt-6 flex items-center justify-center gap-2">
        {TIERS.map((t, i) => (
          <div key={t} className="flex items-center gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.12 }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                i === 0 && "border-amber-900/50 bg-amber-950/40 text-amber-500",
                i === 1 && "border-zinc-600 bg-zinc-700/30 text-zinc-300",
                i === 2 && "border-yellow-700/50 bg-yellow-900/30 text-yellow-400",
                i === 3 && "border-indigo-700/50 bg-indigo-900/30 text-indigo-300",
              )}
            >
              {t}
            </motion.span>
            {i < 3 && <span className="text-zinc-600">→</span>}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: "61%" }}
          transition={{ duration: 1.2 }}
        />
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Your access to deals scales with your track record. Complete deals to earn slots. Lowball or withdraw and you
        lose access.
      </p>
    </div>,
    // 5
    <div key="5" className="text-center">
      <h2 className="text-2xl font-bold text-zinc-50">Ready. Let&apos;s start.</h2>
      <p className="mt-3 text-zinc-400">
        {role === "seller"
          ? "Submit your first distressed deal and watch the AI score it live."
          : "Browse AI-curated live deals matched to your mandate."}
      </p>
      <button
        onClick={() => finish(role === "seller" ? "/deals/new" : "/deals")}
        className="btn-primary mt-8 px-6 py-3 text-base"
      >
        {role === "seller" ? "Submit Your First Deal →" : "Browse Live Deals →"}
      </button>
    </div>,
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            onClick={() => finish()}
            className="absolute right-5 top-5 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Skip →
          </button>

          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="card p-8"
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={back}
                disabled={step === 0}
                className="btn-ghost text-sm disabled:opacity-0"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: total }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === step ? "w-6 bg-indigo-500" : "w-2 bg-zinc-700",
                    )}
                  />
                ))}
              </div>

              {step < total - 1 ? (
                <button onClick={next} className="btn-primary text-sm">
                  Next →
                </button>
              ) : (
                <span className="w-16" />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
