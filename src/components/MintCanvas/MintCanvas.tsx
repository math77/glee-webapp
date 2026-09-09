"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatEther } from "viem";
import { useAccount, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { gleeABI, GLEE_CONTRACT_ADDRESS } from "../../utils/contractAbi";
import { explorerTxUrl } from "../../utils/explorer";
import { NFT_MAX_SUPPLY } from "../../utils/nftLaunch";
import ReferralControls, { processConfirmedReferralMint } from "../ReferralControls/ReferralControls";
import { useToast } from "../Toast/ToastProvider";

interface MintCanvasProps { fallbackPriceEth?: number; onMintSuccess?: () => void; }
const contract = { address: GLEE_CONTRACT_ADDRESS, abi: gleeABI } as const;

export default function MintCanvas({ fallbackPriceEth = 0.003, onMintSuccess }: MintCanvasProps) {
  const [quantity, setQuantity] = useState(1);
  const [mintSent, setMintSent] = useState(false);
  const mintProcessedRef = useRef(false);
  const lastErrorRef = useRef<unknown>(null);
  const mintResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pushToast } = useToast();
  const { address, isConnected } = useAccount();
  const { data: onChainPrice } = useReadContract({ ...contract, functionName: "mintPrice" });
  const { data: totalMintedSoFar, refetch: refetchTotalMinted } = useReadContract({ ...contract, functionName: "totalSupply" });
  const priceWei = onChainPrice as bigint | undefined;
  const totalPriceWei = priceWei !== undefined ? priceWei * BigInt(quantity) : undefined;
  const displayPriceEth = priceWei !== undefined ? Number(formatEther(priceWei)) * quantity : fallbackPriceEth * quantity;
  const formattedPrice = displayPriceEth >= 1 ? displayPriceEth.toFixed(1) : displayPriceEth.toFixed(4);
  const mintedCount = totalMintedSoFar !== undefined ? Number(totalMintedSoFar) : undefined;
  const isSoldOut = mintedCount !== undefined && mintedCount >= NFT_MAX_SUPPLY;
  const remaining = mintedCount !== undefined ? Math.max(NFT_MAX_SUPPLY - mintedCount, 0) : undefined;
  const mintProgress = mintedCount !== undefined ? Math.min(mintedCount / NFT_MAX_SUPPLY, 1) : 0;
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const { error: simulateError, isPending: isSimulatePending } = useSimulateContract({ ...contract, functionName: "mintCanvas", args: [BigInt(quantity)], value: totalPriceWei, query: { enabled: isConnected && !isSoldOut && totalPriceWei !== undefined } });
  const hasInsufficientFundsError = Boolean(simulateError && (simulateError.message.includes("insufficient funds") || (simulateError as { shortMessage?: string })?.shortMessage?.includes("insufficient funds")));
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!hash) return;
    mintProcessedRef.current = false;
    if (mintResetTimeoutRef.current) clearTimeout(mintResetTimeoutRef.current);
    mintResetTimeoutRef.current = null;
  }, [hash]);
  useEffect(() => () => { if (mintResetTimeoutRef.current) clearTimeout(mintResetTimeoutRef.current); }, []);

  useEffect(() => {
    if (!receipt.isSuccess || mintProcessedRef.current || !hash || !address) return;
    mintProcessedRef.current = true;
    setMintSent(true);
    void refetchTotalMinted();
    pushToast({ title: "Canvas minted", description: `You minted ${quantity} canvas${quantity > 1 ? "es" : ""} for ${formattedPrice} ETH.`, variant: "success", href: explorerTxUrl(hash), hrefLabel: "View transaction" });
    void processConfirmedReferralMint(address, hash)
      .then((result) => {
        if (result.minterPoints) pushToast({ title: "Points earned", description: `You earned ${result.minterPoints.toLocaleString()} points.`, variant: "success" });
      })
      .catch((referralError) => console.error("GLEE referral processing failed", referralError));
    onMintSuccess?.();
    mintResetTimeoutRef.current = setTimeout(() => { setMintSent(false); mintResetTimeoutRef.current = null; }, 3000);
  }, [receipt.isSuccess, refetchTotalMinted, pushToast, onMintSuccess, hash, address, quantity, formattedPrice]);

  useEffect(() => {
    if (receipt.isError) pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
  }, [receipt.isError, pushToast]);
  useEffect(() => {
    if (error && error !== lastErrorRef.current) { lastErrorRef.current = error; pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" }); }
  }, [error, pushToast]);

  const isMintButtonDisabled = !isConnected || isPending || isSimulatePending || receipt.isLoading || isSoldOut || hasInsufficientFundsError || mintSent || totalPriceWei === undefined;
  const buttonLabel = mintSent ? "Minted" : isSoldOut ? "Sold out" : isPending ? "Confirm in wallet…" : receipt.isLoading ? "Confirming…" : `Mint ${quantity > 1 ? `${quantity} canvases` : "canvas"} for ${formattedPrice} ETH`;

  return (
    <div>
      <div className="flex items-center justify-between gap-6">
        <div><p className="eyebrow-quiet">Price</p><div className="mt-1 overflow-hidden"><AnimatePresence mode="popLayout" initial={false}><motion.h3 key={formattedPrice} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18, ease: "easeOut" }} className="font-[family-name:var(--font-fraunces)] text-3xl italic text-[var(--foreground)]">{formattedPrice} ETH</motion.h3></AnimatePresence></div></div>
        <div className="flex items-center border border-[var(--border-hairline-strong)]"><button onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))} disabled={quantity <= 1} aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30">−</button><div className="w-10 overflow-hidden text-center"><AnimatePresence mode="popLayout" initial={false}><motion.span key={quantity} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15, ease: "easeOut" }} className="block font-[family-name:var(--font-geist-mono)] text-sm text-[var(--foreground)]">{quantity}</motion.span></AnimatePresence></div><button onClick={() => setQuantity((prev) => prev + 1)} aria-label="Increase quantity" className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]">+</button></div>
      </div>
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} disabled={isMintButtonDisabled} onClick={() => totalPriceWei !== undefined && writeContract({ ...contract, functionName: "mintCanvas", args: [BigInt(quantity)], value: totalPriceWei })} className="quiet-button quiet-button--filled mt-6 w-full py-3 text-sm">{buttonLabel}</motion.button>
      <div className="mt-5 border-t border-[var(--border-hairline)] pt-4"><div className="h-1 w-full overflow-hidden bg-[var(--border-hairline)]"><motion.div className="h-full bg-[var(--accent)]" initial={{ width: 0 }} animate={{ width: `${mintProgress * 100}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></div><div className="mt-3 flex items-center justify-between font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]"><span>{mintedCount?.toLocaleString() ?? "—"} / {NFT_MAX_SUPPLY.toLocaleString()} minted</span><span>{remaining !== undefined ? `${remaining.toLocaleString()} remaining` : ""}</span></div></div>
      {!isConnected && <p className="mt-3 text-sm text-[var(--accent)]">Connect your wallet to mint.</p>}
      {hasInsufficientFundsError && <p className="mt-3 text-sm text-[#c17a72]">Insufficient funds for gas and mint price.</p>}
      <ReferralControls address={address} />
    </div>
  );
}
