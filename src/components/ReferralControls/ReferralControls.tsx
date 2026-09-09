"use client";

import { useEffect, useState } from "react";
import { useToast } from "../Toast/ToastProvider";

export const REFERRAL_STORAGE_KEY = "glee_referral_code";

interface ReferralProfile {
  code: string;
  points: number;
}

export default function ReferralControls({ address }: { address?: string }) {
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const { pushToast } = useToast();

  const refreshProfile = async () => {
    if (!address) {
      setProfile(null);
      return;
    }
    try {
      const response = await fetch(`/api/referrals?wallet=${address}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.exists && data.code) {
        setProfile({ code: data.code, points: Number(data.points ?? 0) });
      } else {
        setProfile(null);
      }
    } catch {
      // Referral controls are non-blocking for minting.
    }
  };

  useEffect(() => {
    void refreshProfile();
  }, [address]);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    const savedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
    const value = (referralCode || savedCode || "").trim().toUpperCase();
    if (referralCode && /^[A-Z2-9]{6}$/.test(value)) localStorage.setItem(REFERRAL_STORAGE_KEY, value);
    setInput(value);
  }, []);

  useEffect(() => {
    const handleProcessed = () => void refreshProfile();
    window.addEventListener("glee:referral-processed", handleProcessed);
    return () => window.removeEventListener("glee:referral-processed", handleProcessed);
  }, [address]);

  const copyCode = async () => {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const applyCode = async () => {
    const code = input.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) {
      setStatus("Enter a 6-character code.");
      return;
    }

    try {
      const response = await fetch(`/api/referrals?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      if (!response.ok || !data.valid) {
        setStatus("That referral code isn't active.");
        return;
      }
      localStorage.setItem(REFERRAL_STORAGE_KEY, code);
      setInput(code);
      setStatus("Referral code saved for your next mint.");
    } catch {
      setStatus("Couldn't validate that code right now.");
    }
  };

  if (!address) return null;

  return (
    <div className="mt-5 border-t border-[var(--border-hairline)] pt-4">
      {profile ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-quiet">Your referral code</p>
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-sm tracking-[0.16em] text-[var(--foreground)]">{profile.code}</p>
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--accent)]">{profile.points.toLocaleString()} points</p>
          </div>
          <button onClick={copyCode} className="quiet-button px-3 py-2 text-xs">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">Mint a canvas to unlock your referral code.</p>
      )}

      <label className="studio-label mt-4 block">Use a referral code</label>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          maxLength={6}
          onChange={(event) => setInput(event.target.value.toUpperCase())}
          placeholder="ABC123"
          className="studio-input min-w-0 flex-1 font-[family-name:var(--font-geist-mono)] tracking-[0.12em]"
          aria-label="Referral code"
        />
        <button onClick={applyCode} className="quiet-button px-3 text-xs">Apply</button>
      </div>
      {status && <p className="mt-2 text-xs text-[var(--foreground-muted)]">{status}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
        Mint with someone&apos;s code and both wallets earn points. Whitelist mints earn a little more.
      </p>
    </div>
  );
}

export function getStoredReferralCode() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

export async function processConfirmedReferralMint(wallet: string, transactionHash: `0x${string}`) {
  const referralCode = getStoredReferralCode();

  const response = await fetch("/api/referrals/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, referralCode: referralCode || undefined, transactionHash }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Referral processing failed.");

  if (data.attributed) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("glee:referral-processed"));
  }

  return data as {
    verified: boolean;
    attributed: boolean;
    code?: string;
    points?: number;
    minterPoints?: number;
    referrerPoints?: number;
  };
}
