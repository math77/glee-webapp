export function generateRandomFilename(fileExtension: string): string {
  const randomNumber = Math.floor(Math.random() * 1000000);
  return `image${randomNumber}.${fileExtension}`;
}

import { ColorPlacement } from "@/types";

function setPixel(data: bigint, x: number, y: number, color: number): bigint {
  const index = (y * 9) + x;
  const shift = BigInt(index * 3);
  return (data & ~(BigInt(7) << shift)) | (BigInt(color) << shift);
}

export function convertCanvasForContractArtwork(colorPlacements: ColorPlacement[]): { artworkData: bigint } {
  let artData: bigint = BigInt(0);
  colorPlacements.forEach(placement => {
    artData = setPixel(artData, placement.x, placement.y, placement.colorIndex);
  });
  return { artworkData: artData };
}

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
  '#2E1D20', // 8  - Umber    ()
  '#FA2FBA', // 9  - Orchid   ()
  '#8B1EC9', // 10 - Amethyst ()
  '#9B9B9B', // 11 - Stone    (basic) — new
  '#12A5A0', // 12 - Teal     (basic) — new
  '#C9A227', // 13 - Bullion  () — new
];


function setPixelV2(data: bigint, localIndex: number, colorIndex: number): bigint {
  const shift = BigInt(localIndex * V2_BITS_PER_PIXEL);
  return (data & ~(V2_PIXEL_MASK << shift)) | (BigInt(colorIndex) << shift);
}

export function convertCanvasForContractArtworkV2(colorPlacements: ColorPlacement[]): { artworkData1: bigint; artworkData2: bigint } {
  let artData1: bigint = BigInt(0);
  let artData2: bigint = BigInt(0);

  colorPlacements.forEach((placement) => {
    const index = placement.y * 9 + placement.x;
    if (index < V2_SPLIT_INDEX) artData1 = setPixelV2(artData1, index, placement.colorIndex);
    else artData2 = setPixelV2(artData2, index - V2_SPLIT_INDEX, placement.colorIndex);
  });

  return { artworkData1: artData1, artworkData2: artData2 };
}

export function decodeArtworkDataV2ToSVG(artData1: bigint, artData2: bigint): string {
  const PIXEL_SIZE = 20;
  let rects = '';

  for (let i = 0; i < 81; i++) {
    const x = i % 9;
    const y = Math.floor(i / 9);
    const colorIndex = i < V2_SPLIT_INDEX
      ? Number((artData1 >> BigInt(i * V2_BITS_PER_PIXEL)) & V2_PIXEL_MASK)
      : Number((artData2 >> BigInt((i - V2_SPLIT_INDEX) * V2_BITS_PER_PIXEL)) & V2_PIXEL_MASK);

    if (colorIndex < V2_COLOR_PALETTE.length) {
      rects += `<rect x='${x * PIXEL_SIZE}' y='${y * PIXEL_SIZE}' width='${PIXEL_SIZE}' height='${PIXEL_SIZE}' fill='${V2_COLOR_PALETTE[colorIndex]}' />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#f8f5f0" />${rects}</svg>`;
}
