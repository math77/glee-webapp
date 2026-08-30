/*
export function generateRandomFilename(fileExtension: string): string {
  const randomNumber = Math.floor(Math.random() * 1000000); // Generates a random number
  return `image${randomNumber}.${fileExtension}`;
};

import { ColorPlacement } from "@/types";

// Function to convert hex color to uint256
function hexToUint256(hexColor: string): bigint {
  // Remove # if present
  const cleanHex = hexColor.replace(/^#/, '');
  // Convert hex to bigint
  return BigInt(`0x${cleanHex}`);
}


function setPixel(data: bigint, x: number, y: number, color: number): bigint {
  const index = (y * 9) + x; // Find pixel position in 9x9 grid
  const shift = BigInt(index * 3); // 3 bits per pixel
    
  return (data & ~(BigInt(7) << shift)) | (BigInt(color) << shift);
}


export function convertCanvasForContractArtwork(colorPlacements: ColorPlacement[]): { artworkData: bigint } {
  
  let artData: bigint = BigInt(0);

  colorPlacements.forEach(placement => {
    
    artData = setPixel(artData, placement.x, placement.y, placement.colorIndex);
    
  });
  
  return {
    artworkData: artData
  }
}

// --- V2: 11-color palette, 4 bits per pixel, split across two uint256s ---
// Mirrors GLEEV2Metadata.generateSVG exactly: pixels 0-63 (64 pixels x 4 bits = 256 bits,
// an exact fit) live in artData1; pixels 64-80 (17 pixels) live in the low bits of artData2.
// Keep this in sync with the Solidity side if the split point or bit width ever changes.
const V2_BITS_PER_PIXEL = 4;
const V2_PIXEL_MASK = BigInt(0x0F);
const V2_SPLIT_INDEX = 64;

// Indices 0-10 are UNCHANGED from what you already deployed and tested — do not reorder
// these, the contract's COLOR_PALETTE array is fixed at these exact positions. New colors
// are appended at the end (11-13) rather than inserted, which is why the gated set below
// isn't a simple contiguous range.
export const V2_COLOR_PALETTE: string[] = [
  '#FFFFFF', // 0  - Paper    (basic)
  '#06BA63', // 1  - Emerald  (basic)
  '#FFC0CB', // 2  - Blush    (basic)
  '#FF0000', // 3  - Poppy    (basic)
  '#000000', // 4  - Ink      (basic)
  '#0052FF', // 5  - Cobalt   (basic)
  '#EAC70D', // 6  - Gold     (basic)
  '#FC7A1E', // 7  - Amber    (basic)
  '#2E1D20', // 8  - Umber    (gated)
  '#FA2FBA', // 9  - Orchid   (gated)
  '#8B1EC9', // 10 - Amethyst (gated)
  '#9B9B9B', // 11 - Stone    (basic) — new
  '#12A5A0', // 12 - Teal     (basic) — new
  '#C9A227', // 13 - Bullion  (gated) — new
];

// Token-gated indices. Not a contiguous range — Stone/Teal (basic) were appended after
// Umber/Orchid/Amethyst (gated), so this has to be an explicit set, not a cutoff.
export const V2_GATED_COLOR_INDICES: number[] = [8, 9, 10, 13];

function setPixelV2(data: bigint, localIndex: number, colorIndex: number): bigint {
  const shift = BigInt(localIndex * V2_BITS_PER_PIXEL);
  return (data & ~(V2_PIXEL_MASK << shift)) | (BigInt(colorIndex) << shift);
}

export function convertCanvasForContractArtworkV2(colorPlacements: ColorPlacement[]): { artworkData1: bigint; artworkData2: bigint } {
  let artData1: bigint = BigInt(0);
  let artData2: bigint = BigInt(0);

  colorPlacements.forEach((placement) => {
    const index = placement.y * 9 + placement.x; // same convention as V1's setPixel
    if (index < V2_SPLIT_INDEX) {
      artData1 = setPixelV2(artData1, index, placement.colorIndex);
    } else {
      artData2 = setPixelV2(artData2, index - V2_SPLIT_INDEX, placement.colorIndex);
    }
  });

  return { artworkData1: artData1, artworkData2: artData2 };
}

// Decodes a V2 (artData1, artData2) pair into the same SVG markup GLEEV2Metadata.generateSVG
// produces on-chain — bit-for-bit the same shifts, masks, and background fill. Lets you verify
// the encoder round-trips correctly (encode -> decode -> compare) entirely client-side, before
// a single transaction is ever sent.
export function decodeArtworkDataV2ToSVG(artData1: bigint, artData2: bigint): string {
  const PIXEL_SIZE = 20;
  let rects = '';

  for (let i = 0; i < 81; i++) {
    const x = i % 9;
    const y = Math.floor(i / 9);

    let colorIndex: number;
    if (i < V2_SPLIT_INDEX) {
      colorIndex = Number((artData1 >> BigInt(i * V2_BITS_PER_PIXEL)) & V2_PIXEL_MASK);
    } else {
      const localIndex = i - V2_SPLIT_INDEX;
      colorIndex = Number((artData2 >> BigInt(localIndex * V2_BITS_PER_PIXEL)) & V2_PIXEL_MASK);
    }

    if (colorIndex < V2_COLOR_PALETTE.length) {
      rects += `<rect x='${x * PIXEL_SIZE}' y='${y * PIXEL_SIZE}' width='${PIXEL_SIZE}' height='${PIXEL_SIZE}' fill='${V2_COLOR_PALETTE[colorIndex]}' />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#f8f5f0" />${rects}</svg>`;
}
*/

export function generateRandomFilename(fileExtension: string): string {
  const randomNumber = Math.floor(Math.random() * 1000000); // Generates a random number
  return `image${randomNumber}.${fileExtension}`;
};

import { ColorPlacement } from "@/types";

// Function to convert hex color to uint256
function hexToUint256(hexColor: string): bigint {
  // Remove # if present
  const cleanHex = hexColor.replace(/^#/, '');
  // Convert hex to bigint
  return BigInt(`0x${cleanHex}`);
}


function setPixel(data: bigint, x: number, y: number, color: number): bigint {
  const index = (y * 9) + x; // Find pixel position in 9x9 grid
  const shift = BigInt(index * 3); // 3 bits per pixel
    
  return (data & ~(BigInt(7) << shift)) | (BigInt(color) << shift);
}


export function convertCanvasForContractArtwork(colorPlacements: ColorPlacement[]): { artworkData: bigint } {
  
  let artData: bigint = BigInt(0);

  colorPlacements.forEach(placement => {
    
    artData = setPixel(artData, placement.x, placement.y, placement.colorIndex);
    
  });
  
  return {
    artworkData: artData
  }
}

// --- V2: 11-color palette, 4 bits per pixel, split across two uint256s ---
// Mirrors GLEEV2Metadata.generateSVG exactly: pixels 0-63 (64 pixels x 4 bits = 256 bits,
// an exact fit) live in artData1; pixels 64-80 (17 pixels) live in the low bits of artData2.
// Keep this in sync with the Solidity side if the split point or bit width ever changes.
const V2_BITS_PER_PIXEL = 4;
const V2_PIXEL_MASK = BigInt(0x0F);
const V2_SPLIT_INDEX = 64;

// Indices 0-10 are UNCHANGED from what you already deployed and tested — do not reorder
// these, the contract's COLOR_PALETTE array is fixed at these exact positions. New colors
// are appended at the end (11-13) rather than inserted, which is why the gated set below
// isn't a simple contiguous range.
export const V2_COLOR_PALETTE: string[] = [
  '#FFFFFF', // 0  - Paper    (basic)
  '#06BA63', // 1  - Emerald  (basic)
  '#FFC0CB', // 2  - Blush    (basic)
  '#FF0000', // 3  - Poppy    (basic)
  '#000000', // 4  - Ink      (basic)
  '#0052FF', // 5  - Cobalt   (basic)
  '#EAC70D', // 6  - Gold     (basic)
  '#FC7A1E', // 7  - Amber    (basic)
  '#2E1D20', // 8  - Umber    (gated)
  '#FA2FBA', // 9  - Orchid   (gated)
  '#8B1EC9', // 10 - Amethyst (gated)
  '#9B9B9B', // 11 - Stone    (basic) — new
  '#12A5A0', // 12 - Teal     (basic) — new
  '#C9A227', // 13 - Bullion  (gated) — new
];

// Token-gated indices. Not a contiguous range — Stone/Teal (basic) were appended after
// Umber/Orchid/Amethyst (gated), so this has to be an explicit set, not a cutoff.
export const V2_GATED_COLOR_INDICES: number[] = [8, 9, 10, 13];

// TODO: placeholder thresholds — replace with the real amounts once decided. Keyed by V2
// palette index; every key here must also appear in V2_GATED_COLOR_INDICES. Ordered roughly
// by rarity of the color itself (Bullion highest, matching its "premium" positioning).
export const V2_GATED_COLOR_REQUIREMENTS: Record<number, number> = {
  8: 10_000,     // Umber
  9: 50_000,     // Orchid
  10: 250_000,   // Amethyst
  13: 1_000_000, // Bullion
};

// Formats a raw GLEE amount as a compact "10K" / "1M" style string for tooltips/labels.
export function formatGleeAmount(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }
  return amount.toLocaleString();
}

function setPixelV2(data: bigint, localIndex: number, colorIndex: number): bigint {
  const shift = BigInt(localIndex * V2_BITS_PER_PIXEL);
  return (data & ~(V2_PIXEL_MASK << shift)) | (BigInt(colorIndex) << shift);
}

export function convertCanvasForContractArtworkV2(colorPlacements: ColorPlacement[]): { artworkData1: bigint; artworkData2: bigint } {
  let artData1: bigint = BigInt(0);
  let artData2: bigint = BigInt(0);

  colorPlacements.forEach((placement) => {
    const index = placement.y * 9 + placement.x; // same convention as V1's setPixel
    if (index < V2_SPLIT_INDEX) {
      artData1 = setPixelV2(artData1, index, placement.colorIndex);
    } else {
      artData2 = setPixelV2(artData2, index - V2_SPLIT_INDEX, placement.colorIndex);
    }
  });

  return { artworkData1: artData1, artworkData2: artData2 };
}

// Decodes a V2 (artData1, artData2) pair into the same SVG markup GLEEV2Metadata.generateSVG
// produces on-chain — bit-for-bit the same shifts, masks, and background fill. Lets you verify
// the encoder round-trips correctly (encode -> decode -> compare) entirely client-side, before
// a single transaction is ever sent.
export function decodeArtworkDataV2ToSVG(artData1: bigint, artData2: bigint): string {
  const PIXEL_SIZE = 20;
  let rects = '';

  for (let i = 0; i < 81; i++) {
    const x = i % 9;
    const y = Math.floor(i / 9);

    let colorIndex: number;
    if (i < V2_SPLIT_INDEX) {
      colorIndex = Number((artData1 >> BigInt(i * V2_BITS_PER_PIXEL)) & V2_PIXEL_MASK);
    } else {
      const localIndex = i - V2_SPLIT_INDEX;
      colorIndex = Number((artData2 >> BigInt(localIndex * V2_BITS_PER_PIXEL)) & V2_PIXEL_MASK);
    }

    if (colorIndex < V2_COLOR_PALETTE.length) {
      rects += `<rect x='${x * PIXEL_SIZE}' y='${y * PIXEL_SIZE}' width='${PIXEL_SIZE}' height='${PIXEL_SIZE}' fill='${V2_COLOR_PALETTE[colorIndex]}' />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#f8f5f0" />${rects}</svg>`;
}