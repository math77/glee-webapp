/*

"use client";

import React, { useEffect, useState, useRef } from 'react';

import { 
  type BaseError,
  useWriteContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useReadContract
} from 'wagmi';

import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from '../../../utils/contractAbi';
import { parseEther } from 'viem';

import Pending from '../Pending/Pending';
import useSoundEffect from '@/hooks/useSoundEffect';

interface MintCanvasProps {
  basePrice: number;
  onMintSuccess?: () => void; // New prop for handling successful mints
}

const MintCanvas: React.FC<MintCanvasProps> = ({
  basePrice = 0.0011,
  onMintSuccess
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isMintPeriodOver, setIsMintPeriodOver] = useState<boolean>(false);
  const mintProcessedRef = useRef<boolean>(false);
  
  const mintSuccessSound = useSoundEffect('/sounds/mintsuccess.mp3');

  const { data: hash, error, isPending, writeContract } = useWriteContract();
  
  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };
  
  const handleDecrement = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };
  
  // Calculate the total price
  const totalPrice = basePrice * quantity;
  
  // Format the price string correctly
  const formattedPrice = totalPrice >= 1 
    ? totalPrice.toFixed(1) // Show 1 decimal place when ≥ 1 ETH
    : totalPrice.toFixed(4); // Show 4 decimal places when < 1 ETH

  const { data: simulateData, error: simulateError, isPending: isSimulatePending } = useSimulateContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'mintCanvas',
    args: [BigInt(quantity)],
    value: parseEther(String(totalPrice))
  });

  // Check if there's an insufficient funds error
  const hasInsufficientFundsError = simulateError && 
    (simulateError.message.includes("insufficient funds") || 
     (simulateError as any)?.shortMessage?.includes("insufficient funds"));
  
  
  const walletNotConnectedsError = simulateError && 
    (simulateError.message.includes("Connector not connected") || 
      (simulateError as any)?.shortMessage?.includes("Connector not connected."));


  const { data, isLoading: isConfirmingMintCanvas, isSuccess: isConfirmedMintCanvas } =
    useWaitForTransactionReceipt({
      hash,
    }
  );

  // Reset the processed state when starting a new transaction
  useEffect(() => {
    if (hash) {
      mintProcessedRef.current = false;
    }
  }, [hash]);

  const { data: totalMintedSoFar, error: totalSupplyError, isPending: totalSupplyIsPending } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'totalSupply',
  });
  
  const { data: timeToEndMint, error: errorToGetTime, isPending: pendingTime } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'mintEndTime',
  });

  // Update countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const difference = Number(timeToEndMint) - now;
      
      if (difference <= 0) {
        // Mint period has ended
        setTimeLeft("Mint period ended");
        setIsMintPeriodOver(true);
        return;
      }
      
      setIsMintPeriodOver(false);
      
      // Calculate days, hours, minutes and seconds
      const days = Math.floor(difference / (60 * 60 * 24));
      const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);
      const seconds = difference % 60;
      
      // Format the time string
      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;
      
      setTimeLeft(timeString);
    };

    // Initial calculation
    calculateTimeLeft();
    
    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Clean up
    return () => clearInterval(timer);
  }, [timeToEndMint]);

  useEffect(() => {
    if (isConfirmedMintCanvas && !mintProcessedRef.current) {
      // Mark this mint as processed
      mintProcessedRef.current = true;
      
      // Play sound
      mintSuccessSound.play();
      
      // Call the onMintSuccess callback if it exists
      if (onMintSuccess && typeof onMintSuccess === 'function') {
        onMintSuccess();
      }
    }
  }, [isConfirmedMintCanvas, onMintSuccess, mintSuccessSound]); 

  // Determine if the mint button should be disabled
  const isMintButtonDisabled = isPending || isSimulatePending || isConfirmingMintCanvas || isMintPeriodOver || hasInsufficientFundsError;

  return (
    <div className="max-w-md mx-auto p-6 border-1 border-white border-dashed shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl text-white font-bold tracking-tight font-[family-name:var(--font-pixelify-sans)]">{formattedPrice} ETH</h1>
        </div>
        
        <div className="flex flex-col border rounded-lg">
          <button 
            onClick={handleIncrement}
            className="px-4 py-2 border-b hover:bg-emerald-500"
            aria-label="Increase quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <div className="px-6 py-2 text-white text-center font-[family-name:var(--font-pixelify-sans)]">
            {quantity}
          </div>
          
          <button 
            onClick={handleDecrement}
            className="px-4 py-2 border-t hover:bg-emerald-500"
            aria-label="Decrease quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <button 
        className={`flex justify-center items-center w-full bg-white text-black py-4 px-6 rounded-lg mb-6 transition-colors font-semibold font-[family-name:var(--font-pixelify-sans)] ${isMintButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-500'}`}
        disabled={isMintButtonDisabled}
        onClick={() => 
          writeContract({
            address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
            abi: pixelatedDelightsABI,
            functionName: 'mintCanvas',
            args: [BigInt(quantity)],
            value: parseEther(String(totalPrice))
          })
        }
      >
        {isPending || isConfirmingMintCanvas || isSimulatePending ? <Pending className="animate-spin"/> : "Mint"}
      </button>
      
      <div className="mt-8">
        <div className="flex justify-between text-white text-sm mb-2">
          <span className="font-[family-name:var(--font-pixelify-sans)] text-base">{totalMintedSoFar?.toLocaleString()} minted</span>
          <span className="font-[family-name:var(--font-pixelify-sans)] text-base">Time left: {timeLeft}</span>
        </div>
      </div>
      {isConfirmedMintCanvas &&
        <p className="text-center text-green-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Success! <br/>
          Your minted {quantity} canvas
        </p>
      }
      {walletNotConnectedsError &&
        <p className="text-center text-yellow-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Please, connect your wallet!
        </p>
      }
      {hasInsufficientFundsError &&
        <p className="text-center text-red-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Insufficient funds for gas and mint price.
        </p>
      }
      {isMintPeriodOver &&
        <p className="text-center text-amber-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Mint period has ended
        </p>
      }
    </div>
  );
};

export default MintCanvas;
--------------------------------------

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseEther } from "viem";
import { useAccount, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "../../../utils/contractAbi";
import { explorerTxUrl } from "../../../utils/explorer";
import { useToast } from "../Toast/ToastProvider";

interface MintCanvasProps {
  basePrice: number;
  onMintSuccess?: () => void;
}

function formatTimeLeft(endTime: bigint | undefined) {
  if (endTime === undefined) return "";
  const secondsLeft = Number(endTime) - Math.floor(Date.now() / 1000);
  if (secondsLeft <= 0) return "Mint period ended";

  const days = Math.floor(secondsLeft / (60 * 60 * 24));
  const hours = Math.floor((secondsLeft % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((secondsLeft % (60 * 60)) / 60);
  const seconds = secondsLeft % 60;

  let parts = "";
  if (days > 0) parts += `${days}d `;
  if (hours > 0 || days > 0) parts += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) parts += `${minutes}m `;
  parts += `${seconds}s`;
  return parts;
}

export default function MintCanvas({ basePrice = 0.0011, onMintSuccess }: MintCanvasProps) {
  const [quantity, setQuantity] = useState(1);
  const [timeLeft, setTimeLeft] = useState("");
  const [isMintPeriodOver, setIsMintPeriodOver] = useState(false);
  const [mintSent, setMintSent] = useState(false);
  const mintProcessedRef = useRef(false);
  const lastErrorRef = useRef<unknown>(null);

  const { pushToast } = useToast();
  const { isConnected } = useAccount();

  const totalPrice = basePrice * quantity;
  const formattedPrice = totalPrice >= 1 ? totalPrice.toFixed(1) : totalPrice.toFixed(4);

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { error: simulateError, isPending: isSimulatePending } = useSimulateContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "mintCanvas",
    args: [BigInt(quantity)],
    value: parseEther(String(totalPrice)),
    query: { enabled: isConnected },
  });

  const hasInsufficientFundsError = Boolean(
    simulateError && (simulateError.message.includes("insufficient funds") || (simulateError as { shortMessage?: string })?.shortMessage?.includes("insufficient funds"))
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  // A fresh hash means a new attempt — clear the guard so a second mint in the same
  // session can fire onMintSuccess again.
  useEffect(() => {
    if (hash) mintProcessedRef.current = false;
  }, [hash]);

  const { data: totalMintedSoFar } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "totalSupply",
  });

  const { data: timeToEndMint } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "mintEndTime",
  });

  useEffect(() => {
    const tick = () => {
      setTimeLeft(formatTimeLeft(timeToEndMint as bigint | undefined));
      setIsMintPeriodOver(timeToEndMint !== undefined && Number(timeToEndMint) - Math.floor(Date.now() / 1000) <= 0);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [timeToEndMint]);

  useEffect(() => {
    if (!receipt.isSuccess || mintProcessedRef.current) return;
    mintProcessedRef.current = true;
    setMintSent(true);
    pushToast({
      title: "Canvas minted",
      description: `You minted ${quantity} canvas${quantity > 1 ? "es" : ""} for ${formattedPrice} ETH.`,
      variant: "success",
      href: hash ? explorerTxUrl(hash) : undefined,
      hrefLabel: "View transaction",
    });
    onMintSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  useEffect(() => {
    if (receipt.isError) {
      pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isError]);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      pushToast({ title: "Mint failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const isMintButtonDisabled = !isConnected || isPending || isSimulatePending || receipt.isLoading || isMintPeriodOver || hasInsufficientFundsError || mintSent;

  const buttonLabel = mintSent
    ? "Minted"
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

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-hairline)] pt-4 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">
        <span>{totalMintedSoFar?.toLocaleString() ?? "—"} minted</span>
        <span>{isMintPeriodOver ? "Mint period ended" : `Time left: ${timeLeft}`}</span>
      </div>

      {!isConnected && <p className="mt-3 text-sm text-[var(--accent)]">Connect your wallet to mint.</p>}
      {hasInsufficientFundsError && <p className="mt-3 text-sm text-[#c17a72]">Insufficient funds for gas and mint price.</p>}
    </div>
  );
}
*/

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseEther } from "viem";
import { useAccount, useReadContract, useSimulateContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "../../../utils/contractAbi";
import { explorerTxUrl } from "../../../utils/explorer";
import { useToast } from "../Toast/ToastProvider";

interface MintCanvasProps {
  basePrice: number;
  onMintSuccess?: () => void;
}

function formatTimeLeft(endTime: bigint | undefined) {
  if (endTime === undefined) return "";
  const secondsLeft = Number(endTime) - Math.floor(Date.now() / 1000);
  if (secondsLeft <= 0) return "Mint period ended";

  const days = Math.floor(secondsLeft / (60 * 60 * 24));
  const hours = Math.floor((secondsLeft % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((secondsLeft % (60 * 60)) / 60);
  const seconds = secondsLeft % 60;

  let parts = "";
  if (days > 0) parts += `${days}d `;
  if (hours > 0 || days > 0) parts += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) parts += `${minutes}m `;
  parts += `${seconds}s`;
  return parts;
}

export default function MintCanvas({ basePrice = 0.0011, onMintSuccess }: MintCanvasProps) {
  const [quantity, setQuantity] = useState(1);
  const [timeLeft, setTimeLeft] = useState("");
  const [isMintPeriodOver, setIsMintPeriodOver] = useState(false);
  const [mintSent, setMintSent] = useState(false);
  const mintProcessedRef = useRef(false);
  const lastErrorRef = useRef<unknown>(null);
  const mintResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pushToast } = useToast();
  const { isConnected } = useAccount();

  const totalPrice = basePrice * quantity;
  const formattedPrice = totalPrice >= 1 ? totalPrice.toFixed(1) : totalPrice.toFixed(4);

  const { data: hash, error, isPending, writeContract } = useWriteContract();

  const { error: simulateError, isPending: isSimulatePending } = useSimulateContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "mintCanvas",
    args: [BigInt(quantity)],
    value: parseEther(String(totalPrice)),
    query: { enabled: isConnected },
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

  const { data: totalMintedSoFar, refetch: refetchTotalMinted } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "totalSupply",
  });

  const { data: timeToEndMint } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: "mintEndTime",
  });

  useEffect(() => {
    const tick = () => {
      setTimeLeft(formatTimeLeft(timeToEndMint as bigint | undefined));
      setIsMintPeriodOver(timeToEndMint !== undefined && Number(timeToEndMint) - Math.floor(Date.now() / 1000) <= 0);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [timeToEndMint]);

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

  const isMintButtonDisabled = !isConnected || isPending || isSimulatePending || receipt.isLoading || isMintPeriodOver || hasInsufficientFundsError || mintSent;

  const buttonLabel = mintSent
    ? "Minted"
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

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-hairline)] pt-4 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">
        <span>{totalMintedSoFar?.toLocaleString() ?? "—"} minted</span>
        <span>{isMintPeriodOver ? "Mint period ended" : `Time left: ${timeLeft}`}</span>
      </div>

      {!isConnected && <p className="mt-3 text-sm text-[var(--accent)]">Connect your wallet to mint.</p>}
      {hasInsufficientFundsError && <p className="mt-3 text-sm text-[#c17a72]">Insufficient funds for gas and mint price.</p>}
    </div>
  );
}