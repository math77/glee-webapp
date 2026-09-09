"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MintShareModalProps {
  quantity: number;
  onClose: () => void;
}

export default function MintShareModal({ quantity, onClose }: MintShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href.split("#")[0];
  }, []);

  const shareText = `I just minted ${quantity} GLEE canvas${quantity > 1 ? "es" : ""} 🎨 on GLEE — an fully onchain community-crafted experimental artwork on Robinhood Chain.`;
  const xUrl = useMemo(() => {
    if (!shareUrl) return "https://x.com/intent/post";
    return `https://x.com/intent/post?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
  }, [shareText, shareUrl]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mint-share-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="studio-panel w-full max-w-md p-6 sm:p-7"
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="eyebrow-quiet">Mint complete</p>
              <h2 id="mint-share-title" className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl italic text-[var(--foreground)]">
                Your canvas{quantity > 1 ? "es are" : " is"} in the garden.
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-lg leading-none text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
              aria-label="Close share dialog"
            >
              ×
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[var(--foreground-muted)]">
            You just minted <span className="text-[var(--foreground)]">{quantity} GLEE canvas{quantity > 1 ? "es" : ""}</span>. Share the moment with the garden.
          </p>

          <div className="mt-6 border border-[var(--border-hairline-strong)] bg-[var(--background-2)]/60 p-3">
            <p className="break-all font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed text-[var(--foreground-muted)]">
              {shareUrl}
            </p>
            <button
              onClick={handleCopy}
              className="quiet-button quiet-button--filled mt-3 w-full py-2.5 text-sm"
            >
              {copied ? "Copied" : "Copy share URL"}
            </button>
          </div>

          <motion.a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="quiet-button mt-3 flex w-full items-center justify-center py-3 text-sm"
          >
            Share on X ↗
          </motion.a>

          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-xs text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
