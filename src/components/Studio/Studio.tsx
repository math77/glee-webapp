"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Address } from 'viem';
import { 
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { createConfig } from '@wagmi/core';
import { http } from '@wagmi/core';
import { injected } from '@wagmi/core';
import { baseSepolia, BASE_SEPOLIA_RPC_URL } from '../../utils/chain';

import Header from '../Header/Header';
import ColorCanvas from '../ColorCanvas/ColorCanvas';
import WalletButton from "../WalletButton/WalletButton";
import CanvasInventoryV2 from '../CanvasInventoryV2/CanvasInventoryV2';

import useBackgroundMusic from '@/hooks/useBackgroundMusic';

import { CanvasData } from '@/types';

import { convertCanvasForContractArtworkV2, V2_COLOR_PALETTE, V2_GATED_COLOR_INDICES } from '../../utils/swissknife';
import { gleeV2ABI, GLEE_V2_CONTRACT_ADDRESS } from '@/utils/contractAbi';

import MintCanvasV2 from '../MintCanvasV2/MintCanvasV2';
import { NFT_MINT_LAUNCHED, NFT_NOT_LAUNCHED_MESSAGE } from '../../utils/nftLaunch';

interface StudioProps {
  userAddress: Address;
}

interface CanvasMetadata {
  title: string;
  description: string;
  colorPlacements: ColorPlacement[];
}

type ColorPlacement = {
  x: number;
  y: number;
  color: string;
  colorIndex: number;
};

interface ColorCanvasRef {
  saveCanvas: () => void;
  getCanvasData: () => any;
  eraseCanvas: () => void;
}

const V2_COLOR_NAMES: Record<number, string> = {
  0: 'Paper', 1: 'Emerald', 2: 'Blush', 3: 'Poppy', 4: 'Ink', 5: 'Cobalt', 6: 'Gold', 7: 'Amber',
  8: 'Umber', 9: 'Orchid', 10: 'Amethyst', 11: 'Stone', 12: 'Teal', 13: 'Bullion',
};

const Studio: React.FC<StudioProps> = ({ userAddress }) => {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>();
  const [currentCanvasId, setCurrentCanvasId] = useState<string>('default-canvas');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [eraseModalOpen, setEraseModalOpen] = useState(false);
  const [colorPageIndex, setColorPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isCurrentCanvasFinished, setIsCurrentCanvasFinished] = useState(false);
  const [selectedCanvasData, setSelectedCanvasData] = useState<CanvasData | undefined>(undefined);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [resetKey, setResetKey] = useState<number>(0);
  const [pendingCanvasId, setPendingCanvasId] = useState<number | null>(null);
  const [transactionComplete, setTransactionComplete] = useState(false);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [displayedSvgData, setDisplayedSvgData] = useState<string | null>(null);

  // Background music is the only audio kept in the studio — click/save/erase sound
  // effects were dropped along with the arcade direction.
  const backgroundMusic = useBackgroundMusic('/sounds/bluedanube.mp3', { volume: 0.2 });

  const { data: hash, isPending, writeContract, reset: resetWriteContract } = useWriteContract();

  const canvasRef = useRef<ColorCanvasRef>(null);
  const isMounted = useRef(false);
  const canvasInventoryRef = useRef<{ reloadCanvases: () => Promise<any[]> }>(null);
  const mintCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mintReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  useEffect(() => {
    isMounted.current = true;
  }, []);

  const paletteColors = V2_COLOR_PALETTE.map((color, id) => ({
    id,
    color,
    name: V2_COLOR_NAMES[id] ?? `Color ${id}`,
    gated: V2_GATED_COLOR_INDICES.includes(id),
  }));
  const gatedColorCount = V2_GATED_COLOR_INDICES.length;

  // Memoized so this is created once per mount, not on every render — this component
  // re-renders constantly while painting, and re-instantiating injected() each time meant
  // simulateContract() could run against a connector that hadn't finished its own async
  // network detection yet, which is what "could not detect network" was coming from.
  const config = useMemo(() => createConfig({
    chains: [baseSepolia],
    connectors: [injected()],
    ssr: true,
    transports: {
      [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL)
    }
  }), []);

  // Color picker carousel configuration
  const colorsPerPage = 16; // all 14 V2 colors fit on one page
  const totalPages = Math.ceil(paletteColors.length / colorsPerPage);

  // Set up event listeners to track user interactions
  useEffect(() => {
    // Function to handle first interaction
    const handleFirstInteraction = () => {
      backgroundMusic.userInteracted();
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    // Add event listeners for various interaction types
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    
    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [backgroundMusic]);

  // Reset when selecting a different canvas
  useEffect(() => {
    // Force reset of transaction state when changing canvases
    setResetKey(prev => prev + 1);
  }, [currentCanvasId]);

  const getCurrentPageColors = () => {
    const startIndex = colorPageIndex * colorsPerPage;
    return paletteColors.slice(startIndex, startIndex + colorsPerPage);
  };

  const handleNextPage = () => {
    setColorPageIndex((prevIndex) => (prevIndex + 1) % totalPages);
  };

  const handlePrevPage = () => {
    setColorPageIndex((prevIndex) => (prevIndex - 1 + totalPages) % totalPages);
  };

  const handleCanvasSelect = useCallback((canvasId: string, canvasData: CanvasData) => {
    setCurrentCanvasId(canvasId);
    setSelectedCanvasData(canvasData);
    setTitle(canvasData.title || '');
    setDescription(canvasData.description || '');
    setIsCurrentCanvasFinished(!!canvasData.finished);
    
    // If canvas is finished, set the SVG data to display in the center
    if (canvasData.finished && canvasData.svgData) {
      setDisplayedSvgData(canvasData.svgData);
    } else {
      setDisplayedSvgData(null);
    }
  }, []);

  const handleColorSelect = (color: { id: number, color: string, name: string }) => {
    setSelectedColor(color.color);
    setSelectedColorIndex(color.id);
  };

  // Handle title and description changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  // Get canvas data for metadata
  const getCanvasData = async (): Promise<CanvasMetadata> => {
    try {
      if (canvasRef.current) {
        const canvasData = canvasRef.current.getCanvasData();
        
        const colorPlacements = Object.values(canvasData.parcels).map((parcel: any) => ({
          x: parcel.coord_x,
          y: parcel.coord_y,
          color: parcel.color_code,
          colorIndex: parcel.color_index
        }));
  
        return { 
          title, 
          description, 
          colorPlacements 
        };
      }
      
      throw new Error("Canvas reference not available");
    } catch (error) {
      console.error("Error getting canvas data:", error);
      return {
        title: '',
        description: '',
        colorPlacements: []
      };
    }
  };

  // Modify the mintCanvasAsSingleNFT function
  const mintCanvasAsSingleNFT = async () => {
    setIsSaveLoading(true);

    // Clear any hash/state left over from a previous save. Without this, hash still held
    // the LAST transaction's (already-confirmed) hash while this new one waited on the
    // wallet, and the effect below would see that stale hash + its real "confirmed" result
    // and mark THIS save complete before it had even been sent.
    resetWriteContract();

    try {
      const { title, description, colorPlacements } = await getCanvasData();

      const { artworkData1, artworkData2 } = convertCanvasForContractArtworkV2(colorPlacements);
      
      // Set the pending canvas ID before initiating transaction
      if (selectedCanvasData?.networkId) {
        setPendingCanvasId(selectedCanvasData.networkId);
      }
      
      // Show status modal immediately with "in progress" state
      setStatusMessage("Processing your canvas...");
      setStatusModalOpen(true);

      const result = await simulateContract(config,{
        abi: gleeV2ABI,
        address: GLEE_V2_CONTRACT_ADDRESS,
        functionName: 'finishCanvas',
        args: [
          BigInt(selectedCanvasData?.networkId!),
          artworkData1,
          artworkData2,
          title,
          description
        ],
        account: userAddress
      });

      writeContract({
        address: GLEE_V2_CONTRACT_ADDRESS,
        abi: gleeV2ABI,
        functionName: 'finishCanvas',
        args: [
          BigInt(selectedCanvasData?.networkId!),
          artworkData1,
          artworkData2,
          title,
          description
        ],
        account: userAddress
      });
    } catch (error) {
      console.log("ERROR MINT AS SINGLE NFT: ", error);
      setStatusMessage("Transaction failed. Please try again.");
      setStatusModalOpen(true);
    } finally {
      setIsSaveLoading(false);
    }
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      query: {
        enabled: hash != null,
        gcTime: 0
      },
      scopeKey: `${hash || ''}-${resetKey}`,
  });

  useEffect(() => {
    if (!hash || pendingCanvasId === null) return;
    
    // Transaction has been initiated
    setStatusMessage("Waiting for confirmation...");
    
    // We only care about confirmed transactions
    if (isConfirmed) {
      setStatusMessage("Transaction confirmed! Reloading your canvas...");
      setTransactionComplete(true);
      
      // Add a short delay to allow the blockchain to fully process before reloading
      setTimeout(async () => {
        // Reload the inventory using the exposed method
        if (canvasInventoryRef.current) {
          try {
            const updatedCanvasses = await canvasInventoryRef.current.reloadCanvases();
            
            // Optionally select the newly updated canvas
            if (pendingCanvasId !== null) {
              // The inventory component will update the canvasList state after reload
              // Wait a bit for the state update to propagate
              setTimeout(() => {
                // Force re-render by changing the current canvas ID
                setCurrentCanvasId(`network-${pendingCanvasId}`);
              }, 500);
            }
          } catch (error) {
            console.error("Error reloading canvas inventory:", error);
          }
        }
      }, 2000); // 2 seconds delay to ensure transaction is fully processed
      
      setStatusMessage("Canvas successfully saved!");
    }
  }, [hash, isConfirmed, pendingCanvasId]);

  // Define our custom modal handling
  const StatusModal = () => {
    // Create a state to store the generated SVG
    const [canvasSvg, setCanvasSvg] = React.useState<string | null>(null);
  
    // Generate SVG when modal opens and transaction completes
    React.useEffect(() => {
      const generateCanvasSvg = async () => {
        if (transactionComplete && canvasRef.current) {
          try {
            const canvasData = canvasRef.current.getCanvasData();
            const colorPlacements = Object.values(canvasData.parcels).map((parcel: any) => ({
              x: parcel.coord_x,
              y: parcel.coord_y,
              color: parcel.color_code,
              colorIndex: parcel.color_index
            }));
            
            // Generate SVG from canvas data
            const svgWidth = 180;
            const svgHeight = 180;
            const cellSize = 20;
            
            let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
              <rect width="${svgWidth}" height="${svgHeight}" fill="white" />`;
            
            colorPlacements.forEach(placement => {
              svgContent += `<rect x="${placement.x * cellSize}" y="${placement.y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${placement.color}" />`;
            });
            
            svgContent += `</svg>`;
            setCanvasSvg(svgContent);
          } catch (error) {
            console.error("Error generating SVG:", error);
          }
        }
      };
      
      generateCanvasSvg();
    }, [transactionComplete]);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="studio-panel w-full max-w-md p-6 text-center"
        >
          <h3 className="font-[family-name:var(--font-fraunces)] text-xl italic text-[var(--foreground)]">Canvas status</h3>
          
          {transactionComplete && canvasSvg && (
            <div className="mt-5 flex justify-center">
              <div 
                className="h-[160px] w-[160px] border border-[var(--border-hairline)] bg-[#fbf8f2]"
                dangerouslySetInnerHTML={{ __html: canvasSvg }}
              />
            </div>
          )}
          
          <div className="mt-5 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--foreground-muted)]">
            {statusMessage}
            {!transactionComplete && (
              <div className="mt-4 flex justify-center">
                <div className="h-px w-24 overflow-hidden bg-[var(--border-hairline)]">
                  <motion.div
                    className="h-full w-1/2 bg-[var(--accent)]"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col items-center gap-2">
            {transactionComplete && (
              <a 
                href={`https://robinhoodchain.blockscout.com/token/${GLEE_V2_CONTRACT_ADDRESS}/instance/${pendingCanvasId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="quiet-button w-full"
              >
                View on OpenSea
              </a>
            )}
            
            <button
              className="quiet-button quiet-button--filled w-full"
              onClick={handleCloseStatusModal}
              disabled={!transactionComplete}
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Modal close handler
  const handleCloseStatusModal = () => {
    // Reset all transaction-related state
    setStatusModalOpen(false);
    setStatusMessage('');
    setTransactionComplete(false);
    setPendingCanvasId(null);
    
    // Force reset of transaction hooks
    setResetKey(prev => prev + 1);
  };

  // Handle canvas erasure
  const closeMintModal = useCallback(() => {
    if (mintCloseTimeoutRef.current) {
      clearTimeout(mintCloseTimeoutRef.current);
      mintCloseTimeoutRef.current = null;
    }
    if (mintReloadTimeoutRef.current) {
      clearTimeout(mintReloadTimeoutRef.current);
      mintReloadTimeoutRef.current = null;
    }
    setMintModalOpen(false);
  }, []);

  const handleMintSuccess = useCallback(() => {
    if (mintReloadTimeoutRef.current) clearTimeout(mintReloadTimeoutRef.current);
    if (mintCloseTimeoutRef.current) clearTimeout(mintCloseTimeoutRef.current);

    // Same reasoning as the finish-canvas flow below: reading canvas ownership immediately
    // after a receipt confirms can still hit a lagging RPC read, so give it a moment first.
    mintReloadTimeoutRef.current = setTimeout(() => {
      void canvasInventoryRef.current?.reloadCanvases();
      mintReloadTimeoutRef.current = null;
    }, 2000);

    mintCloseTimeoutRef.current = setTimeout(() => {
      setMintModalOpen(false);
      mintCloseTimeoutRef.current = null;
    }, 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (mintCloseTimeoutRef.current) clearTimeout(mintCloseTimeoutRef.current);
      if (mintReloadTimeoutRef.current) clearTimeout(mintReloadTimeoutRef.current);
    };
  }, []);

  const handleEraseCanvas = async () => {
    try {
      if (canvasRef.current) {
        // Call the eraseCanvas method exposed by the ColorCanvas component
        canvasRef.current.eraseCanvas();
      }
      setEraseModalOpen(false);
    } catch (error) {
      console.error('Error erasing canvas:', error);
      setEraseModalOpen(false);
    }
  };

  const handleDownloadCanvas = () => {
    try {
      // If showing SVG from a completed canvas, download that SVG as PNG
      if (isCurrentCanvasFinished && displayedSvgData) {
        const svgElement = displayedSvgData;
        
        // Create a temporary container for the SVG
        const container = document.createElement('div');
        container.innerHTML = svgElement;
        const svg = container.firstChild as SVGElement;
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions
        const SCALE = 4; // Higher scale for better quality
        canvas.width = 180 * SCALE; // Match your SVG dimensions
        canvas.height = 180 * SCALE;
        
        // Create an image from the SVG
        const image = new Image();
        
        // SVG to data URL
        const svgBlob = new Blob([svgElement], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        
        image.onload = function() {
          if (ctx) {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            
            // Convert to PNG
            const pngDataUrl = canvas.toDataURL('image/png');
            
            // Download the PNG
            const a = document.createElement('a');
            a.href = pngDataUrl;
            a.download = `${title || 'canvas'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            URL.revokeObjectURL(url);
          }
        };
        
        image.src = url;
      } 
      // Otherwise download the current working canvas
      else if (canvasRef.current) {
        // Get canvas data from the ColorCanvas component
        const canvasData = canvasRef.current.getCanvasData();
        
        // Create a temporary canvas with higher resolution for download
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        // Define dimensions based on your grid
        const GRID_WIDTH = 9;
        const GRID_HEIGHT = 9;
        const PIXEL_SIZE = 20;
        
        // Scale factor for higher quality output
        const scaleFactor = 2;
        
        tempCanvas.width = GRID_WIDTH * PIXEL_SIZE * scaleFactor;
        tempCanvas.height = GRID_HEIGHT * PIXEL_SIZE * scaleFactor;
        
        // Fill background with white
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Draw each colored cell
          Object.values(canvasData.parcels).forEach((parcel: any) => {
            ctx.fillStyle = parcel.color_code;
            ctx.fillRect(
              parcel.coord_x * PIXEL_SIZE * scaleFactor, 
              parcel.coord_y * PIXEL_SIZE * scaleFactor, 
              PIXEL_SIZE * scaleFactor, 
              PIXEL_SIZE * scaleFactor
            );
          });
          
          // Convert to data URL and trigger download
          const dataUrl = tempCanvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${title || 'canvas'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Error downloading canvas:', error);
      setStatusMessage("Failed to download canvas as PNG");
      setStatusModalOpen(true);
    }
  };

  const canvasNumberLabel = selectedCanvasData?.networkId
    ? `No. ${selectedCanvasData.networkId}`
    : 'Unminted preview';

  
  if (!NFT_MINT_LAUNCHED) {
    return (
      <div className="site-shell flex min-h-screen flex-col text-[var(--foreground)]">
        <Header
          toggleMusic={backgroundMusic.toggleMute}
          isMusicMuted={backgroundMusic.isMuted}
          isMusicPlaying={backgroundMusic.isPlaying}
        />
        <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 pt-24 text-center">
          <p className="eyebrow-quiet">Coming soon</p>
          <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
            The studio isn&apos;t open yet.
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-[var(--foreground-muted)]">
            {NFT_NOT_LAUNCHED_MESSAGE}
          </p>
          <Link href="/about">
            <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button quiet-button--filled mt-8 inline-flex px-6 py-3 text-sm">
              Learn about $GLEE
            </motion.span>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)] text-[var(--foreground)]">
      <Header
        toggleMusic={backgroundMusic.toggleMute}
        isMusicMuted={backgroundMusic.isMuted}
        isMusicPlaying={backgroundMusic.isPlaying}
      />
      <main className="mx-auto grid w-full max-w-7xl flex-grow gap-4 px-4 pb-8 pt-24 lg:grid-cols-[250px_minmax(360px,1fr)_300px] lg:items-start lg:px-6">
        <aside className="order-2 flex flex-col gap-4 lg:order-1">
          <CanvasInventoryV2 
            ref={canvasInventoryRef}
            userAddress={userAddress}
            currentCanvasId={currentCanvasId}
            onCanvasSelect={handleCanvasSelect}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          <div className="studio-panel p-4">
            {userAddress ? (
              <button 
                onClick={() => setMintModalOpen(true)}
                className="quiet-button quiet-button--filled w-full"
              >
                Mint a new canvas
              </button>
            ) : (
              <WalletButton 
                iconVersion={false}
                shape=""
                backgroundColor="quiet-button quiet-button--filled"
                paddingX="px-9"
              />
            )}
          </div>
        </aside>
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="order-1 flex min-h-[430px] flex-col items-center justify-center border border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-6 lg:order-2 lg:min-h-[calc(100vh-9rem)]"
        >
          <div className="mb-7 flex w-full max-w-md items-center justify-between">
            <div>
              <p className="eyebrow-quiet">Studio</p>
              <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">Paint your canvas</h1>
            </div>
            <span className="border border-[var(--border-hairline-strong)] px-2 py-1 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">9 × 9</span>
          </div>
          <div className="h-[292px] w-[292px] border border-[var(--border-hairline-strong)] bg-[#fbf8f2] [&_svg]:h-full [&_svg]:w-full sm:h-[364px] sm:w-[364px]">
            {userAddress && currentCanvasId ? (
              isCurrentCanvasFinished && displayedSvgData ? (
                // Display the SVG for finished canvases
                <div 
                  className="h-full w-full flex items-center justify-center bg-[#fbf8f2]"
                  dangerouslySetInnerHTML={{ __html: displayedSvgData }}
                />
              ) : (
                // Interactive canvas for unfinished work
                <ColorCanvas
                  ref={canvasRef}
                  userAddress={userAddress}
                  selectedColor={selectedColor}
                  selectedColorIndex={selectedColorIndex}
                  currentCanvasId={currentCanvasId}
                  onSave={() => {}}
                  readOnly={isCurrentCanvasFinished}
                  canvasData={selectedCanvasData}
                />
              )
            ) : (
              <div className="h-full w-full flex items-center justify-center">
               <ColorCanvas
                  ref={canvasRef}
                  userAddress={userAddress}
                  selectedColor={selectedColor}
                  selectedColorIndex={selectedColorIndex}
                  currentCanvasId={currentCanvasId}
                  onSave={() => {}}
                  readOnly={isCurrentCanvasFinished}
                  canvasData={selectedCanvasData}
                />
              </div>
            )}
          </div>
          <p className="plaque mt-4 text-sm">{canvasNumberLabel} — {title || 'untitled'}</p>
          <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-[var(--foreground-muted)]">Choose a color, place pixels, and give your creation a name when it feels complete.</p>
        </motion.section>
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
          className="order-3 flex flex-col gap-4"
        >
          <div className="studio-panel p-4">
            <h2 className="studio-label">Artwork details</h2>
            <label className="studio-label mt-5 block">Title</label>
            <input
              type="text"
              className="studio-input"
              placeholder="Artwork title..."
              value={title}
              onChange={handleTitleChange}
              disabled={!currentCanvasId || isCurrentCanvasFinished}
              required
            />
            <label className="studio-label mt-4 block">Description</label>
            <textarea
              className="studio-input h-28 resize-none"
              placeholder="Enter description..."
              value={description}
              onChange={handleDescriptionChange}
              disabled={!currentCanvasId || isCurrentCanvasFinished}
            />
          </div>
          {/* Color palette */}
          <div className="studio-panel p-4">
            <h2 className="studio-label mb-2">Palette</h2>
            <p className="mb-4 text-xs leading-relaxed text-[var(--foreground-muted)]">
              {gatedColorCount} colors (marked <span className="text-[var(--accent)]">✦</span>) will require holding
              $GLEE once gating goes live. Not enforced yet — every color is open to paint with for now.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {getCurrentPageColors().map((color) => (
                <button
                  key={color.id}
                  aria-label={`Select ${color.name}${color.gated ? ' (token-gated, not yet enforced)' : ''}`}
                  onClick={() => handleColorSelect(color)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="relative block">
                    <motion.span
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="block h-8 w-8 rounded-full border"
                      style={{
                        backgroundColor: color.color,
                        borderColor: color.color === '#FFFFFF' ? 'var(--border-hairline-strong)' : 'var(--border-hairline)',
                        boxShadow: selectedColor === color.color ? '0 0 0 2px var(--background-2), 0 0 0 3px var(--accent)' : 'none',
                      }}
                    />
                    {color.gated && (
                      <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--accent)] text-[8px] leading-none text-[var(--background)]" aria-hidden="true">
                        ✦
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[var(--foreground-muted)]">{color.name}</span>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button onClick={handlePrevPage} className="quiet-button px-3 py-1 text-xs">←</button>
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--foreground-muted)]">
                  {colorPageIndex + 1} / {totalPages}
                </span>
                <button onClick={handleNextPage} className="quiet-button px-3 py-1 text-xs">→</button>
              </div>
            )}
          </div>
          {/* Action buttons */}
          <div className="studio-panel p-4">
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadCanvas}
                disabled={!currentCanvasId}
                className="quiet-button py-3 text-sm"
              >
                Download PNG
              </motion.button>
              {!isCurrentCanvasFinished && (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setEraseModalOpen(true)}
                  disabled={!currentCanvasId || isCurrentCanvasFinished}
                  className="quiet-button quiet-button--danger py-3 text-sm"
                >
                  Erase
                </motion.button>
              )}
              {!isCurrentCanvasFinished && (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={mintCanvasAsSingleNFT}
                  disabled={!currentCanvasId || isSaveLoading || isCurrentCanvasFinished}
                  className="quiet-button quiet-button--filled col-span-2 py-3 text-sm"
                >
                  {isSaveLoading ? 'Saving…' : 'Finish the canvas'}
                </motion.button>
              )}
            </div>
          </div>
        </motion.aside>
      </main>
      
      {/* Modals */}
      <AnimatePresence>
        {eraseModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="studio-panel w-full max-w-md p-6"
            >
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl italic text-[var(--foreground)] mb-3">Erase canvas</h3>
              <p className="mb-6 text-sm text-[var(--foreground-muted)]">Are you sure you want to erase this canvas? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button className="quiet-button px-4 py-2 text-sm" onClick={() => setEraseModalOpen(false)}>Cancel</button>
                <button className="quiet-button quiet-button--danger px-4 py-2 text-sm" onClick={handleEraseCanvas}>Erase</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {statusModalOpen && <StatusModal />}
      </AnimatePresence>
      
      <AnimatePresence>
        {mintModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="studio-panel w-full max-w-md p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-fraunces)] text-xl italic text-[var(--foreground)]">Mint a new canvas</h3>
                <button 
                  onClick={closeMintModal}
                  className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <MintCanvasV2 onMintSuccess={handleMintSuccess} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Studio;