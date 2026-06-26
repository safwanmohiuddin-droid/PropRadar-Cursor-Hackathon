import { cn } from "@/lib/ui";

export default function Kpi({
  label,
  value,
  sub,
  accent,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold text-zinc-50", mono && "font-mono", accent)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
