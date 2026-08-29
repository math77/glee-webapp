// Shared block explorer link helpers. Robinhood Chain's Blockscout instance is the one
// explorer already referenced elsewhere in this app (see the "View on OpenSea" link in
// LegacyStudio's status modal, which despite the label actually points here too).
const EXPLORER_BASE_URL = "https://robinhoodchain.blockscout.com";

export const explorerTxUrl = (hash: string) => `${EXPLORER_BASE_URL}/tx/${hash}`;
export const explorerTokenUrl = (contract: string, tokenId: string | number) => `${EXPLORER_BASE_URL}/token/${contract}/instance/${tokenId}`;