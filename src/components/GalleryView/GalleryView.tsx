"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { formatUnits } from "viem";
import Header from "@/components/Header/Header";
import TipCanvas from "@/components/TipCanvas/TipCanvas";
import GleeTokenNotice from "@/components/GleeTokenNotice/GleeTokenNotice";
import { useToast } from "@/components/Toast/ToastProvider";
import { canvasShareUrl } from "@/utils/siteConfig";
import { useReadContract, useReadContracts } from "wagmi";
import { GLEE_CONTRACT_ADDRESS, pixelatedDelightsABI } from "../../utils/contractAbi";

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

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0-12l-4 4m4-4l4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
    </svg>
  );
}

interface GalleryViewProps {
  /** Pre-selects a canvas so its detail modal is already open on first render — used when
   * landing on a shared /gallery/[id] link. Left undefined for the plain /gallery route. */
  initialCanvasId?: string;
}

export default function GalleryView({ initialCanvasId }: GalleryViewProps) {
  const [selectedCanvasId, setSelectedCanvasId] = useState<bigint | null>(() => {
    try {
      return initialCanvasId ? BigInt(initialCanvasId) : null;
    } catch {
      return null;
    }
  });

  const { pushToast } = useToast();

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

  const handleShare = useCallback(async (canvasId: bigint, title: string) => {
    const url = canvasShareUrl(canvasId.toString());
    const shareData = { title: `${title || "Untitled canvas"} — GLEE`, text: "Check out this canvas on GLEE", url };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // AbortError just means the person closed the native share sheet — not a failure.
        if ((error as { name?: string })?.name !== "AbortError") {
          pushToast({ title: "Couldn't open share sheet", description: "Copy the link instead.", variant: "error" });
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      pushToast({ title: "Link copied", description: url, variant: "success" });
    } catch {
      pushToast({ title: "Couldn't copy link", description: url, variant: "error" });
    }
  }, [pushToast]);

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
          <div className="max-w-sm">
            <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
              Support completed canvases with GLEE. Each tip is split equally between the painter and the current canvas owner.
            </p>
            <GleeTokenNotice variant="inline" className="mt-2" />
          </div>
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
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleShare(canvas.id, canvas.artwork.title)}
                      aria-label="Share this canvas"
                      className="quiet-button px-2.5 py-1.5"
                    >
                      <ShareIcon />
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedCanvasId(canvas.id)}
                      className="quiet-button px-3 py-1.5 text-xs"
                    >
                      Tip
                    </motion.button>
                  </div>
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
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => handleShare(selectedCanvas.id, selectedCanvas.artwork.title)}
                      aria-label="Share this canvas"
                      className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    >
                      <ShareIcon />
                    </button>
                    <button
                      onClick={closeLightbox}
                      aria-label="Close tip dialog"
                      className="text-2xl leading-none text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    >
                      ×
                    </button>
                  </div>
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