import Link from "next/link";

export default function EmptyState({
  icon = "📭",
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
}: {
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-5">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && !ctaHref && (
        <button onClick={onCta} className="btn-primary mt-5">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
