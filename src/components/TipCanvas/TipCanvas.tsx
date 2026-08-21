/*
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useSendCalls, useCallsStatus } from "wagmi/experimental";
import { GLEE_CONTRACT_ADDRESS, pixelatedDelightsABI } from "../../../utils/contractAbi";
import { useToast } from "../Toast/ToastProvider";

const erc20Abi = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "issueToken", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const gleeAbi = [
  { type: "function", name: "gleeCoin", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "openTips", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

const explorerTxUrl = (hash: string) => `https://robinhoodchain.blockscout.com/tx/${hash}`;

// Errors a wallet throws when it doesn't understand `wallet_sendCalls` (EIP-5792) at all —
// as opposed to the user rejecting the request, which should NOT trigger a fallback.
// Wallets are inconsistent here: some throw a properly-coded "method not found" RPC error,
// others (as seen in testing) wrap it in a generic internal error with a plain-text message
// like "this request method is not supported" — so we check both the error class and the text.
const BATCH_UNSUPPORTED_ERROR_NAMES = new Set([
  "MethodNotFoundRpcError",
  "MethodNotSupportedRpcError",
  "UnsupportedProviderMethodError",
]);

const BATCH_UNSUPPORTED_TEXT_PATTERNS = [
  "not supported",
  "not implemented",
  "does not exist",
  "unrecognized",
];

function isBatchUnsupportedError(error: unknown): boolean {
  let current = error as { name?: string; message?: string; details?: string; shortMessage?: string; cause?: unknown } | undefined;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (current.name && BATCH_UNSUPPORTED_ERROR_NAMES.has(current.name)) return true;
    const text = `${current.details ?? ""} ${current.shortMessage ?? ""} ${current.message ?? ""}`.toLowerCase();
    if (BATCH_UNSUPPORTED_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) return true;
    current = current.cause as typeof current;
  }
  return false;
}

interface TipCanvasProps { canvasId: bigint; onTipSuccess?: () => void; }

export default function TipCanvas({ canvasId, onTipSuccess }: TipCanvasProps) {
  const [amount, setAmount] = useState("10");
  const { address } = useAccount();
  const { pushToast } = useToast();
  const { data: coinAddress } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "gleeCoin" });
  const { data: tipsOpen } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "openTips" });
  const coin = coinAddress && coinAddress !== "0x0000000000000000000000000000000000000000" ? coinAddress as Address : undefined;
  const { data: symbol = "GLEE" } = useReadContract({ address: coin, abi: erc20Abi, functionName: "symbol", query: { enabled: Boolean(coin) } });
  const { data: decimals = 18 } = useReadContract({ address: coin, abi: erc20Abi, functionName: "decimals", query: { enabled: Boolean(coin) } });
  const parsedAmount = useMemo(() => { try { return parseUnits(amount || "0", decimals); } catch { return BigInt(0); } }, [amount, decimals]);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: coin, abi: erc20Abi, functionName: "allowance", args: address ? [address, GLEE_CONTRACT_ADDRESS] : undefined, query: { enabled: Boolean(coin && address) } });
  const { data: balance, refetch: refetchBalance } = useReadContract({ address: coin, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: Boolean(coin && address) } });
  const needsApproval = !allowance || allowance < parsedAmount;
  const invalidAmount = parsedAmount <= BigInt(0) || (balance !== undefined && parsedAmount > balance);

  // Primary path: one wallet prompt approving + tipping together via EIP-5792 batched calls.
  const { sendCallsAsync, isPending: isBatchSending } = useSendCalls();
  const [batchId, setBatchId] = useState<string | undefined>();
  const [batchUnsupported, setBatchUnsupported] = useState(false);
  const { data: callsStatus } = useCallsStatus({
    id: batchId ?? "",
    query: { enabled: Boolean(batchId), refetchInterval: 1500 },
  });

  // Fallback path for wallets that don't support batched calls: approve, then automatically tip.
  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [pendingAction, setPendingAction] = useState<"approve" | "tip" | null>(null);

  const [tipSent, setTipSent] = useState(false);

  useEffect(() => {
    if (!callsStatus || callsStatus.status !== "CONFIRMED") return;
    const failedReceipt = callsStatus.receipts?.find((receiptItem) => receiptItem.status === "reverted");
    if (failedReceipt) {
      pushToast({ title: "Tip failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    } else {
      setTipSent(true);
      void refetchAllowance();
      void refetchBalance();
      const tipReceipt = callsStatus.receipts?.[callsStatus.receipts.length - 1];
      pushToast({
        title: "Tip sent",
        description: `You tipped ${amount || "0"} ${symbol} on canvas #${canvasId.toString()}.`,
        variant: "success",
        href: tipReceipt ? explorerTxUrl(tipReceipt.transactionHash) : undefined,
        hrefLabel: "View transaction",
      });
      onTipSuccess?.();
    }
    setBatchId(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callsStatus]);

  useEffect(() => {
    if (!receipt.isError) return;
    pushToast({ title: "Transaction failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    setPendingAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isError]);

  useEffect(() => {
    if (!receipt.isSuccess || !pendingAction) return;
    if (pendingAction === "approve") {
      void refetchAllowance().then(() => {
        setPendingAction("tip");
        writeContract({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] });
      });
    } else {
      setTipSent(true);
      setPendingAction(null);
      void refetchBalance();
      pushToast({
        title: "Tip sent",
        description: `You tipped ${amount || "0"} ${symbol} on canvas #${canvasId.toString()}.`,
        variant: "success",
        href: hash ? explorerTxUrl(hash) : undefined,
        hrefLabel: "View transaction",
      });
      onTipSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const handleApproveAndTip = async () => {
    setTipSent(false);
    if (!coin) return;

    if (!batchUnsupported) {
      try {
        const calls = needsApproval
          ? ([
              { to: coin, abi: erc20Abi, functionName: "approve", args: [GLEE_CONTRACT_ADDRESS, parsedAmount] },
              { to: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] },
            ] as const)
          : ([{ to: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] }] as const);
        const id = await sendCallsAsync({ calls });
        setBatchId(id);
        return;
      } catch (error) {
        if (isBatchUnsupportedError(error)) {
          setBatchUnsupported(true);
          // fall through to the sequential path below
        } else {
          console.error("Batched approve+tip failed:", error);
          pushToast({ title: "Tip failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
          return;
        }
      }
    }

    // Sequential fallback — still just one click to start; approve auto-chains into tip once confirmed.
    if (needsApproval) {
      setPendingAction("approve");
      writeContract({ address: coin, abi: erc20Abi, functionName: "approve", args: [GLEE_CONTRACT_ADDRESS, parsedAmount] });
    } else {
      setPendingAction("tip");
      writeContract({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] });
    }
  };

  const handleClaimTestTokens = () => writeContract({ address: coin!, abi: erc20Abi, functionName: "issueToken" });

  const busy = isBatchSending || Boolean(batchId) || isWritePending || receipt.isLoading || pendingAction !== null;

  if (!address) return <p className="mt-4 text-sm text-[var(--foreground-muted)]">Connect your wallet to leave a GLEE tip.</p>;
  if (!coin) return <p className="mt-4 text-sm text-[var(--accent)]">Tips are not configured for this GLEE contract yet.</p>;
  if (!tipsOpen) return <p className="mt-4 text-sm text-[var(--accent)]">Tipping is not open yet.</p>;

  return <div className="mt-4 border-t border-[var(--border-hairline)] pt-4">
    <label className="studio-label">Tip amount</label>
    <div className="mt-2 flex gap-2">
      <input aria-label="Tip amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={tipSent} className="studio-input mt-0 min-w-0" />
      <span className="grid place-items-center border border-[var(--border-hairline)] px-3 text-sm text-[var(--foreground-muted)]">{symbol}</span>
    </div>
    {balance !== undefined && <p className="mt-2 text-xs text-[var(--foreground-muted)]">Available: {formatUnits(balance, decimals)} {symbol}</p>}
    {balance === BigInt(0) && (
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleClaimTestTokens} disabled={busy} className="quiet-button mt-3 w-full py-3 text-sm">
        {busy ? "Confirming…" : "Claim test tokens"}
      </motion.button>
    )}
    {invalidAmount && <p className="mt-2 text-xs text-[#c17a72]">Enter a positive amount within your available balance.</p>}
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleApproveAndTip}
      disabled={busy || invalidAmount || tipSent}
      className="quiet-button quiet-button--filled mt-3 w-full py-3 text-sm"
    >
      {tipSent
        ? "Tip sent"
        : busy
        ? pendingAction === "approve"
          ? "Approving…"
          : "Confirming…"
        : needsApproval
          ? `Approve & tip ${amount || "0"} ${symbol}`
          : `Tip ${amount || "0"} ${symbol}`}
    </motion.button>
  </div>;
}
*/

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useSendCalls, useCallsStatus } from "wagmi/experimental";
import { GLEE_CONTRACT_ADDRESS, pixelatedDelightsABI } from "../../utils/contractAbi";
import { explorerTxUrl } from "../../utils/explorer";

import { useToast } from "../Toast/ToastProvider";
import GleeTokenNotice from "../GleeTokenNotice/GleeTokenNotice";


const erc20Abi = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "issueToken", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const gleeAbi = [
  { type: "function", name: "gleeCoin", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "openTips", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;

// Errors a wallet throws when it doesn't understand `wallet_sendCalls` (EIP-5792) at all —
// as opposed to the user rejecting the request, which should NOT trigger a fallback.
// Wallets are inconsistent here: some throw a properly-coded "method not found" RPC error,
// others (as seen in testing) wrap it in a generic internal error with a plain-text message
// like "this request method is not supported" — so we check both the error class and the text.
const BATCH_UNSUPPORTED_ERROR_NAMES = new Set([
  "MethodNotFoundRpcError",
  "MethodNotSupportedRpcError",
  "UnsupportedProviderMethodError",
]);

const BATCH_UNSUPPORTED_TEXT_PATTERNS = [
  "not supported",
  "not implemented",
  "does not exist",
  "unrecognized",
];

function isBatchUnsupportedError(error: unknown): boolean {
  let current = error as { name?: string; message?: string; details?: string; shortMessage?: string; cause?: unknown } | undefined;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (current.name && BATCH_UNSUPPORTED_ERROR_NAMES.has(current.name)) return true;
    const text = `${current.details ?? ""} ${current.shortMessage ?? ""} ${current.message ?? ""}`.toLowerCase();
    if (BATCH_UNSUPPORTED_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) return true;
    current = current.cause as typeof current;
  }
  return false;
}

interface TipCanvasProps { canvasId: bigint; onTipSuccess?: () => void; }

export default function TipCanvas({ canvasId, onTipSuccess }: TipCanvasProps) {
  const [amount, setAmount] = useState("10");
  const { address } = useAccount();
  const { pushToast } = useToast();
  const { data: coinAddress } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "gleeCoin" });
  const { data: tipsOpen } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "openTips" });
  const coin = coinAddress && coinAddress !== "0x0000000000000000000000000000000000000000" ? coinAddress as Address : undefined;
  const { data: symbol = "GLEE" } = useReadContract({ address: coin, abi: erc20Abi, functionName: "symbol", query: { enabled: Boolean(coin) } });
  const { data: decimals = 18 } = useReadContract({ address: coin, abi: erc20Abi, functionName: "decimals", query: { enabled: Boolean(coin) } });
  const parsedAmount = useMemo(() => { try { return parseUnits(amount || "0", decimals); } catch { return BigInt(0); } }, [amount, decimals]);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: coin, abi: erc20Abi, functionName: "allowance", args: address ? [address, GLEE_CONTRACT_ADDRESS] : undefined, query: { enabled: Boolean(coin && address) } });
  const { data: balance, refetch: refetchBalance } = useReadContract({ address: coin, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: Boolean(coin && address) } });
  const needsApproval = !allowance || allowance < parsedAmount;
  const invalidAmount = parsedAmount <= BigInt(0) || (balance !== undefined && parsedAmount > balance);

  // Primary path: one wallet prompt approving + tipping together via EIP-5792 batched calls.
  const { sendCallsAsync, isPending: isBatchSending } = useSendCalls();
  const [batchId, setBatchId] = useState<string | undefined>();
  const [batchUnsupported, setBatchUnsupported] = useState(false);
  const { data: callsStatus } = useCallsStatus({
    id: batchId ?? "",
    query: { enabled: Boolean(batchId), refetchInterval: 1500 },
  });

  // Fallback path for wallets that don't support batched calls: approve, then automatically tip.
  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [pendingAction, setPendingAction] = useState<"approve" | "tip" | null>(null);

  const [tipSent, setTipSent] = useState(false);

  useEffect(() => {
    if (!callsStatus || callsStatus.status !== "CONFIRMED") return;
    const failedReceipt = callsStatus.receipts?.find((receiptItem) => receiptItem.status === "reverted");
    if (failedReceipt) {
      pushToast({ title: "Tip failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    } else {
      setTipSent(true);
      void refetchAllowance();
      void refetchBalance();
      const tipReceipt = callsStatus.receipts?.[callsStatus.receipts.length - 1];
      pushToast({
        title: "Tip sent",
        description: `You tipped ${amount || "0"} ${symbol} on canvas #${canvasId.toString()}.`,
        variant: "success",
        href: tipReceipt ? explorerTxUrl(tipReceipt.transactionHash) : undefined,
        hrefLabel: "View transaction",
      });
      onTipSuccess?.();
    }
    setBatchId(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callsStatus]);

  useEffect(() => {
    if (!receipt.isError) return;
    pushToast({ title: "Transaction failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
    setPendingAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isError]);

  useEffect(() => {
    if (!receipt.isSuccess || !pendingAction) return;
    if (pendingAction === "approve") {
      void refetchAllowance().then(() => {
        setPendingAction("tip");
        writeContract({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] });
      });
    } else {
      setTipSent(true);
      setPendingAction(null);
      void refetchBalance();
      pushToast({
        title: "Tip sent",
        description: `You tipped ${amount || "0"} ${symbol} on canvas #${canvasId.toString()}.`,
        variant: "success",
        href: hash ? explorerTxUrl(hash) : undefined,
        hrefLabel: "View transaction",
      });
      onTipSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const handleApproveAndTip = async () => {
    setTipSent(false);
    if (!coin) return;

    if (!batchUnsupported) {
      try {
        const calls = needsApproval
          ? ([
              { to: coin, abi: erc20Abi, functionName: "approve", args: [GLEE_CONTRACT_ADDRESS, parsedAmount] },
              { to: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] },
            ] as const)
          : ([{ to: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] }] as const);
        const id = await sendCallsAsync({ calls });
        setBatchId(id);
        return;
      } catch (error) {
        if (isBatchUnsupportedError(error)) {
          setBatchUnsupported(true);
          // fall through to the sequential path below
        } else {
          console.error("Batched approve+tip failed:", error);
          pushToast({ title: "Tip failed", description: "The transaction did not complete. Check your wallet and try again.", variant: "error" });
          return;
        }
      }
    }

    // Sequential fallback — still just one click to start; approve auto-chains into tip once confirmed.
    if (needsApproval) {
      setPendingAction("approve");
      writeContract({ address: coin, abi: erc20Abi, functionName: "approve", args: [GLEE_CONTRACT_ADDRESS, parsedAmount] });
    } else {
      setPendingAction("tip");
      writeContract({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] });
    }
  };

  const handleClaimTestTokens = () => writeContract({ address: coin!, abi: erc20Abi, functionName: "issueToken" });

  const busy = isBatchSending || Boolean(batchId) || isWritePending || receipt.isLoading || pendingAction !== null;

  if (!address) return <p className="mt-4 text-sm text-[var(--foreground-muted)]">Connect your wallet to leave a GLEE tip.</p>;
  if (!coin) return <p className="mt-4 text-sm text-[var(--accent)]">Tips are not configured for this GLEE contract yet.</p>;
  if (!tipsOpen) return <p className="mt-4 text-sm text-[var(--accent)]">Tipping is not open yet.</p>;

  return <div className="mt-4 border-t border-[var(--border-hairline)] pt-4">
    <GleeTokenNotice variant="inline" className="mb-3" />
    <label className="studio-label">Tip amount</label>
    <div className="mt-2 flex gap-2">
      <input aria-label="Tip amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={tipSent} className="studio-input mt-0 min-w-0" />
      <span className="grid place-items-center border border-[var(--border-hairline)] px-3 text-sm text-[var(--foreground-muted)]">{symbol}</span>
    </div>
    {balance !== undefined && <p className="mt-2 text-xs text-[var(--foreground-muted)]">Available: {formatUnits(balance, decimals)} {symbol}</p>}
    {balance === BigInt(0) && (
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleClaimTestTokens} disabled={busy} className="quiet-button mt-3 w-full py-3 text-sm">
        {busy ? "Confirming…" : "Claim test tokens"}
      </motion.button>
    )}
    {invalidAmount && <p className="mt-2 text-xs text-[#c17a72]">Enter a positive amount within your available balance.</p>}
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleApproveAndTip}
      disabled={busy || invalidAmount || tipSent}
      className="quiet-button quiet-button--filled mt-3 w-full py-3 text-sm"
    >
      {tipSent
        ? "Tip sent"
        : busy
        ? pendingAction === "approve"
          ? "Approving…"
          : "Confirming…"
        : needsApproval
          ? `Approve & tip ${amount || "0"} ${symbol}`
          : `Tip ${amount || "0"} ${symbol}`}
    </motion.button>
  </div>;
}