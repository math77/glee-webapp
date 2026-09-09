"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatEther } from "viem";
import { useAccount, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { gleeV2ABI, GLEE_V2_CONTRACT_ADDRESS } from "@/utils/contractAbi";
import { explorerTxUrl } from "@/utils/explorer";
import { NFT_PUBLIC_SUPPLY } from "@/utils/nftLaunch";
import ReferralControls, { processConfirmedReferralMint } from "../ReferralControls/ReferralControls";
import { useToast } from "../Toast/ToastProvider";

interface MintCanvasV2Props { fallbackPriceEth?: number; onMintSuccess?: () => void; }
type MintMode = "whitelist" | "public";
interface WhitelistStatus { eligible: boolean; proof: `0x${string}`[]; }

function formatCountdown(deadline: bigint | undefined) {
  if (deadline === undefined) return "";
  const secondsLeft = Number(deadline) - Math.floor(Date.now() / 1000);
  if (secondsLeft <= 0) return "";
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  return `${result}${seconds}s`;
}

const contract = { address: GLEE_V2_CONTRACT_ADDRESS, abi: gleeV2ABI } as const;

export default function MintCanvasV2({ fallbackPriceEth = 0.003, onMintSuccess }: MintCanvasV2Props) {
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<MintMode>("public");
  const [mintSent, setMintSent] = useState(false);
  const [whitelistStatus, setWhitelistStatus] = useState<WhitelistStatus | null>(null);
  const [countdown, setCountdown] = useState("");
  const processedRef = useRef(false);
  const resetRef = useRef<number | null>(null);
  const lastErrorRef = useRef<unknown>(null);
  const { pushToast } = useToast();
  const { address, isConnected } = useAccount();

  const { data: isMintOpen } = useReadContract({ ...contract, functionName: "openMint" });
  const { data: wlDeadline } = useReadContract({ ...contract, functionName: "wlDeadline" });
  const { data: onChainPrice } = useReadContract({ ...contract, functionName: "mintPrice" });
  const { data: totalMintedSoFar, refetch: refetchTotalMinted } = useReadContract({ ...contract, functionName: "totalSupply" });
  const { data: publicAvailableOnChain, refetch: refetchPublicAvailable } = useReadContract({ ...contract, functionName: "publicAvailable" });
  const { data: publicWalletCap } = useReadContract({ ...contract, functionName: "publicWalletCap" });
  const { data: publicMintedByMe, refetch: refetchPublicMintedByMe } = useReadContract({ ...contract, functionName: "publicMinted", args: address ? [address] : undefined, query: { enabled: Boolean(address) } });
  const { data: wlRemainingForMe, refetch: refetchWlRemaining } = useReadContract({ ...contract, functionName: "wlRemaining", args: address ? [address] : undefined, query: { enabled: Boolean(address) } });

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(wlDeadline as bigint | undefined));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [wlDeadline]);

  useEffect(() => {
    if (!address) { setWhitelistStatus(null); return; }
    let cancelled = false;
    fetch(`/api/whitelist?address=${address}`)
      .then((res) => res.json())
      .then((data: WhitelistStatus) => { if (!cancelled) setWhitelistStatus(data); })
      .catch(() => { if (!cancelled) setWhitelistStatus({ eligible: false, proof: [] }); });
    return () => { cancelled = true; };
  }, [address]);

  const isWlWindowActive = Boolean(isMintOpen) && wlDeadline !== undefined && BigInt(Math.floor(Date.now() / 1000)) < (wlDeadline as bigint);
  const hasWlRemaining = wlRemainingForMe !== undefined && (wlRemainingForMe as bigint) > BigInt(0);
  const canUseWhitelist = isWlWindowActive && Boolean(whitelistStatus?.eligible) && hasWlRemaining;
  useEffect(() => { setMode(canUseWhitelist ? "whitelist" : "public"); }, [canUseWhitelist]);

  const myPublicRemaining = publicWalletCap !== undefined && publicMintedByMe !== undefined ? (publicWalletCap as bigint) - (publicMintedByMe as bigint) : undefined;
  const maxQuantity = mode === "whitelist"
    ? (wlRemainingForMe !== undefined ? Number(wlRemainingForMe as bigint) : 0)
    : (() => {
        const personal = myPublicRemaining !== undefined ? Number(myPublicRemaining) : undefined;
        const global = publicAvailableOnChain !== undefined ? Number(publicAvailableOnChain as bigint) : undefined;
        const caps = [personal, global].filter((value): value is number => value !== undefined);
        return caps.length ? Math.max(Math.min(...caps), 0) : 0;
      })();

  useEffect(() => { setQuantity((current) => Math.min(Math.max(current, 1), Math.max(maxQuantity, 1))); }, [maxQuantity]);

  const priceWei = onChainPrice as bigint | undefined;
  const totalPriceWei = priceWei !== undefined ? priceWei * BigInt(quantity) : undefined;
  const displayPriceEth = priceWei !== undefined ? Number(formatEther(priceWei)) * quantity : fallbackPriceEth * quantity;
  const formattedPrice = displayPriceEth >= 1 ? displayPriceEth.toFixed(1) : displayPriceEth.toFixed(4);

  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const canSimulate = isConnected && isMintOpen === true && totalPriceWei !== undefined && maxQuantity > 0;
  const { error: simulateWhitelistError, isPending: simulateWhitelistPending } = useSimulateContract({ ...contract, functionName: "mintWhitelist", args: whitelistStatus ? [BigInt(quantity), whitelistStatus.proof] : undefined, value: totalPriceWei, query: { enabled: canSimulate && mode === "whitelist" && Boolean(whitelistStatus?.proof.length) } });
  const { error: simulatePublicError, isPending: simulatePublicPending } = useSimulateContract({ ...contract, functionName: "mintCanvas", args: [BigInt(quantity)], value: totalPriceWei, query: { enabled: canSimulate && mode === "public" } });
  const simulateError = mode === "whitelist" ? simulateWhitelistError : simulatePublicError;
  const isSimulatePending = mode === "whitelist" ? simulateWhitelistPending : simulatePublicPending;
  const hasInsufficientFundsError = Boolean(simulateError && (simulateError.message.includes("insufficient funds") || (simulateError as { shortMessage?: string })?.shortMessage?.includes("insufficient funds")));
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!hash) return;
    processedRef.current = false;
    if (resetRef.current) window.clearTimeout(resetRef.current);
    resetRef.current = null;
  }, [hash]);
  useEffect(() => () => { if (resetRef.current) window.clearTimeout(resetRef.current); }, []);

  useEffect(() => {
    if (!receipt.isSuccess || processedRef.current || !hash || !address) return;
    processedRef.current = true;
    setMintSent(true);
    void refetchTotalMinted();
    void refetchPublicAvailable();
    void refetchPublicMintedByMe();
    void refetchWlRemaining();
    pushToast({ title: "Canvas minted", description: `You minted ${quantity} canvas${quantity > 1 ? "es" : ""} for ${formattedPrice} ETH.`, variant: "success", href: explorerTxUrl(hash), hrefLabel: "View transaction" });
    void processConfirmedReferralMint(address, hash)
      .then((result) => { if (result.minterPoints) pushToast({ title: "Points earned", description: `You earned ${result.minterPoints.toLocaleString()} referral points.`, variant: "success" }); })
      .catch((referralError) => console.error("GLEE referral processing failed", referralError));
    onMintSuccess?.();
    resetRef.current = window.setTimeout(() => { setMintSent(false); resetRef.current = null; }, 3000);
  }, [receipt.isSuccess, refetchTotalMinted, refetchPublicAvailable, refetchPublicMintedByMe, refetchWlRemaining, pushToast, onMintSuccess, hash, address, quantity, formattedPrice]);

  useEffect(() => { if (receipt.isError) pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" }); }, [receipt.isError, pushToast]);
  useEffect(() => { if (error && error !== lastErrorRef.current) { lastErrorRef.current = error; pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" }); } }, [error, pushToast]);

  const handleMint = () => {
    if (totalPriceWei === undefined) return;
    if (mode === "whitelist" && whitelistStatus) writeContract({ ...contract, functionName: "mintWhitelist", args: [BigInt(quantity), whitelistStatus.proof], value: totalPriceWei });
    else writeContract({ ...contract, functionName: "mintCanvas", args: [BigInt(quantity)], value: totalPriceWei });
  };

  const mintedCount = totalMintedSoFar !== undefined ? Number(totalMintedSoFar) : undefined;
  const remaining = mintedCount !== undefined ? Math.max(NFT_PUBLIC_SUPPLY - mintedCount, 0) : undefined;
  const mintProgress = mintedCount !== undefined ? Math.min(mintedCount / NFT_PUBLIC_SUPPLY, 1) : 0;
  const isSoldOut = mintedCount !== undefined && mintedCount >= NFT_PUBLIC_SUPPLY;
  const isNotOpenYet = isMintOpen === false;
  const disabled = !isConnected || isPending || isSimulatePending || receipt.isLoading || isSoldOut || isNotOpenYet || hasInsufficientFundsError || mintSent || maxQuantity <= 0 || totalPriceWei === undefined;
  const label = mintSent ? "Minted" : isSoldOut ? "Sold out" : isNotOpenYet ? "Mint not open" : isPending ? "Confirm in wallet…" : receipt.isLoading ? "Confirming…" : maxQuantity <= 0 ? (mode === "whitelist" ? "Whitelist allocation used" : "Public cap reached") : `Mint ${quantity > 1 ? `${quantity} canvases` : "canvas"} for ${formattedPrice} ETH`;

  return (
    <div>
      {canUseWhitelist && <div className="mb-4 flex items-center gap-2 border border-[var(--border-hairline-strong)] p-1 text-xs font-[family-name:var(--font-geist-mono)]"><button onClick={() => setMode("whitelist")} className={`flex-1 py-2 transition-colors ${mode === "whitelist" ? "bg-[var(--accent)] text-white" : "text-[var(--foreground-muted)]"}`}>Whitelist ({Number(wlRemainingForMe)} left)</button><button onClick={() => setMode("public")} className={`flex-1 py-2 transition-colors ${mode === "public" ? "bg-[var(--accent)] text-white" : "text-[var(--foreground-muted)]"}`}>Public</button></div>}
      <div className="flex items-center justify-between gap-6"><div><p className="eyebrow-quiet">Price</p><div className="mt-1 overflow-hidden"><AnimatePresence mode="popLayout" initial={false}><motion.h3 key={formattedPrice} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18, ease: "easeOut" }} className="font-[family-name:var(--font-fraunces)] text-3xl italic text-[var(--foreground)]">{formattedPrice} ETH</motion.h3></AnimatePresence></div></div><div className="flex items-center border border-[var(--border-hairline-strong)]"><button onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))} disabled={quantity <= 1} aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30">−</button><div className="w-10 overflow-hidden text-center"><AnimatePresence mode="popLayout" initial={false}><motion.span key={quantity} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15, ease: "easeOut" }} className="block font-[family-name:var(--font-geist-mono)] text-sm text-[var(--foreground)]">{quantity}</motion.span></AnimatePresence></div><button onClick={() => setQuantity((prev) => Math.min(prev + 1, Math.max(maxQuantity, 1)))} disabled={quantity >= maxQuantity} aria-label="Increase quantity" className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30">+</button></div></div>
      {canUseWhitelist && countdown && <p className="mt-3 text-right font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">Whitelist window: {countdown}</p>}
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} disabled={disabled} onClick={handleMint} className="quiet-button quiet-button--filled mt-6 w-full py-3 text-sm">{label}</motion.button>
      <div className="mt-5 border-t border-[var(--border-hairline)] pt-4"><div className="h-1 w-full overflow-hidden bg-[var(--border-hairline)]"><motion.div className="h-full bg-[var(--accent)]" initial={{ width: 0 }} animate={{ width: `${mintProgress * 100}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></div><div className="mt-3 flex items-center justify-between font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]"><span>{mintedCount?.toLocaleString() ?? "—"} / {NFT_PUBLIC_SUPPLY.toLocaleString()} minted</span><span>{remaining !== undefined ? `${remaining.toLocaleString()} remaining` : ""}</span></div></div>
      {!isConnected && <p className="mt-3 text-sm text-[var(--accent)]">Connect your wallet to mint.</p>}
      {hasInsufficientFundsError && <p className="mt-3 text-sm text-[#c17a72]">Insufficient funds for gas and mint price.</p>}
      <ReferralControls address={address} />
    </div>
  );
}
