"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../Toast/ToastProvider";

function formatRelativeTime(timestamp: number) {
  const diffSec = Math.round((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay}d ago`;
}

function trimAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// The persistent counterpart to the toast viewport — everything that ever fired a toast this
// session lives here too, so missing the 5-second notification isn't the same as missing the event.
export default function ActivityLog() {
  const { history, clearHistory } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Activity"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {history.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 font-[family-name:var(--font-geist-mono)] text-[9px] text-[var(--background)]">
            {history.length > 9 ? "9+" : history.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="studio-panel absolute right-0 z-[71] mt-3 max-h-96 w-80 overflow-y-auto p-2"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="eyebrow-quiet">Activity</p>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                    Clear
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-[var(--foreground-muted)]">Nothing yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {history.map((entry) => (
                    <li key={entry.id} className="border-t border-[var(--border-hairline)] px-2 py-2.5 first:border-t-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[var(--foreground)]">{entry.title}</p>
                        <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--foreground-muted)]">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                      {entry.address && (
                        <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--foreground-muted)]">
                          {trimAddress(entry.address)}
                        </p>
                      )}
                      {entry.description && <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{entry.description}</p>}
                      {entry.href && (
                        <a href={entry.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[var(--accent)] underline underline-offset-2">
                          {entry.hrefLabel ?? "View details"}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}