"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "wagmi";
import { useToast } from "../Toast/ToastProvider";

const STORAGE_KEY = "glee_referral_code";
const TX_STORAGE_KEY = "glee_last_mint_tx";

type Profile = { code: string; points: number };

function ReferralPanel({ profile }: { profile: Profile | null }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    const value = (fromUrl || saved || "").toUpperCase();
    if (fromUrl && /^[A-Z2-9]{6}$/.test(value)) localStorage.setItem(STORAGE_KEY, value);
    setInput(value);
  }, []);

  const copyOwnCode = async () => {
    if (!profile?.code) return;
    await navigator.clipboard.writeText(profile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const applyCode = async () => {
    const code = input.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) {
      setStatus("Enter a 6-character code.");
      return;
    }
    const response = await fetch(`/api/referrals?code=${encodeURIComponent(code)}`);
    const data = await response.json();
    if (!data.valid) {
      setStatus("That referral code isn't active.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, code);
    setInput(code);
    setStatus("Referral code saved for your next mint.");
  };

  return (
    <div className="mt-5 border-t border-[var(--border-hairline)] pt-4">
      {profile ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-quiet">Your referral code</p>
            <button onClick={copyOwnCode} className="mt-1 font-[family-name:var(--font-geist-mono)] text-sm tracking-[0.16em] text-[var(--foreground)]">
              {profile.code}
            </button>
          </div>
          <button onClick={copyOwnCode} className="quiet-button px-3 py-2 text-xs">{copied ? "Copied" : "Copy"}</button>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">Mint a canvas to unlock your own referral code.</p>
      )}

      <label className="studio-label mt-4 block">Use a referral code</label>
      <div className="mt-2 flex gap-2">
        <input value={input} maxLength={6} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="ABC123" className="studio-input min-w-0 flex-1 font-[family-name:var(--font-geist-mono)] tracking-[0.12em]" />
        <button onClick={applyCode} className="quiet-button px-3 text-xs">Apply</button>
      </div>
      {status && <p className="mt-2 text-xs text-[var(--foreground-muted)]">{status}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">Mint with someone&apos;s code and both wallets earn points. Whitelist mints earn a little more.</p>
      {profile && <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--accent)]">{profile.points.toLocaleString()} points</p>}
    </div>
  );
}

export default function ReferralSystem() {
  const { address } = useAccount();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const { pushToast } = useToast();
  const interceptedProvider = useRef<{ request: Function } | null>(null);
  const originalRequest = useRef<Function | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/referrals?wallet=${address}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data.exists && data.code) setProfile({ code: data.code, points: Number(data.points ?? 0) }); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [address]);

  useEffect(() => {
    if (!mounted) return;
    const ethereum = (window as unknown as { ethereum?: { request: Function } }).ethereum;
    if (!ethereum?.request) return;
    interceptedProvider.current = ethereum;
    originalRequest.current = ethereum.request.bind(ethereum);
    ethereum.request = async (args: { method: string; params?: unknown[] }) => {
      const result = await originalRequest.current!(args);
      if (args.method === "eth_sendTransaction" && typeof result === "string" && /^0x[a-fA-F0-9]{64}$/.test(result)) {
        sessionStorage.setItem(TX_STORAGE_KEY, result);
      }
      return result;
    };
    return () => {
      if (interceptedProvider.current && originalRequest.current) interceptedProvider.current.request = originalRequest.current;
      interceptedProvider.current = null;
      originalRequest.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    if (!address || !mounted) return;
    const findHost = () => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((item) => /^Mint /.test(item.textContent?.trim() ?? ""));
      const panel = button?.closest(".studio-panel") as HTMLElement | null;
      if (!panel) return;
      let node = panel.querySelector<HTMLElement>("[data-glee-referral-host]");
      if (!node) {
        node = document.createElement("div");
        node.dataset.gleeReferralHost = "true";
        panel.appendChild(node);
      }
      setHost(node);
    };
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [address, mounted]);

  useEffect(() => {
    if (!address || !mounted) return;
    let handled = false;
    const checkMint = async () => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent?.trim() === "Minted");
      if (!button) {
        handled = false;
        return;
      }
      if (handled) return;
      handled = true;
      const tx = sessionStorage.getItem(TX_STORAGE_KEY);
      if (!tx) return;
      const referralCode = localStorage.getItem(STORAGE_KEY);
      const response = await fetch("/api/referrals/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, referralCode: referralCode || undefined, transactionHash: tx }),
      });
      sessionStorage.removeItem(TX_STORAGE_KEY);
      if (!response.ok) return;
      const data = await response.json();
      if (data.code) setProfile({ code: data.code, points: Number(data.points ?? 0) });
      if (data.attributed) {
        localStorage.removeItem(STORAGE_KEY);
        pushToast({ title: "Referral points earned", description: `You earned ${Number(data.minterPoints).toLocaleString()} points.`, variant: "success" });
      }
    };
    const observer = new MutationObserver(checkMint);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [address, mounted, pushToast]);

  if (!mounted || !host) return null;
  return createPortal(<ReferralPanel profile={profile} />, host);
}
