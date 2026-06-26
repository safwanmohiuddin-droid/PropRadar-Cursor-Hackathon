import { cn } from "@/lib/ui";

export default function Badge({
  children,
  className,
  mono,
}: {
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        mono && "font-mono",
        className ?? "border-zinc-700 bg-zinc-800 text-zinc-300",
      )}
    >
      {children}
    </span>
  );
}
