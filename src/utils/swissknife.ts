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
 
// Same 8 colors as V1, in the same order (so any shared indexing stays valid), plus 3 new ones.
export const V2_COLOR_PALETTE: string[] = [
  '#FFFFFF', // 0 - Paper
  '#06BA63', // 1 - Emerald
  '#FFC0CB', // 2 - Blush
  '#FF0000', // 3 - Poppy
  '#000000', // 4 - Ink
  '#0052FF', // 5 - Cobalt
  '#EAC70D', // 6 - Gold
  '#FC7A1E', // 7 - Amber
  '#2E1D20', // 8 - new
  '#FA2FBA', // 9 - new
  '#8B1EC9', // 10 - new
];
 
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



/*
export function convertCanvasForContractUpload(
    colorPlacements: ColorPlacement[],
    title: string = "",
    description: string = ""
  ): {
    rows: [number, number, number, number, number, number, number, number, number];
    palette: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
    paletteSize: number;
    title: string;
    description: string;
  } {
    // Create a 9x9 grid to track placements
    const grid: (ColorPlacement | null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
    
    // Populate the grid
    colorPlacements.forEach(placement => {
      if (placement.x >= 0 && placement.x < 9 && placement.y >= 0 && placement.y < 9) {
        grid[placement.y][placement.x] = placement;
      }
    });
  
    // Extract all colors used in the canvas and create a palette
    const colorSet = new Set<string>();
    
    // Collect all unique colors
    grid.forEach(row => {
      row.forEach(placement => {
        if (placement) {
          colorSet.add(placement.color);
        }
      });
    });
  
    // Convert to array and map to uint256
    const colorArray = Array.from(colorSet).map(hexToUint256);
    
    // Check if too many colors
    if (colorArray.length > 16) {
      throw new Error("Canvas uses more than 16 colors. Maximum allowed is 16.");
    }
  
    // Create palette with 16 slots, filled with zeros
    const palette: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] =
      Array(16).fill(BigInt(0)) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
    
    colorArray.forEach((color, index) => {
      palette[index] = color;
    });
  
    // Create row data
    const rows: [number, number, number, number, number, number, number, number, number] =
      Array(9).fill(0) as [number, number, number, number, number, number, number, number, number];
    
    // Create color to index mapping
    const colorToIndexMap = new Map(
      colorArray.map((color, index) => [color.toString(), index + 1]) // Start index from 1
    );
  
    // Encode rows
    for (let y = 0; y < 9; y++) {
      let rowValue = 0;
      for (let x = 0; x < 9; x++) {
        const placement = grid[y][x];
        if (placement) {
          // Find color index
          const colorIndex = colorToIndexMap.get(
            hexToUint256(placement.color).toString()
          );
          
          // Encode color index if found
          if (colorIndex !== undefined) {
            rowValue |= (colorIndex << (x * 4)); // Direct x-axis encoding
          }
        }
      }
      
      // Ensure 16-bit unsigned integer range
      rows[y] = rowValue & 0xFFFF;
    }
  
    return {
      rows,
      palette,
      paletteSize: colorArray.length,
      title,
      description
    };
  }

  */