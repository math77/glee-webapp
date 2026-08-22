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
  const rectTags = svg.match(/<rect\b[^>]*\/?>/gi) ?? [];
  const rects: ParsedRect[] = [];

  for (const tag of rectTags) {
    const attrs: Record<string, string> = {};
    const attrRegex = /([\w-]+)\s*=\s*["']([^"']*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(tag))) {
      attrs[match[1].toLowerCase()] = match[2];
    }

    const fill = attrs.fill;
    const width = attrs.width;
    const height = attrs.height;
    // A percentage (or missing) width/height can't be a uniform grid cell — skip rather
    // than let parseFloat silently coerce "100%" into 100 and corrupt the size comparison.
    const isPixelValue = (value?: string) => value !== undefined && !value.trim().endsWith("%") && Number.isFinite(parseFloat(value));

    // Position can arrive as plain x/y attributes, or as transform="translate(x,y)" —
    // both are common in generated SVG, and skipping whichever one a rect actually uses
    // would silently drop it from the parsed set rather than just placing it wrong.
    let x = attrs.x !== undefined ? parseFloat(attrs.x) : undefined;
    let y = attrs.y !== undefined ? parseFloat(attrs.y) : undefined;
    if ((x === undefined || y === undefined) && attrs.transform) {
      const translateMatch = attrs.transform.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
      if (translateMatch) {
        x = x ?? parseFloat(translateMatch[1]);
        y = y ?? parseFloat(translateMatch[2]);
      }
    }

    if (!fill || x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y) || !isPixelValue(width) || !isPixelValue(height)) continue;

    rects.push({ x, y, width: parseFloat(width!), height: parseFloat(height!), fill });
  }
  return rects;
}

// Reconstructs a 9x9 grid of fill colors from the contract's generated SVG.
//
// This deliberately does NOT compute cell size from the overall bounding box of every rect
// (background included) — that was the original approach, and it broke: a background rect
// that doesn't use plain matching pixel dimensions (a percentage width, a size that doesn't
// exactly equal 9 cells, extra chrome around the grid, etc.) throws off the scale factor for
// every single cell, not just the edge, since every position is computed proportionally
// against that bounding box.
//
// Instead: the individual pixel cells vastly outnumber any other rect (up to 81 of them vs.
// realistically one background), so whatever width appears most often is almost certainly one
// cell's width. Filtering down to only rects matching that size before computing positions
// means a differently-sized background rect simply gets excluded, rather than corrupting the
// scale for everything else.
export function buildColorGridFromSvg(svg: string, gridSize = 9): (string | null)[] {
  const grid: (string | null)[] = new Array(gridSize * gridSize).fill(null);
  const rects = parseRectsFromSvg(svg).filter((r) => r.width > 0 && r.height > 0);
  if (rects.length === 0) return grid;

  const sizeCounts = new Map<number, number>();
  for (const rect of rects) {
    // Round to the nearest pixel so trivial floating-point differences don't split what's
    // really the same cell size into separate buckets.
    const key = Math.round(rect.width);
    sizeCounts.set(key, (sizeCounts.get(key) ?? 0) + 1);
  }
  const [cellSize] = [...sizeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  const cellRects = rects.filter((r) => Math.abs(r.width - cellSize) < 1 && Math.abs(r.height - cellSize) < 1);
  if (cellRects.length === 0) return grid;

  const minX = Math.min(...cellRects.map((r) => r.x));
  const minY = Math.min(...cellRects.map((r) => r.y));

  for (const rect of cellRects) {
    const col = Math.min(gridSize - 1, Math.max(0, Math.round((rect.x - minX) / cellSize)));
    const row = Math.min(gridSize - 1, Math.max(0, Math.round((rect.y - minY) / cellSize)));
    grid[row * gridSize + col] = rect.fill;
  }

  return grid;
}