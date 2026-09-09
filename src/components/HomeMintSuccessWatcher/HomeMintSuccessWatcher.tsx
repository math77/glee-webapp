"use client";

import { useEffect, useState } from "react";
import MintShareModal from "../MintShareModal/MintShareModal";

function readMintQuantity(): number {
  const increaseButton = document.querySelector<HTMLButtonElement>('button[aria-label="Increase quantity"]');
  const quantityText = increaseButton?.parentElement?.querySelector("div.w-10")?.textContent?.trim();
  const quantity = Number(quantityText);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

export default function HomeMintSuccessWatcher() {
  const [mounted, setMounted] = useState(false);
  const [shareQuantity, setShareQuantity] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (window.location.pathname !== "/") return;

    let handled = false;

    const checkForSuccess = () => {
      if (window.location.pathname !== "/") {
        handled = false;
        return;
      }

      const mintButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent?.trim() === "Minted");

      if (mintButton && !handled) {
        handled = true;
        setShareQuantity(readMintQuantity());
      } else if (!mintButton) {
        handled = false;
      }
    };

    checkForSuccess();

    const observer = new MutationObserver(checkForSuccess);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  if (!mounted || shareQuantity === null) return null;

  return <MintShareModal quantity={shareQuantity} onClose={() => setShareQuantity(null)} />;
}
