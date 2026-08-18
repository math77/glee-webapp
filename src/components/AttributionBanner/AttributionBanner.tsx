interface AttributionBannerProps {
  className?: string;
}

// Static credits strip — no state or interactivity, so this stays a server component.
export default function AttributionBanner({ className = "" }: AttributionBannerProps) {
  return (
    <div className={`border-t border-[var(--border-hairline)] px-6 py-5 text-center ${className}`}>
      <p className="text-xs text-[var(--foreground-muted)]">
        GLEE was made by{" "}
        <a
          href="https://x.com/indimadotxyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--foreground)] underline underline-offset-2 transition-colors hover:text-[var(--accent)]"
        >
          Industrial Imagination
        </a>{" "}
        and{" "}
        <a
          href="https://x.com/promatheus_"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--foreground)] underline underline-offset-2 transition-colors hover:text-[var(--accent)]"
        >
          Theus
        </a>
        .
      </p>
    </div>
  );
}