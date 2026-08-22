import { ImageResponse } from "next/og";
import { buildColorGridFromSvg, getCanvasForMetadata } from "@/utils/canvasServer";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A GLEE canvas — a tiny onchain pixel artwork";

const BACKGROUND = "#14120f";
const FOREGROUND = "#f3ede2";
const FOREGROUND_MUTED = "#a89e8e";
const ACCENT = "#c99a54";
const PAPER = "#fbf8f2";
const GRID_SIZE = 9;
const CELL = 42;

function fallbackImage(label: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BACKGROUND,
          color: FOREGROUND,
          fontSize: 56,
          fontStyle: "italic",
        }}
      >
        <div style={{ display: "flex" }}>GLEE</div>
        <div style={{ display: "flex", fontSize: 28, color: FOREGROUND_MUTED, marginTop: 16, fontStyle: "normal" }}>{label}</div>
      </div>
    ),
    { ...size }
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const canvas = await getCanvasForMetadata(id);
    if (!canvas) return fallbackImage(`Canvas #${id}`);

    const grid = buildColorGridFromSvg(canvas.svg, GRID_SIZE);
    const gridPixels = GRID_SIZE * CELL;
    const rows = Array.from({ length: GRID_SIZE }, (_, row) => grid.slice(row * GRID_SIZE, row * GRID_SIZE + GRID_SIZE));

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 64,
            padding: 72,
            background: BACKGROUND,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: gridPixels,
              height: gridPixels,
              background: PAPER,
              border: `1px solid ${FOREGROUND_MUTED}`,
            }}
          >
            {rows.map((rowCells, rowIndex) => (
              <div key={rowIndex} style={{ display: "flex", flexDirection: "row" }}>
                {rowCells.map((fill, colIndex) => (
                  <div
                    key={colIndex}
                    style={{
                      display: "flex",
                      width: CELL,
                      height: CELL,
                      background: fill ?? PAPER,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 480 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: FOREGROUND_MUTED,
              }}
            >
              GLEE · Canvas #{id}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontStyle: "italic",
                color: FOREGROUND,
                marginTop: 20,
                lineHeight: 1.15,
              }}
            >
              {canvas.title}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: ACCENT,
                marginTop: 28,
              }}
            >
              gleenft.xyz
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error(`Failed to render OG image for canvas #${id}:`, error);
    return fallbackImage(`Canvas #${id}`);
  }
}