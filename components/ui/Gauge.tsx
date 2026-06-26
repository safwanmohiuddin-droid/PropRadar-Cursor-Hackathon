"use client";

import { motion } from "framer-motion";

interface GaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
  sublabel?: string;
  from?: string;
  to?: string;
  trackColor?: string;
}

export default function Gauge({
  value,
  size = 120,
  label,
  sublabel,
  from = "#6366f1",
  to = "#10b981",
  trackColor = "#27272a",
}: GaugeProps) {
  const stroke = size < 90 ? 7 : 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);
  const gid = `g-${from}-${to}`.replace(/[^a-z0-9]/gi, "");

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold text-zinc-50">{Math.round(pct)}</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>}
        {sublabel && <span className="text-[10px] text-zinc-600">{sublabel}</span>}
      </div>
    </div>
  );
}
