"use client";

import { useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { GLEE_CONTRACT_ADDRESS, pixelatedDelightsABI } from "../../../utils/contractAbi";

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

interface TipCanvasProps { canvasId: bigint; }

export default function TipCanvas({ canvasId }: TipCanvasProps) {
  const [amount, setAmount] = useState("10");
  const { address } = useAccount();
  const { data: coinAddress } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "gleeCoin" });
  const { data: tipsOpen } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "openTips" });
  const coin = coinAddress && coinAddress !== "0x0000000000000000000000000000000000000000" ? coinAddress as Address : undefined;
  const { data: symbol = "GLEE" } = useReadContract({ address: coin, abi: erc20Abi, functionName: "symbol", query: { enabled: Boolean(coin) } });
  const { data: decimals = 18 } = useReadContract({ address: coin, abi: erc20Abi, functionName: "decimals", query: { enabled: Boolean(coin) } });
  const parsedAmount = useMemo(() => { try { return parseUnits(amount || "0", decimals); } catch { return BigInt(0); } }, [amount, decimals]);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: coin, abi: erc20Abi, functionName: "allowance", args: address ? [address, GLEE_CONTRACT_ADDRESS] : undefined, query: { enabled: Boolean(coin && address) } });
  const { data: balance } = useReadContract({ address: coin, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, query: { enabled: Boolean(coin && address) } });
  const { data: hash, writeContract, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const needsApproval = !allowance || allowance < parsedAmount;
  const invalidAmount = parsedAmount <= BigInt(0) || (balance !== undefined && parsedAmount > balance);
  const busy = isPending || receipt.isLoading;

  const handleApprove = () => writeContract({ address: coin!, abi: erc20Abi, functionName: "approve", args: [GLEE_CONTRACT_ADDRESS, parsedAmount] }, { onSuccess: () => void refetchAllowance() });
  const handleTip = () => writeContract({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "tipCanvas", args: [canvasId, parsedAmount] });
  const handleClaimTestTokens = () => writeContract({ address: coin!, abi: erc20Abi, functionName: "issueToken" });

  if (!address) return <p className="mt-4 text-sm text-slate-400">Connect your wallet to leave a GLEE tip.</p>;
  if (!coin) return <p className="mt-4 text-sm text-amber-300">Tips are not configured for this GLEE contract yet.</p>;
  if (!tipsOpen) return <p className="mt-4 text-sm text-amber-300">Tipping is not open yet.</p>;

  return <div className="mt-4 border-t border-white/10 pt-4">
    <label className="studio-label">Tip amount</label>
    <div className="mt-2 flex gap-2"><input aria-label="Tip amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="studio-input mt-0 min-w-0" /><span className="grid place-items-center border border-white/15 px-3 text-sm text-[#a8f85b]">{symbol}</span></div>
    {balance !== undefined && <p className="mt-2 text-xs text-slate-500">Available: {formatUnits(balance, decimals)} {symbol}</p>}
    {balance === BigInt(0) && <button onClick={handleClaimTestTokens} disabled={busy} className="mt-3 w-full border border-[#f8d65d]/60 bg-[#f8d65d]/10 px-4 py-3 text-sm font-bold text-[#f8d65d] disabled:cursor-not-allowed">{busy ? "CONFIRMING…" : "CLAIM TEST TOKENS"}</button>}
    {invalidAmount && <p className="mt-2 text-xs text-rose-300">Enter a positive amount within your available balance.</p>}
    <button onClick={needsApproval ? handleApprove : handleTip} disabled={busy || invalidAmount} className="mt-3 w-full bg-[#a8f85b] px-4 py-3 text-sm font-bold text-[#08101c] shadow-[3px_3px_0_rgba(0,0,0,.28)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">
      {busy ? "CONFIRMING…" : needsApproval ? `APPROVE ${symbol}` : `TIP ${amount || "0"} ${symbol}`}
    </button>
    {receipt.isSuccess && <p className="mt-3 text-sm text-[#a8f85b]">Tip sent — thank you for supporting this creation.</p>}
    {receipt.isError && <p className="mt-3 text-sm text-rose-300">The transaction did not complete. Check your wallet and try again.</p>}
  </div>;
}
