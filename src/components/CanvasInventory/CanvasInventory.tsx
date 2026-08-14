"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';
import { readContract } from '@wagmi/core';
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from '../../../utils/contractAbi';
import { createConfig } from '@wagmi/core';
import { http } from '@wagmi/core';
import { injected } from '@wagmi/core';
import { baseSepolia, BASE_SEPOLIA_RPC_URL } from '../../../utils/chain';
import { CanvasData } from '@/types';

interface Canvas {
  id: number;
  canvas_id: number;
  title: string;
  description?: string;
  token_uri?: bigint;
  user_wallet?: string;
  finished?: boolean;
  svgData?: string;
}

interface CanvasInventoryProps {
  userAddress: Address;
  currentCanvasId: string;
  onCanvasSelect: (canvasId: string, canvasData: CanvasData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  interactionSound: { play: () => void; };
}

const ALCHEMY_ID = process.env.NEXT_PUBLIC_ALCHEMY_ID as string;

const CanvasInventory = React.forwardRef<
  { reloadCanvases: () => Promise<any[]> },
  CanvasInventoryProps
>(({
  userAddress,
  currentCanvasId,
  onCanvasSelect,
  isLoading,
  setIsLoading,
  interactionSound
}, ref) => {
  const [canvasses, setCanvasses] = useState<Canvas[]>([]);
  const [canvasList, setCanvasList] = useState<CanvasData[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Create config for contract calls
  const config = createConfig({
    chains: [baseSepolia],
    connectors: [injected()],
    ssr: true,
    transports: {
      [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL)
    }
  });

  // Load user's canvases from the contract
  const loadUserCanvasses = useCallback(async () => {
    setIsLoading(true);
    let allCanvasses: Canvas[] = [];

    try {
      const canvassesIds = await readContract(config, {
        abi: pixelatedDelightsABI,
        address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
        functionName: "walletOfOwner",
        args: [userAddress],
      });

      const amountOfCanvasByUser = canvassesIds.length;
      
      console.log("CANVASSES IDS: ", canvassesIds);

      for (let index = 0; index < canvassesIds.length; index++) {
        // Get canvas data from contract
        const canvasFromContract = await readContract(config, {
          abi: pixelatedDelightsABI,
          address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
          functionName: "getCanvas",
          args: [BigInt(canvassesIds[index])],
        });
        
        // Get SVG representation for finished canvases
        let svgData = "";
        if (canvasFromContract.painted) {
          svgData = await readContract(config, {
            abi: pixelatedDelightsABI,
            address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
            functionName: "getCanvasAsSVG",
            args: [canvasFromContract.artwork.artData],
          }) as string;
        }

        let canvas: Canvas = {
          id: Number(canvassesIds[index]),
          title: canvasFromContract.artwork.title,
          description: canvasFromContract.artwork.description,
          canvas_id: Number(canvassesIds[index]),
          token_uri: canvasFromContract.artwork.artData,
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
      console.error(`Error fetching canvases:`, error);
    } finally {
      setIsLoading(false);
    }
    
    return allCanvasses;
  }, [userAddress]);

  // Create canvas list from loaded data
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
    } catch (error) {
      console.error('Error loading canvas list:', error);
    }
  }, [canvasses]);

  // Load data when component mounts
  useEffect(() => {
    if (userAddress) {
      loadUserCanvasses();
    }
  }, [loadUserCanvasses, userAddress]);

  const handleCanvasSelect = (canvasId: string) => {
    interactionSound.play();
    
    // Find the selected canvas in the list
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
        <div className="text-white text-center py-8">
          {userAddress ? `Loading Canvases... ${loadingProgress}%` : ''}
        </div>
      ) : canvasList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-300">Your inventory is empty</p>
          <p className="text-gray-400 text-sm mt-1">Mint some canvas to get started</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {/* Canvas inventory items */}
          {canvasList.map((canvas) => (
            <div
              key={canvas.id}
              className={`h-24 cursor-pointer relative overflow-hidden border border-white/10 bg-[#17263a] transition-all ${
                currentCanvasId === canvas.id ? 'ring-2 ring-[#a8f85b] ring-offset-2 ring-offset-[#0d1827]' : 'hover:border-white/40'
              }`}
              onClick={() => handleCanvasSelect(canvas.id)}
            >
              {/* Show SVG preview for finished canvases */}
              {canvas.finished && canvas.svgData ? (
                <div className="w-full h-full flex flex-col">
                  <div className="text-xs font-medium text-white truncate px-2 pt-1 pb-1">{canvas.title}</div>
                  <div className="flex-grow bg-white relative overflow-hidden">
                    <div 
                      dangerouslySetInnerHTML={{ __html: canvas.svgData }} 
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2 text-xs font-medium text-white truncate">{canvas.title}</div>
              )}
              
              {canvas.finished ? (
                <div className="absolute bottom-2 right-2 bg-[#a8f85b] text-[#08101c] text-xs px-2 py-1 shadow-sm">
                  Finished
                </div>
              ) : (
                <div className="absolute bottom-2 right-2 bg-[#295dd9] text-white text-xs px-2 py-1 shadow-sm">
                  In Progress
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default CanvasInventory;
