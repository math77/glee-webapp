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
