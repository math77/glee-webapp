"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Address } from 'viem';
import { readContract } from '@wagmi/core';
import { gleeV2ABI, GLEE_V2_CONTRACT_ADDRESS } from '@/utils/contractAbi';
import { createConfig } from '@wagmi/core';
import { http } from '@wagmi/core';
import { injected } from '@wagmi/core';
import { baseSepolia, BASE_SEPOLIA_RPC_URL } from '../../utils/chain';
import { CanvasData } from '@/types';

// V2 counterpart to CanvasInventory.tsx — same structure and UI, pointed at the V2 contract,
// with the one real difference: getCanvas/getCanvasAsSVG deal in artData1+artData2 (two
// uint256s) instead of a single artData.

interface Canvas {
  id: number;
  canvas_id: number;
  title: string;
  description?: string;
  user_wallet?: string;
  finished?: boolean;
  svgData?: string;
}

interface CanvasInventoryV2Props {
  userAddress: Address;
  currentCanvasId: string;
  onCanvasSelect: (canvasId: string, canvasData: CanvasData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const CanvasInventoryV2 = React.forwardRef<
  { reloadCanvases: () => Promise<any[]> },
  CanvasInventoryV2Props
>(({
  userAddress,
  currentCanvasId,
  onCanvasSelect,
  isLoading,
  setIsLoading,
}, ref) => {
  const [canvasses, setCanvasses] = useState<Canvas[]>([]);
  const [canvasList, setCanvasList] = useState<CanvasData[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const hasAutoSelectedRef = React.useRef(false);

  const config = createConfig({
    chains: [baseSepolia],
    connectors: [injected()],
    ssr: true,
    transports: {
      [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL)
    }
  });

  const loadUserCanvasses = useCallback(async () => {
    setIsLoading(true);
    let allCanvasses: Canvas[] = [];

    try {
      const canvassesIds = await readContract(config, {
        abi: gleeV2ABI,
        address: GLEE_V2_CONTRACT_ADDRESS,
        functionName: "walletOfOwner",
        args: [userAddress],
      });

      const amountOfCanvasByUser = canvassesIds.length;

      for (let index = 0; index < canvassesIds.length; index++) {
        const canvasFromContract = await readContract(config, {
          abi: gleeV2ABI,
          address: GLEE_V2_CONTRACT_ADDRESS,
          functionName: "getCanvas",
          args: [BigInt(canvassesIds[index])],
        });

        let svgData = "";
        if (canvasFromContract.painted) {
          svgData = await readContract(config, {
            abi: gleeV2ABI,
            address: GLEE_V2_CONTRACT_ADDRESS,
            functionName: "getCanvasAsSVG",
            args: [BigInt(canvassesIds[index])],
          }) as string;
        }

        let canvas: Canvas = {
          id: Number(canvassesIds[index]),
          title: canvasFromContract.artwork.title,
          description: canvasFromContract.artwork.description,
          canvas_id: Number(canvassesIds[index]),
          user_wallet: userAddress,
          finished: canvasFromContract.painted,
          svgData: svgData
        }

        allCanvasses.push(canvas);

        const newProgress = Math.min(100, Math.round(((index + 1) / amountOfCanvasByUser) * 100));
        setLoadingProgress(newProgress);
      }

      setCanvasses([...allCanvasses]);

    } catch (error) {
      console.error(`Error fetching V2 canvases:`, error);
    } finally {
      setIsLoading(false);
    }

    return allCanvasses;
  }, [userAddress]);

  useEffect(() => {
    try {
      const canvasItems = canvasses.map(canvas => {
        return {
          id: `network-${canvas.canvas_id}`,
          title: canvas.finished ? canvas.title : `Canvas ${canvas.canvas_id}`,
          description: canvas.finished ? canvas.description : `Canvas ID: ${canvas.canvas_id}`,
          parcels: {},
          finished: canvas.finished,
          networkId: canvas.canvas_id,
          svgData: canvas.svgData
        };
      });

      setCanvasList(canvasItems);

      if (!hasAutoSelectedRef.current && !isLoading) {
        hasAutoSelectedRef.current = true;
        const firstUnfinished = canvasItems.find(canvas => !canvas.finished);
        if (firstUnfinished) {
          onCanvasSelect(firstUnfinished.id, firstUnfinished);
        }
      }
    } catch (error) {
      console.error('Error loading V2 canvas list:', error);
    }
  }, [canvasses, isLoading, onCanvasSelect]);

  useEffect(() => {
    if (userAddress) {
      loadUserCanvasses();
    }
  }, [loadUserCanvasses, userAddress]);

  const handleCanvasSelect = (canvasId: string) => {
    const selectedCanvas = canvasList.find(canvas => canvas.id === canvasId);
    if (selectedCanvas) {
      onCanvasSelect(canvasId, selectedCanvas);
    }
  };

  React.useImperativeHandle(ref, () => ({
    reloadCanvases: loadUserCanvasses
  }))

  return (
    <div className="studio-panel mb-0 w-full p-4">
      <h2 className="studio-label mb-4">Your canvases</h2>
      {isLoading ? (
        <div className="plaque py-8 text-center text-sm">
          {userAddress ? `Loading canvases… ${loadingProgress}%` : ''}
        </div>
      ) : canvasList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="plaque text-base">Your inventory is empty.</p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">Mint a canvas to get started.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {canvasList.map((canvas, index) => (
            <motion.div
              key={canvas.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
              className={`h-20 cursor-pointer relative overflow-hidden border transition-colors ${
                currentCanvasId === canvas.id
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--border-hairline)] hover:border-[var(--border-hairline-strong)]'
              }`}
              onClick={() => handleCanvasSelect(canvas.id)}
            >
              {canvas.finished && canvas.svgData ? (
                <div className="flex h-full w-full">
                  <div className="flex-shrink-0 bg-[#fbf8f2]" style={{ width: '80px' }} dangerouslySetInnerHTML={{ __html: canvas.svgData }} />
                  <div className="flex flex-1 flex-col justify-center px-3">
                    <p className="truncate text-sm text-[var(--foreground)]">{canvas.title}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">Finished</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-center px-3">
                  <p className="text-sm text-[var(--foreground)]">{canvas.title}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--accent)]">In progress</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
});

CanvasInventoryV2.displayName = 'CanvasInventoryV2';

export default CanvasInventoryV2;