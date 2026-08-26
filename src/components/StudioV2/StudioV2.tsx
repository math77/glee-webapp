"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Address } from 'viem';
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

import Header from '../Header/Header';
import ColorCanvas from '../ColorCanvas/ColorCanvas';
import WalletButton from '../WalletButton/WalletButton';
import { useToast } from '../Toast/ToastProvider';

import { GLEE_V2_CONTRACT_ADDRESS,  gleeV2ABI } from '@/utils/contractAbi';

import { convertCanvasForContractArtworkV2, decodeArtworkDataV2ToSVG, V2_COLOR_PALETTE } from '@/utils/swissknife';
import { CanvasData, ColorPlacement } from '@/types';

interface ColorCanvasRef {
  saveCanvas: () => void;
  getCanvasData: () => { id: string; title: string; description?: string; parcels: Record<string, { coord_x: number; coord_y: number; color_code: string; color_index: number }> };
  eraseCanvas: () => void;
}

const V2_PALETTE = [
  { id: 0, color: V2_COLOR_PALETTE[0], name: 'Paper' },
  { id: 1, color: V2_COLOR_PALETTE[1], name: 'Emerald' },
  { id: 2, color: V2_COLOR_PALETTE[2], name: 'Blush' },
  { id: 3, color: V2_COLOR_PALETTE[3], name: 'Poppy' },
  { id: 4, color: V2_COLOR_PALETTE[4], name: 'Ink' },
  { id: 5, color: V2_COLOR_PALETTE[5], name: 'Cobalt' },
  { id: 6, color: V2_COLOR_PALETTE[6], name: 'Gold' },
  { id: 7, color: V2_COLOR_PALETTE[7], name: 'Amber' },
  { id: 8, color: V2_COLOR_PALETTE[8], name: 'Umber' },
  { id: 9, color: V2_COLOR_PALETTE[9], name: 'Orchid' },
  { id: 10, color: V2_COLOR_PALETTE[10], name: 'Amethyst' },
];

const CONTRACT_CONFIGURED = GLEE_V2_CONTRACT_ADDRESS.length > 0;

export default function StudioV2() {
  const { address: userAddress } = useAccount();
  const { pushToast } = useToast();

  const [selectedColor, setSelectedColor] = useState<string>(V2_PALETTE[5].color);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(V2_PALETTE[5].id);
  const [currentCanvasId, setCurrentCanvasId] = useState<string>('');
  const [title, setTitle] = useState('V2 test');
  const [description, setDescription] = useState('Testing the 11-color palette');
  const [livePlacements, setLivePlacements] = useState<ColorPlacement[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<ColorCanvasRef>(null);

  const contract = { address: GLEE_V2_CONTRACT_ADDRESS, abi: gleeV2ABI } as const;

  // --- your V2 test canvases ---
  const { data: ownedIds, refetch: refetchOwned } = useReadContract({
    ...contract,
    functionName: 'walletOfOwner',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: Boolean(userAddress) && CONTRACT_CONFIGURED },
  });

  const canvasReads = useMemo(
    () => (ownedIds ?? []).map((id) => ({ ...contract, functionName: 'getCanvas' as const, args: [id] as const })),
    [ownedIds]
  );
  const { data: canvasResults, refetch: refetchCanvases } = useReadContracts({
    contracts: canvasReads,
    query: { enabled: canvasReads.length > 0 },
  });

  const ownedCanvases = useMemo(() => {
    if (!ownedIds || !canvasResults) return [];
    return ownedIds.map((id, index) => {
      const result = canvasResults[index];
      if (result?.status !== 'success') return { id, painted: false, title: `Canvas ${id}` };
      const canvas = result.result as { painted: boolean; artwork: { title: string; artData1: bigint; artData2: bigint } };
      return { id, painted: canvas.painted, title: canvas.painted ? canvas.artwork.title : `Canvas ${id}`, artData1: canvas.artwork.artData1, artData2: canvas.artwork.artData2 };
    });
  }, [ownedIds, canvasResults]);

  // --- mint a fresh test canvas ---
  const { data: mintHash, writeContract: writeMint, isPending: isMintPending } = useWriteContract();
  const mintReceipt = useWaitForTransactionReceipt({ hash: mintHash });
  const { data: mintPrice } = useReadContract({ ...contract, functionName: 'mintPrice', query: { enabled: CONTRACT_CONFIGURED } });

  useEffect(() => {
    if (mintReceipt.isSuccess) {
      pushToast({ title: 'Test canvas minted', description: 'Refreshing your V2 canvas list…', variant: 'success' });
      void refetchOwned();
      void refetchCanvases();
    }
  }, [mintReceipt.isSuccess]);

  const handleMintTest = () => {
    if (mintPrice === undefined) return;
    writeMint({ ...contract, functionName: 'mintCanvas', args: [BigInt(1)], value: mintPrice as bigint });
  };

  // --- finish (paint) canvas ---
  const { data: finishHash, writeContract: writeFinish, isPending: isFinishPending } = useWriteContract();
  const finishReceipt = useWaitForTransactionReceipt({ hash: finishHash });

  useEffect(() => {
    if (finishReceipt.isSuccess) {
      pushToast({ title: 'Canvas finished', description: 'V2 artwork saved on-chain — check it against the preview below.', variant: 'success' });
      setIsSaving(false);
      void refetchOwned();
      void refetchCanvases();
    }
  }, [finishReceipt.isSuccess]);

  useEffect(() => {
    if (finishReceipt.isError) {
      pushToast({ title: 'Finish failed', description: 'The transaction did not complete.', variant: 'error' });
      setIsSaving(false);
    }
  }, [finishReceipt.isError]);

  const handleColorSelect = (color: { id: number; color: string }) => {
    setSelectedColor(color.color);
    setSelectedColorIndex(color.id);
  };

  // Poll the live in-progress canvas state so the round-trip preview updates as you paint,
  // without needing a save/save-callback wired through ColorCanvas.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!canvasRef.current) return;
      const data = canvasRef.current.getCanvasData();
      const placements: ColorPlacement[] = Object.values(data.parcels).map((p) => ({
        x: p.coord_x,
        y: p.coord_y,
        color: p.color_code,
        colorIndex: p.color_index,
      }));
      setLivePlacements(placements);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const { artworkData1: liveArtData1, artworkData2: liveArtData2 } = useMemo(
    () => convertCanvasForContractArtworkV2(livePlacements),
    [livePlacements]
  );
  const previewSvg = useMemo(() => decodeArtworkDataV2ToSVG(liveArtData1, liveArtData2), [liveArtData1, liveArtData2]);

  const handleFinish = () => {
    if (!currentCanvasId) {
      pushToast({ title: 'Pick a canvas first', description: 'Select one of your minted V2 test canvases below.', variant: 'error' });
      return;
    }
    if (!canvasRef.current) return;
    setIsSaving(true);
    // Read directly from the canvas at submit time — not the polled preview state, which can
    // lag the very latest paint action by up to the poll interval.
    const data = canvasRef.current.getCanvasData();
    const placementsAtSubmit: ColorPlacement[] = Object.values(data.parcels).map((p) => ({
      x: p.coord_x,
      y: p.coord_y,
      color: p.color_code,
      colorIndex: p.color_index,
    }));
    const { artworkData1, artworkData2 } = convertCanvasForContractArtworkV2(placementsAtSubmit);
    writeFinish({
      ...contract,
      functionName: 'finishCanvas',
      args: [BigInt(currentCanvasId), artworkData1, artworkData2, title, description],
    });
  };

  return (
    <div className="site-shell min-h-screen text-[var(--foreground)]">
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32">
        <div className="border border-[var(--border-hairline-strong)] bg-[var(--background-2)] px-5 py-4">
          <p className="eyebrow-quiet">V2 palette test harness</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
            Not linked from the main site. Testing the 11-color / two-uint256 encoding only — no token gating yet, anyone can
            paint with any color. {!CONTRACT_CONFIGURED && (
              <span className="text-[var(--accent)]">GLEE_V2_CONTRACT_ADDRESS is empty in contractAbiV2.ts — on-chain actions
              are disabled until it's set, but the round-trip preview below works with zero chain calls.</span>
            )}
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(360px,1fr)_320px]">
          <aside className="flex flex-col gap-4">
            <div className="studio-panel p-4">
              <h2 className="studio-label mb-4">Your V2 canvases</h2>
              {!userAddress ? (
                <WalletButton iconVersion={false} shape="" backgroundColor="quiet-button quiet-button--filled" paddingX="px-4" />
              ) : ownedCanvases.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">None minted yet.</p>
              ) : (
                <div className="space-y-2">
                  {ownedCanvases.map((canvas) => (
                    <button
                      key={canvas.id.toString()}
                      onClick={() => setCurrentCanvasId(canvas.id.toString())}
                      className={`block w-full border px-3 py-2 text-left text-sm ${
                        currentCanvasId === canvas.id.toString() ? 'border-[var(--accent)]' : 'border-[var(--border-hairline)]'
                      }`}
                    >
                      {canvas.title}
                      {canvas.painted && <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">Finished</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="studio-panel p-4">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleMintTest}
                disabled={!userAddress || !CONTRACT_CONFIGURED || isMintPending || mintReceipt.isLoading || mintPrice === undefined}
                className="quiet-button quiet-button--filled w-full py-3 text-sm"
              >
                {isMintPending || mintReceipt.isLoading ? 'Minting…' : 'Mint a V2 test canvas'}
              </motion.button>
            </div>
          </aside>

          <section className="flex flex-col items-center border border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-6">
            <p className="eyebrow-quiet self-start">Paint (live)</p>
            <div className="mt-4 h-[364px] w-[364px] border border-[var(--border-hairline-strong)] bg-[#fbf8f2]">
              <ColorCanvas
                ref={canvasRef}
                userAddress={(userAddress ?? '0x0000000000000000000000000000000000000000') as Address}
                selectedColor={selectedColor}
                selectedColorIndex={selectedColorIndex}
                currentCanvasId={currentCanvasId || 'v2-scratch'}
                readOnly={false}
              />
            </div>
            <div className="mt-6 grid grid-cols-6 gap-3 sm:grid-cols-11">
              {V2_PALETTE.map((color) => (
                <button key={color.id} onClick={() => handleColorSelect(color)} className="flex flex-col items-center gap-1.5" aria-label={`Select ${color.name}`}>
                  <span
                    className="block h-7 w-7 rounded-full border"
                    style={{
                      backgroundColor: color.color,
                      borderColor: color.color === '#FFFFFF' ? 'var(--border-hairline-strong)' : 'var(--border-hairline)',
                      boxShadow: selectedColor === color.color ? '0 0 0 2px var(--background-2), 0 0 0 3px var(--accent)' : 'none',
                    }}
                  />
                  <span className="text-[10px] text-[var(--foreground-muted)]">{color.name}</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="studio-panel p-4">
              <h2 className="studio-label">Round-trip preview</h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--foreground-muted)]">
                Encodes the live painting into artData1/artData2, then decodes it right back with the same logic
                GLEEV2Metadata.generateSVG uses. If this doesn&apos;t match what you&apos;re painting, the bug is in the
                encoder/decoder — not the chain.
              </p>
              <div className="mt-4 aspect-square border border-[var(--border-hairline-strong)] bg-[#fbf8f2] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: previewSvg }} />
            </div>
            <div className="studio-panel p-4">
              <label className="studio-label block">Title</label>
              <input className="studio-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              <label className="studio-label mt-4 block">Description</label>
              <textarea className="studio-input h-20 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleFinish}
                disabled={!CONTRACT_CONFIGURED || !currentCanvasId || isSaving || isFinishPending || finishReceipt.isLoading}
                className="quiet-button quiet-button--filled mt-4 w-full py-3 text-sm"
              >
                {isFinishPending || finishReceipt.isLoading ? 'Confirming…' : 'Finish canvas (V2)'}
              </motion.button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}