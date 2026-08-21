import "server-only";
import { createPublicClient, http } from "viem";

import { baseSepolia, BASE_SEPOLIA_RPC_URL } from "./chain";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "./contractAbi";

// Server-side reads for metadata/OG-image generation, which run outside any React tree —
// wagmi's hooks aren't available here, so this uses viem directly against the same chain
// Web3Provider.tsx actually configures (Base Sepolia; the "Robinhood Chain" config in
// utils/chain.ts exists but isn't the one wired into the live wagmi setup).
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC_URL),
});

export interface CanvasMetadata {
  id: string;
  title: string;
  description: string;
  svg: string;
}

export async function getCanvasForMetadata(id: string): Promise<CanvasMetadata | null> {
  try {
    const canvasId = BigInt(id);
    const canvas = await publicClient.readContract({
      address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
      abi: pixelatedDelightsABI,
      functionName: "getCanvas",
      args: [canvasId],
    });

    if (!canvas.painted) return null;

    const svg = await publicClient.readContract({
      address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
      abi: pixelatedDelightsABI,
      functionName: "getCanvasAsSVG",
      args: [canvas.artwork.artData],
    });

    return {
      id,
      title: canvas.artwork.title || `Canvas #${id}`,
      description: canvas.artwork.description || "A tiny onchain masterpiece, painted pixel by pixel on GLEE.",
      svg,
    };
  } catch (error) {
    console.error(`Failed to load canvas #${id} for metadata:`, error);
    return null;
  }
}

interface ParsedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

function parseRectsFromSvg(svg: string): ParsedRect[] {
  const rectTags = svg.match(/<rect[^>]*\/?>/g) ?? [];
  const rects: ParsedRect[] = [];

  for (const tag of rectTags) {
    const attrs: Record<string, string> = {};
    const attrRegex = /([\w-]+)=["']([^"']*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(tag))) {
      attrs[match[1]] = match[2];
    }
    if (attrs.fill && attrs.x !== undefined && attrs.y !== undefined) {
      rects.push({
        x: parseFloat(attrs.x),
        y: parseFloat(attrs.y),
        width: parseFloat(attrs.width ?? "0"),
        height: parseFloat(attrs.height ?? "0"),
        fill: attrs.fill,
      });
    }
  }
  return rects;
}

// Reconstructs a 9x9 grid of fill colors from the contract's generated SVG. Computed
// proportionally from the rects' own bounding box rather than assuming a fixed pixel size,
// so it isn't tied to exactly how the contract happens to size each cell. The single rect
// that covers (most of) the whole canvas is treated as the background, not a pixel.
export function buildColorGridFromSvg(svg: string, gridSize = 9): (string | null)[] {
  const grid: (string | null)[] = new Array(gridSize * gridSize).fill(null);
  const rects = parseRectsFromSvg(svg);
  if (rects.length === 0) return grid;

  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const cellWidth = spanX / gridSize;
  const cellHeight = spanY / gridSize;

  for (const rect of rects) {
    if (rect.width >= spanX * 0.9 && rect.height >= spanY * 0.9) continue; // background rect
    const col = Math.min(gridSize - 1, Math.max(0, Math.round((rect.x - minX) / cellWidth)));
    const row = Math.min(gridSize - 1, Math.max(0, Math.round((rect.y - minY) / cellHeight)));
    grid[row * gridSize + col] = rect.fill;
  }

  return grid;
}