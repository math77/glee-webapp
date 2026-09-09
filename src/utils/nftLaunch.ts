// Flip this to true once the NFT collection launches (a few days after $GLEE).
// Every notice below, and the Studio gate in the Studio component, reads this constant.
export const NFT_MINT_LAUNCHED = true;

// Set this once a mint date is locked in, e.g. new Date("2026-09-01T17:00:00Z").
// Leave it null until then — NFT_NOT_LAUNCHED_MESSAGE below falls back to generic
// copy automatically, and every place that shows that message updates on its own.
export const NFT_MINT_DATE: Date | null = null;
//export const NFT_MINT_DATE: Date | null = new Date("2026-09-01T17:00:00Z");

function formatMintDate(date: Date) {
  // Explicit locale + UTC timezone so this renders identically on the server and the
  // client — leaving either unset risks a hydration mismatch if they ever differ.
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const NFT_NOT_LAUNCHED_MESSAGE = NFT_MINT_DATE
  ? `Minting opens ${formatMintDate(NFT_MINT_DATE)}. The studio opens shortly after.`
  : "The NFT collection hasn't launched yet. Minting and the studio open a few days after $GLEE.";

// The contract currently has no on-chain max-supply read to pull this from — hardcode it
// here until one exists, so there's a single place to update when that changes.
export const NFT_MAX_SUPPLY = 3100;
export const NFT_PUBLIC_SUPPLY = 3000;