import { createPublicClient, decodeFunctionData, http, zeroAddress } from "viem";
import { gleeABI, GLEE_CONTRACT_ADDRESS, GLEE_V2_CONTRACT_ADDRESS, gleeV2ABI } from "@/utils/contractAbi";
import { baseSepolia, BASE_SEPOLIA_RPC_URL } from "@/utils/chain";

const client = createPublicClient({ chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC_URL) });
const contracts = [GLEE_CONTRACT_ADDRESS.toLowerCase(), GLEE_V2_CONTRACT_ADDRESS.toLowerCase()];

export async function verifyMintTransaction(hash: `0x${string}`, wallet: string) {
  const tx = await client.getTransaction({ hash });
  if (!tx.to || !contracts.includes(tx.to.toLowerCase())) return null;
  if (tx.from.toLowerCase() !== wallet.toLowerCase()) return null;

  let functionName: "mintCanvas" | "mintWhitelist";
  let quantity: bigint;
  try {
    const decoded = decodeFunctionData({ abi: gleeV2ABI, data: tx.input });
    if (decoded.functionName !== "mintCanvas" && decoded.functionName !== "mintWhitelist") return null;
    functionName = decoded.functionName;
    quantity = decoded.args[0] as bigint;
  } catch {
    const decoded = decodeFunctionData({ abi: gleeABI, data: tx.input });
    if (decoded.functionName !== "mintCanvas" && decoded.functionName !== "mintWhitelist") return null;
    functionName = decoded.functionName;
    quantity = decoded.args[0] as bigint;
  }

  const receipt = await client.getTransactionReceipt({ hash });
  if (receipt.status !== "success") return null;

  const mintedCount = receipt.logs.filter((log) => {
    const topics = log.topics;
    return log.address.toLowerCase() === tx.to!.toLowerCase() && topics[0]?.toLowerCase() === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a06e3f22a1" &&
      topics[1]?.toLowerCase().endsWith(zeroAddress.slice(2).toLowerCase()) &&
      topics[2]?.toLowerCase().endsWith(wallet.slice(2).toLowerCase());
  }).length;

  if (mintedCount === 0 || BigInt(mintedCount) !== quantity) return null;

  return {
    transactionHash: hash,
    contractAddress: tx.to,
    quantity: mintedCount,
    mintType: functionName === "mintWhitelist" ? ("whitelist" as const) : ("public" as const),
  };
}
