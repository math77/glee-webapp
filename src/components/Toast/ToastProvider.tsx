"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  href?: string;
  hrefLabel?: string;
  /** how long the toast itself stays on screen, in ms — the history entry is permanent regardless */
  duration?: number;
}

export interface ActivityEntry {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  href?: string;
  hrefLabel?: string;
  /** the wallet connected when this event happened — undefined if there wasn't one */
  address?: string;
  createdAt: number;
}

interface ToastContextValue {
  pushToast: (input: ToastInput) => void;
  history: ActivityEntry[];
  clearHistory: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_HISTORY = 30;
const DEFAULT_DURATION = 5000;

// History is namespaced per wallet, so switching accounts on the same browser shows that
// account's own activity instead of whoever was connected before.
function getStorageKey(address?: string) {
  return address ? `glee:activity:${address.toLowerCase()}` : null;
}

function loadHistory(address?: string): ActivityEntry[] {
  const key = getStorageKey(address);
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Global toast + activity log. Toasts are transient (auto-dismiss, live in a fixed viewport
 * above everything else including modals); the history behind them is permanent per-wallet
 * and persisted to localStorage, so an event isn't lost just because the person tabbed away,
 * a modal auto-closed, or they reload the page — as long as it's the same connected wallet.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [toasts, setToasts] = useState<ActivityEntry[]>([]);
  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Re-hydrate whenever the connected wallet changes (including disconnect) — this also
  // covers the initial mount, so server-rendered (empty) and first client render still match.
  useEffect(() => {
    setHistory(loadHistory(address));
  }, [address]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timeout) => clearTimeout(timeout));
      activeTimers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeout = timers.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((input: ToastInput) => {
    const entry: ActivityEntry = {
      id: createId(),
      title: input.title,
      description: input.description,
      variant: input.variant ?? "info",
      href: input.href,
      hrefLabel: input.hrefLabel,
      address,
      createdAt: Date.now(),
    };

    setToasts((current) => [...current, entry]);
    setHistory((current) => {
      const next = [entry, ...current].slice(0, MAX_HISTORY);
      const key = getStorageKey(address);
      if (key) {
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // private browsing / storage disabled — the toast itself still shows either way
        }
      }
      return next;
    });

    const timeout = setTimeout(() => dismiss(entry.id), input.duration ?? DEFAULT_DURATION);
    timers.current.set(entry.id, timeout);
  }, [dismiss, address]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    const key = getStorageKey(address);
    if (key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }, [address]);

  return (
    <ToastContext.Provider value={{ pushToast, history, clearHistory }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto w-full max-w-xs overflow-hidden border border-[var(--border-hairline-strong)] bg-[var(--background-2)]"
              style={{
                borderLeftWidth: 2,
                borderLeftColor: toast.variant === "error" ? "#c17a72" : toast.variant === "success" ? "var(--accent)" : "var(--border-hairline-strong)",
              }}
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--foreground)]">{toast.title}</p>
                  {toast.description && <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">{toast.description}</p>}
                  {toast.href && (
                    <a href={toast.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-[var(--accent)] underline underline-offset-2">
                      {toast.hrefLabel ?? "View details"}
                    </a>
                  )}
                </div>
                <button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="shrink-0 text-lg leading-none text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                  x
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}