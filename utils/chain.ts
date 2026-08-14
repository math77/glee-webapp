import { baseSepolia } from "viem/chains";
import type { Chain } from "viem";

export const robinhoodChain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
    public: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
} as const satisfies Chain;

export const ROBINHOOD_CHAIN_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

export { baseSepolia };
const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID;
export const BASE_SEPOLIA_RPC_URL = alchemyId
  ? `https://base-sepolia.g.alchemy.com/v2/${alchemyId}`
  : "https://sepolia.base.org";
