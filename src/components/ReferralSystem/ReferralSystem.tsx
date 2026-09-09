"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "wagmi";
import { useToast } from "../Toast/ToastProvider";

const STORAGE_KEY = "glee_referral_code";

type Profile = { code: string; points: number };

function ReferralPanel({ profile }: { profile: Profile | null }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const { pushToast } = useToast();

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-quiet">Your referral code</p>
          <button onClick={copyOwnCode} disabled={!profile?.code} className="mt-1 font-[family-name:var(--font-geist-mono)] text-sm tracking-[0.16em] text-[var(--foreground)] disabled:opacity-40">
            {profile?.code ?? "Generating…"}
          </button>
        </div>
        <button onClick={copyOwnCode} disabled={!profile?.code} className="quiet-button px-3 py-2 text-xs">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/referrals?wallet=${address}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data.code) setProfile({ code: data.code, points: Number(data.points ?? 0) }); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [address]);

  useEffect(() => {
    if (!address || !mounted) return;
    const findHost = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const mintButton = buttons.find((button) => /^Mint /.test(button.textContent?.trim() ?? ""));
      const panel = mintButton?.closest(".studio-panel") as HTMLElement | null;
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
      const code = localStorage.getItem(STORAGE_KEY);
      const response = await fetch("/api/referrals/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, referralCode: code || undefined, transactionHash: "0x" + "0".repeat(64) }),
      });
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

  if (!host || !profile || !mounted) return null;
  return createPortal(<ReferralPanel profile={profile} />, host);
}
