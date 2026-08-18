/*
"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header/Header";
import TipCanvas from "@/components/TipCanvas/TipCanvas";
import { useReadContract, useReadContracts } from "wagmi";
import { GLEE_CONTRACT_ADDRESS, pixelatedDelightsABI } from "../../../utils/contractAbi";

const MAX_GALLERY_CANVASES = 100;

export default function Gallery() {
  const [selectedCanvasId, setSelectedCanvasId] = useState<bigint | null>(null);
  const { data: totalSupply = BigInt(0), isPending: supplyLoading } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "totalSupply" });
  const canvasIds = useMemo(() => Array.from({ length: Math.min(Number(totalSupply), MAX_GALLERY_CANVASES) }, (_, index) => BigInt(index + 1)), [totalSupply]);
  const canvasReads = useMemo(() => canvasIds.map((id) => ({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "getCanvas" as const, args: [id] as const })), [canvasIds]);
  const { data: canvasResults = [], isPending: canvasesLoading } = useReadContracts({ contracts: canvasReads });
  const paintedCanvases = useMemo(() => canvasResults.flatMap((result, index) => {
    if (result.status !== "success") return [];
    const canvas = result.result as { amountReceivedOnTips: bigint; painted: boolean; artwork: { title: string; description: string; painter: string; artData: bigint } };
    return canvas.painted ? [{ id: canvasIds[index], ...canvas }] : [];
  }), [canvasIds, canvasResults]);
  const svgReads = useMemo(() => paintedCanvases.map((canvas) => ({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "getCanvasAsSVG" as const, args: [canvas.artwork.artData] as const })), [paintedCanvases]);
  const { data: svgResults = [] } = useReadContracts({ contracts: svgReads });
  const selectedCanvas = paintedCanvases.find((canvas) => canvas.id === selectedCanvasId);

  return <div className="site-shell min-h-screen text-white"><Header /><main className="mx-auto max-w-7xl px-6 pb-24 pt-36 sm:pt-44"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">Community exhibition</p><h1 className="mt-4 font-[family-name:var(--font-pixelify-sans)] text-5xl font-bold sm:text-6xl">The garden is<br /><span className="text-[#a8f85b]">growing.</span></h1></div><p className="max-w-sm leading-relaxed text-slate-400">Support completed canvases with GLEE. Each tip is split equally between the painter and the current canvas owner.</p></div>
    {(supplyLoading || canvasesLoading) && <p className="mt-12 text-slate-400">Loading the exhibition…</p>}
    {!supplyLoading && !canvasesLoading && paintedCanvases.length === 0 && <div className="mt-12 border border-white/15 bg-[#0b1422] p-10 text-center"><p className="font-[family-name:var(--font-pixelify-sans)] text-2xl">No completed canvases yet.</p><p className="mt-3 text-slate-400">The first GLEE artwork will appear here when it is finished.</p></div>}
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paintedCanvases.map((canvas, index) => { const svg = svgResults[index]?.status === "success" ? svgResults[index].result as string : ""; return <button key={canvas.id.toString()} onClick={() => setSelectedCanvasId(canvas.id)} className="group overflow-hidden border border-white/15 bg-[#0b1422] text-left transition hover:-translate-y-1 hover:border-[#a8f85b]"><div className="aspect-square bg-white p-5" dangerouslySetInnerHTML={{ __html: svg }} /><div className="p-5"><p className="text-xs text-[#a8f85b]">CANVAS #{canvas.id.toString()}</p><h2 className="mt-2 font-[family-name:var(--font-pixelify-sans)] text-2xl">{canvas.artwork.title || "Untitled canvas"}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-400">{canvas.artwork.description || "A GLEE creation."}</p><p className="mt-4 text-sm text-[#f8d65d]">{canvas.amountReceivedOnTips.toString()} GLEE received</p></div></button>; })}</div>
    {selectedCanvas && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4"><div className="studio-panel w-full max-w-md p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Canvas #{selectedCanvas.id.toString()}</p><h2 className="mt-2 font-[family-name:var(--font-pixelify-sans)] text-3xl">{selectedCanvas.artwork.title || "Untitled canvas"}</h2></div><button onClick={() => setSelectedCanvasId(null)} aria-label="Close tip dialog" className="text-2xl text-slate-400 hover:text-white">×</button></div><p className="mt-4 text-slate-400">{selectedCanvas.artwork.description || "A GLEE creation."}</p><TipCanvas canvasId={selectedCanvas.id} /></div></div>}
  </main></div>;
}
*/

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { formatUnits } from "viem";
import Header from "@/components/Header/Header";
import TipCanvas from "@/components/TipCanvas/TipCanvas";
import GleeTokenNotice from "@/components/GleeTokenNotice/GleeTokenNotice";
import { useReadContract, useReadContracts } from "wagmi";
import { GLEE_CONTRACT_ADDRESS, pixelatedDelightsABI } from "../../../utils/contractAbi";

const MAX_GALLERY_CANVASES = 100;

const gleeAbi = [
  { type: "function", name: "gleeCoin", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

const erc20DecimalsAbi = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

// amountReceivedOnTips comes back from the contract in the token's base units (e.g. wei-like,
// 18 decimals) — displaying it with .toString() shows the raw integer instead of the token amount.
function formatTipTotal(amount: bigint, decimals: number) {
  const formatted = formatUnits(amount, decimals);
  const [whole, fraction] = formatted.split(".");
  if (!fraction) return whole;
  const trimmed = fraction.slice(0, 2).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function Gallery() {
  const [selectedCanvasId, setSelectedCanvasId] = useState<bigint | null>(null);

  const { data: totalSupply = BigInt(0), isPending: supplyLoading } = useReadContract({
    address: GLEE_CONTRACT_ADDRESS,
    abi: pixelatedDelightsABI,
    functionName: "totalSupply",
  });

  const canvasIds = useMemo(
    () => Array.from({ length: Math.min(Number(totalSupply), MAX_GALLERY_CANVASES) }, (_, index) => BigInt(index + 1)),
    [totalSupply]
  );

  const canvasReads = useMemo(
    () => canvasIds.map((id) => ({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "getCanvas" as const, args: [id] as const })),
    [canvasIds]
  );

  const { data: canvasResults = [], isPending: canvasesLoading, refetch: refetchCanvases } = useReadContracts({ contracts: canvasReads });

  const paintedCanvases = useMemo(
    () =>
      canvasResults.flatMap((result, index) => {
        if (result.status !== "success") return [];
        const canvas = result.result as { amountReceivedOnTips: bigint; painted: boolean; artwork: { title: string; description: string; painter: string; artData: bigint } };
        return canvas.painted ? [{ id: canvasIds[index], ...canvas }] : [];
      }),
    [canvasIds, canvasResults]
  );

  const svgReads = useMemo(
    () => paintedCanvases.map((canvas) => ({ address: GLEE_CONTRACT_ADDRESS, abi: pixelatedDelightsABI, functionName: "getCanvasAsSVG" as const, args: [canvas.artwork.artData] as const })),
    [paintedCanvases]
  );

  const { data: svgResults = [] } = useReadContracts({ contracts: svgReads });
  const selectedCanvas = paintedCanvases.find((canvas) => canvas.id === selectedCanvasId);

  const { data: coinAddress } = useReadContract({ address: GLEE_CONTRACT_ADDRESS, abi: gleeAbi, functionName: "gleeCoin" });
  const coin = coinAddress && coinAddress !== "0x0000000000000000000000000000000000000000" ? coinAddress : undefined;
  const { data: tipDecimals = 18 } = useReadContract({ address: coin, abi: erc20DecimalsAbi, functionName: "decimals", query: { enabled: Boolean(coin) } });

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeLightbox = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setSelectedCanvasId(null);
  }, []);

  const handleTipSuccess = useCallback(() => {
    void refetchCanvases();
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setSelectedCanvasId(null);
      closeTimeoutRef.current = null;
    }, 2200);
  }, [refetchCanvases]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  return (
    <div className="site-shell min-h-screen text-[var(--foreground)]">
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-36 sm:pt-44">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"
        >
          <div>
            <p className="eyebrow-quiet">Community exhibition</p>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-4xl italic text-[var(--foreground)] sm:text-5xl">
              The garden is <span className="text-[var(--accent)]">growing.</span>
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--foreground-muted)]">
            Support completed canvases with GLEE. Each tip is split equally between the painter and the current canvas owner.
          </p>
          <GleeTokenNotice variant="inline" className="mt-2" />
        </motion.div>

        {(supplyLoading || canvasesLoading) && (
          <p className="plaque mt-16 text-center text-base">Hanging the exhibition…</p>
        )}

        {!supplyLoading && !canvasesLoading && paintedCanvases.length === 0 && (
          <div className="studio-panel mt-12 p-10 text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">No completed canvases yet.</p>
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">The first GLEE artwork will appear here when it is finished.</p>
          </div>
        )}

        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {paintedCanvases.map((canvas) => {
            const index = paintedCanvases.findIndex((c) => c.id === canvas.id);
            const svg = svgResults[index]?.status === "success" ? (svgResults[index].result as string) : "";
            return (
              <motion.div
                key={canvas.id.toString()}
                variants={cardVariants}
                className="overflow-hidden border border-[var(--border-hairline)] bg-[var(--background-2)]"
              >
                <div
                  className="aspect-square bg-[#fbf8f2] p-6 [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <div className="p-5">
                  <p className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">Canvas #{canvas.id.toString()}</p>
                  <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-xl italic text-[var(--foreground)]">
                    {canvas.artwork.title || "Untitled canvas"}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--foreground-muted)]">{canvas.artwork.description || "A GLEE creation."}</p>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border-hairline)] px-5 py-3">
                  <p className="text-sm text-[var(--accent)]">{formatTipTotal(canvas.amountReceivedOnTips, tipDecimals)} GLEE received</p>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedCanvasId(canvas.id)}
                    className="quiet-button px-3 py-1.5 text-xs"
                  >
                    Tip
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {selectedCanvas && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="studio-panel w-full max-w-md p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow-quiet">Canvas #{selectedCanvas.id.toString()}</p>
                    <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">
                      {selectedCanvas.artwork.title || "Untitled canvas"}
                    </h2>
                  </div>
                  <button
                    onClick={closeLightbox}
                    aria-label="Close tip dialog"
                    className="text-2xl text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-4 text-sm text-[var(--foreground-muted)]">{selectedCanvas.artwork.description || "A GLEE creation."}</p>
                <TipCanvas canvasId={selectedCanvas.id} onTipSuccess={handleTipSuccess} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}