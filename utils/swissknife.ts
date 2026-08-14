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