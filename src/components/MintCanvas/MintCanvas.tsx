/*
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseEther } from "viem";
import { useAccount, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "../../utils/contractAbi";

import { explorerTxUrl } from "../../utils/explorer";
import { NFT_MAX_SUPPLY } from "../../utils/nftLaunch";

import { useToast } from "../Toast/ToastProvider";

interface MintCanvasProps {
  basePrice: number;
  onMintSuccess?: () => void;
}

export default function MintCanvas({ basePrice = 0.0011, onMintSuccess }: MintCanvasProps) {
  const [quantity, setQuantity] = useState(1);
  const [mintSent, setMintSent] = useState(false);
  const mintProcessedRef = useRef(false);
  const lastErrorRef = useRef<unknown>(null);
  const mintResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pushToast } = useToast();
  const { isConnected } = useAccount();

  const totalPrice = basePrice * quantity;
  const formattedPrice = totalPrice >= 1 ? totalPrice.toFixed(1) : totalPrice.toFixed(4);

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { data: totalMintedSoFar, refetch: refetchTotalMinted } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "totalSupply",
  });

  const mintedCount = totalMintedSoFar !== undefined ? Number(totalMintedSoFar) : undefined;
  const isSoldOut = mintedCount !== undefined && mintedCount >= NFT_MAX_SUPPLY;
  const remaining = mintedCount !== undefined ? Math.max(NFT_MAX_SUPPLY - mintedCount, 0) : undefined;
  const mintProgress = mintedCount !== undefined ? Math.min(mintedCount / NFT_MAX_SUPPLY, 1) : 0;

  const { error: simulateError, isPending: isSimulatePending } = useSimulateContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "mintCanvas",
    args: [BigInt(quantity)],
    value: parseEther(String(totalPrice)),
    query: { enabled: isConnected && !isSoldOut },
  });

  const hasInsufficientFundsError = Boolean(
    simulateError && (simulateError.message.includes("insufficient funds") || (simulateError as { shortMessage?: string })?.shortMessage?.includes("insufficient funds"))
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  // A fresh hash means a new attempt — clear the guard so a second mint in the same
  // session can fire onMintSuccess again, and cancel any pending auto-reset from before.
  useEffect(() => {
    if (hash) {
      mintProcessedRef.current = false;
      if (mintResetTimeoutRef.current) {
        clearTimeout(mintResetTimeoutRef.current);
        mintResetTimeoutRef.current = null;
      }
    }
  }, [hash]);

  useEffect(() => {
    return () => {
      if (mintResetTimeoutRef.current) clearTimeout(mintResetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!receipt.isSuccess || mintProcessedRef.current) return;
    mintProcessedRef.current = true;
    setMintSent(true);
    void refetchTotalMinted();
    pushToast({
      title: "Canvas minted",
      description: `You minted ${quantity} canvas${quantity > 1 ? "es" : ""} for ${formattedPrice} ETH.`,
      variant: "success",
      href: hash ? explorerTxUrl(hash) : undefined,
      hrefLabel: "View transaction",
    });
    onMintSuccess?.();
    mintResetTimeoutRef.current = setTimeout(() => {
      setMintSent(false);
      mintResetTimeoutRef.current = null;
    }, 3000);
  }, [receipt.isSuccess, refetchTotalMinted, pushToast, onMintSuccess, hash, quantity, formattedPrice]);

  useEffect(() => {
    if (receipt.isError) {
      pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    }
  }, [receipt.isError, pushToast]);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    }
  }, [error, pushToast]);

  const isMintButtonDisabled = !isConnected || isPending || isSimulatePending || receipt.isLoading || isSoldOut || hasInsufficientFundsError || mintSent;

  const buttonLabel = mintSent
    ? "Minted"
    : isSoldOut
      ? "Sold out"
      : isPending
        ? "Confirm in wallet…"
        : receipt.isLoading
          ? "Confirming…"
          : `Mint ${quantity > 1 ? `${quantity} canvases` : "canvas"} for ${formattedPrice} ETH`;

  return (
    <div>
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="eyebrow-quiet">Price</p>
          <div className="mt-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h3
                key={formattedPrice}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="font-[family-name:var(--font-fraunces)] text-3xl italic text-[var(--foreground)]"
              >
                {formattedPrice} ETH
              </motion.h3>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center border border-[var(--border-hairline-strong)]">
          <button
            onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
          >
            −
          </button>
          <div className="w-10 overflow-hidden text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={quantity}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="block font-[family-name:var(--font-geist-mono)] text-sm text-[var(--foreground)]"
              >
                {quantity}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            onClick={() => setQuantity((prev) => prev + 1)}
            aria-label="Increase quantity"
            className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            +
          </button>
        </div>
      </div>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        disabled={isMintButtonDisabled}
        onClick={() =>
          writeContract({
            address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
            abi: pixelatedDelightsABI,
            functionName: "mintCanvas",
            args: [BigInt(quantity)],
            value: parseEther(String(totalPrice)),
          })
        }
        className="quiet-button quiet-button--filled mt-6 w-full py-3 text-sm"
      >
        {buttonLabel}
      </motion.button>

      <div className="mt-5 border-t border-[var(--border-hairline)] pt-4">
        <div className="h-1 w-full overflow-hidden bg-[var(--border-hairline)]">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${mintProgress * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">
          <span>{mintedCount?.toLocaleString() ?? "—"} / {NFT_MAX_SUPPLY.toLocaleString()} minted</span>
          <span>{remaining !== undefined ? `${remaining.toLocaleString()} remaining` : ""}</span>
        </div>
      </div>

      {!isConnected && <p className="mt-3 text-sm text-[var(--accent)]">Connect your wallet to mint.</p>}
      {hasInsufficientFundsError && <p className="mt-3 text-sm text-[#c17a72]">Insufficient funds for gas and mint price.</p>}
    </div>
  );
}
*/

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import { useAccount, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { gleeABI, GLEE_CONTRACT_ADDRESS } from "../../utils/contractAbi";
import { explorerTxUrl } from "../../utils/explorer";
import { NFT_MAX_SUPPLY } from "../../utils/nftLaunch";
import { useToast } from "../Toast/ToastProvider";

interface MintCanvasProps {
  /** Shown only until the on-chain price has loaded, to avoid a blank price on first paint. */
  fallbackPriceEth?: number;
  onMintSuccess?: () => void;
}

type MintMode = "whitelist" | "public";

interface WhitelistStatus {
  eligible: boolean;
  proof: `0x${string}`[];
}

function formatCountdown(deadline: bigint | undefined) {
  if (deadline === undefined) return "";
  const secondsLeft = Number(deadline) - Math.floor(Date.now() / 1000);
  if (secondsLeft <= 0) return "";

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  let parts = "";
  if (hours > 0) parts += `${hours}h `;
  if (minutes > 0 || hours > 0) parts += `${minutes}m `;
  parts += `${seconds}s`;
  return parts;
}

const contract = { address: GLEE_CONTRACT_ADDRESS, abi: gleeABI } as const;

export default function MintCanvas({ fallbackPriceEth = 0.003, onMintSuccess }: MintCanvasProps) {
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<MintMode>("public");
  const [mintSent, setMintSent] = useState(false);
  const [whitelistStatus, setWhitelistStatus] = useState<WhitelistStatus | null>(null);
  const [countdown, setCountdown] = useState("");
  const mintProcessedRef = useRef(false);
  const lastErrorRef = useRef<unknown>(null);
  const mintResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pushToast } = useToast();
  const { address, isConnected } = useAccount();

  /* ------------------------------ on-chain reads ----------------------------- */

  const { data: isMintOpen } = useReadContract({ ...contract, functionName: "openMint" });
  const { data: wlDeadline } = useReadContract({ ...contract, functionName: "wlDeadline" });
  const { data: onChainPrice } = useReadContract({ ...contract, functionName: "mintPrice" });
  const { data: maxSupplyOnChain } = useReadContract({ ...contract, functionName: "MAX_SUPPLY" });

  const { data: totalMintedSoFar, refetch: refetchTotalMinted } = useReadContract({ ...contract, functionName: "totalSupply" });
  const { data: publicAvailableOnChain, refetch: refetchPublicAvailable } = useReadContract({ ...contract, functionName: "publicAvailable" });
  const { data: publicWalletCap } = useReadContract({ ...contract, functionName: "publicWalletCap" });

  const { data: publicMintedByMe, refetch: refetchPublicMintedByMe } = useReadContract({
    ...contract,
    functionName: "publicMinted",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: wlRemainingForMe, refetch: refetchWlRemaining } = useReadContract({
    ...contract,
    functionName: "wlRemaining",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  /* ------------------------------ derived state ------------------------------ */

  const isWlWindowActive = Boolean(isMintOpen) && wlDeadline !== undefined && BigInt(Math.floor(Date.now() / 1000)) < (wlDeadline as bigint);

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(wlDeadline as bigint | undefined));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [wlDeadline]);

  // Look up this wallet's whitelist proof from our own API (list stays server-side).
  useEffect(() => {
    if (!address) {
      setWhitelistStatus(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/whitelist?address=${address}`)
      .then((res) => res.json())
      .then((data: WhitelistStatus) => {
        if (!cancelled) setWhitelistStatus(data);
      })
      .catch(() => {
        if (!cancelled) setWhitelistStatus({ eligible: false, proof: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const isEligibleForWl =
    Boolean(whitelistStatus?.eligible) && wlRemainingForMe !== undefined && (wlRemainingForMe as bigint) > BigInt(0);
  const canUseWhitelist = isWlWindowActive && isEligibleForWl;

  // Default to whitelist mode the moment it's available; the wallet can switch to
  // public manually (e.g. to also use their separate public allowance).
  useEffect(() => {
    setMode(canUseWhitelist ? "whitelist" : "public");
  }, [canUseWhitelist]);

  const myPublicRemaining =
    publicWalletCap !== undefined && publicMintedByMe !== undefined
      ? (publicWalletCap as bigint) - (publicMintedByMe as bigint)
      : undefined;

  const maxQuantity = useMemo(() => {
    if (mode === "whitelist") {
      return wlRemainingForMe !== undefined ? Number(wlRemainingForMe as bigint) : 0;
    }
    const personalCap = myPublicRemaining !== undefined ? Number(myPublicRemaining) : undefined;
    const globalCap = publicAvailableOnChain !== undefined ? Number(publicAvailableOnChain as bigint) : undefined;
    const caps = [personalCap, globalCap].filter((n): n is number => n !== undefined);
    return caps.length ? Math.max(Math.min(...caps), 0) : 0;
  }, [mode, wlRemainingForMe, myPublicRemaining, publicAvailableOnChain]);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(maxQuantity, 1)));
  }, [maxQuantity]);

  const priceWei = onChainPrice as bigint | undefined;
  const totalPriceWei = priceWei !== undefined ? priceWei * BigInt(quantity) : undefined;
  const displayPriceEth = priceWei !== undefined ? Number(formatEther(priceWei)) * quantity : fallbackPriceEth * quantity;
  const formattedPrice = displayPriceEth >= 1 ? displayPriceEth.toFixed(1) : displayPriceEth.toFixed(4);

  /* --------------------------------- writes ---------------------------------- */

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const canSimulate = isConnected && isMintOpen === true && totalPriceWei !== undefined && maxQuantity > 0;

  const { error: simulateWhitelistError, isPending: isSimulatingWhitelist } = useSimulateContract({
    ...contract,
    functionName: "mintWhitelist",
    args: whitelistStatus ? [BigInt(quantity), whitelistStatus.proof] : undefined,
    value:  totalPriceWei,
    query: { enabled: canSimulate && mode === "whitelist" && Boolean(whitelistStatus?.proof.length) },
  });

  const { error: simulatePublicError, isPending: isSimulatingPublic } = useSimulateContract({
    ...contract,
    functionName: "mintCanvas",
    args: [BigInt(quantity)],
    value: totalPriceWei,
    query: { enabled: canSimulate && mode === "public" },
  });

  const simulateError = mode === "whitelist" ? simulateWhitelistError : simulatePublicError;
  const isSimulatePending = mode === "whitelist" ? isSimulatingWhitelist : isSimulatingPublic;

  const hasInsufficientFundsError = Boolean(
    simulateError &&
      (simulateError.message.includes("insufficient funds") ||
        (simulateError as { shortMessage?: string })?.shortMessage?.includes("insufficient funds"))
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  // A fresh hash means a new attempt — clear the guard so a second mint in the same
  // session can fire onMintSuccess again, and cancel any pending auto-reset from before.
  useEffect(() => {
    if (hash) {
      mintProcessedRef.current = false;
      if (mintResetTimeoutRef.current) {
        clearTimeout(mintResetTimeoutRef.current);
        mintResetTimeoutRef.current = null;
      }
    }
  }, [hash]);

  useEffect(() => {
    return () => {
      if (mintResetTimeoutRef.current) clearTimeout(mintResetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!receipt.isSuccess || mintProcessedRef.current) return;
    mintProcessedRef.current = true;
    setMintSent(true);
    void refetchTotalMinted();
    void refetchPublicAvailable();
    void refetchPublicMintedByMe();
    void refetchWlRemaining();
    pushToast({
      title: "Canvas minted",
      description: `You minted ${quantity} canvas${quantity > 1 ? "es" : ""} for ${formattedPrice} ETH.`,
      variant: "success",
      href: hash ? explorerTxUrl(hash) : undefined,
      hrefLabel: "View transaction",
    });
    onMintSuccess?.();
    mintResetTimeoutRef.current = setTimeout(() => {
      setMintSent(false);
      mintResetTimeoutRef.current = null;
    }, 3000);
  }, [
    receipt.isSuccess,
    refetchTotalMinted,
    refetchPublicAvailable,
    refetchPublicMintedByMe,
    refetchWlRemaining,
    pushToast,
    onMintSuccess,
    hash,
    quantity,
    formattedPrice,
  ]);

  useEffect(() => {
    if (receipt.isError) {
      pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    }
  }, [receipt.isError, pushToast]);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    }
  }, [error, pushToast]);

  const handleMint = () => {
    if (!totalPriceWei) return;
    if (mode === "whitelist" && whitelistStatus) {
      writeContract({
        ...contract,
        functionName: "mintWhitelist",
        args: [BigInt(quantity), whitelistStatus.proof],
        value: totalPriceWei,
      });
    } else {
      writeContract({
        ...contract,
        functionName: "mintCanvas",
        args: [BigInt(quantity)],
        value: totalPriceWei,
      });
    }
  };

  /* --------------------------------- display ---------------------------------- */

  const mintedCount = totalMintedSoFar !== undefined ? Number(totalMintedSoFar as bigint) : undefined;
  const displayMaxSupply = maxSupplyOnChain !== undefined ? Number(maxSupplyOnChain as bigint) : NFT_MAX_SUPPLY;
  const mintProgress = mintedCount !== undefined ? Math.min(mintedCount / displayMaxSupply, 1) : 0;
  const isSoldOut = mintedCount !== undefined && mintedCount >= displayMaxSupply;
  const isNotOpenYet = isMintOpen === false;

  const isMintButtonDisabled =
    !isConnected ||
    isPending ||
    isSimulatePending ||
    receipt.isLoading ||
    isSoldOut ||
    isNotOpenYet ||
    hasInsufficientFundsError ||
    mintSent ||
    maxQuantity <= 0 ||
    totalPriceWei === undefined;

  const buttonLabel = mintSent
    ? "Minted"
    : isSoldOut
      ? "Sold out"
      : isNotOpenYet
        ? "Mint not open"
        : isPending
          ? "Confirm in wallet…"
          : receipt.isLoading
            ? "Confirming…"
            : maxQuantity <= 0
              ? mode === "whitelist"
                ? "Whitelist allocation used"
                : "Public cap reached"
              : `Mint ${quantity > 1 ? `${quantity} canvases` : "canvas"} for ${formattedPrice} ETH`;

  return (
    <div>
      {canUseWhitelist && (
        <div className="mb-4 flex items-center gap-2 border border-[var(--border-hairline-strong)] p-1 text-xs font-[family-name:var(--font-geist-mono)]">
          <button
            onClick={() => setMode("whitelist")}
            className={`flex-1 py-2 transition-colors ${mode === "whitelist" ? "bg-[var(--accent)] text-white" : "text-[var(--foreground-muted)]"}`}
          >
            Whitelist ({wlRemainingForMe !== undefined ? Number(wlRemainingForMe as bigint) : 0} left)
          </button>
          <button
            onClick={() => setMode("public")}
            className={`flex-1 py-2 transition-colors ${mode === "public" ? "bg-[var(--accent)] text-white" : "text-[var(--foreground-muted)]"}`}
          >
            Public
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="eyebrow-quiet">Price</p>
          <div className="mt-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h3
                key={formattedPrice}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="font-[family-name:var(--font-fraunces)] text-3xl italic text-[var(--foreground)]"
              >
                {formattedPrice} ETH
              </motion.h3>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center border border-[var(--border-hairline-strong)]">
          <button
            onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
          >
            −
          </button>
          <div className="w-10 overflow-hidden text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={quantity}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="block font-[family-name:var(--font-geist-mono)] text-sm text-[var(--foreground)]"
              >
                {quantity}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            onClick={() => setQuantity((prev) => Math.min(prev + 1, Math.max(maxQuantity, 1)))}
            disabled={quantity >= maxQuantity}
            aria-label="Increase quantity"
            className="grid h-10 w-10 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        disabled={isMintButtonDisabled}
        onClick={handleMint}
        className="quiet-button quiet-button--filled mt-6 w-full py-3 text-sm"
      >
        {buttonLabel}
      </motion.button>

      <div className="mt-5 border-t border-[var(--border-hairline)] pt-4">
        <div className="h-1 w-full overflow-hidden bg-[var(--border-hairline)]">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${mintProgress * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">
          <span>
            {mintedCount?.toLocaleString() ?? "—"} / {displayMaxSupply.toLocaleString()} minted
          </span>
          {isWlWindowActive && countdown && <span>Whitelist closes in {countdown}</span>}
        </div>
      </div>

      {!isConnected && <p className="mt-3 text-sm text-[var(--accent)]">Connect your wallet to mint.</p>}
      {isConnected && isWlWindowActive && !isEligibleForWl && (
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">
          This wallet isn&apos;t on the whitelist — public mint is still available if there&apos;s unreserved supply left.
        </p>
      )}
      {hasInsufficientFundsError && <p className="mt-3 text-sm text-[#c17a72]">Insufficient funds for gas and mint price.</p>}
    </div>
  );
}