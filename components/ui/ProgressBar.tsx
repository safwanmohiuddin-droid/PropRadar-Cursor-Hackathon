"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/ui";

export default function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  height = "h-2",
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  height?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-zinc-800", height, className)}>
      <motion.div
        className={cn("h-full rounded-full bg-indigo-500", barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}
