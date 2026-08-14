"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Address } from 'viem';
import { 
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { createConfig } from '@wagmi/core';
import { http } from '@wagmi/core';
import { injected } from '@wagmi/core';
import { baseSepolia, BASE_SEPOLIA_RPC_URL } from '../../../utils/chain';

import Header from '../Header/Header';
import ColorCanvas from '../ColorCanvas/ColorCanvas';
import WalletButton from "../WalletButton/WalletButton";
import CanvasInventory from '../CanvasInventory/CanvasInventory';

import useSoundEffect from '@/hooks/useSoundEffect';
import useBackgroundMusic from '@/hooks/useBackgroundMusic';

import { CanvasData } from '@/types';

import { convertCanvasForContractArtwork } from '../../../utils/swissknife';
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from '../../../utils/contractAbi';
import MintCanvas from '../MintCanvas/MintCanvas';

interface EmojiTownMainPageProps {
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

const ALCHEMY_ID = process.env.NEXT_PUBLIC_ALCHEMY_ID as string;

const ColorTownCreate: React.FC<EmojiTownMainPageProps> = ({ userAddress }) => {
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

  // Sound effect hooks
  const interactionSound = useSoundEffect('/sounds/interaction.mp3');
  const saveSound = useSoundEffect('/sounds/save.mp3');
  const eraseSound = useSoundEffect('/sounds/erase.mp3');

  // Background music hook
  const backgroundMusic = useBackgroundMusic('/sounds/bluedanube.mp3', { volume: 0.2 });

  const { data: hash, isPending, writeContract } = useWriteContract();

  const canvasRef = useRef<ColorCanvasRef>(null);
  const isMounted = useRef(false);
  const canvasInventoryRef = useRef<{ reloadCanvases: () => Promise<any[]> }>(null);

  
  useEffect(() => {
    isMounted.current = true;
  }, []);

  const basicColors = [
    { id: 0, color: '#FFFFFF' },  // White
    { id: 1, color: '#06BA63' },  // Green emerald
    { id: 2, color: '#FFC0CB' },  // Pink
    { id: 3, color: '#FF0000' },  // Red
    { id: 4, color: '#000000' },  // Black
    { id: 5, color: '#0052FF' },  // Electric blue
    { id: 6, color: '#EAC70D' },  // Garden gold
    { id: 7, color: '#FC7A1E' }   // Pumpkin
  ];

  //#8A63D2
  //FC7A1E

  // Create config for contract calls
  const config = createConfig({
    chains: [baseSepolia],
    connectors: [injected()],
    ssr: true,
    transports: {
      [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL)
    }
  });

  // Color picker carousel configuration
  const colorsPerPage = 12;
  const totalPages = Math.ceil(basicColors.length / colorsPerPage);

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

  // Helper function to trigger both sound and mark user interaction
  const playInteractionSound = () => {
    interactionSound.play();
    backgroundMusic.userInteracted();
  };

  const getCurrentPageColors = () => {
    const startIndex = colorPageIndex * colorsPerPage;
    return basicColors.slice(startIndex, startIndex + colorsPerPage);
  };

  const handleNextPage = () => {
    setColorPageIndex((prevIndex) => (prevIndex + 1) % totalPages);
    playInteractionSound();
  };

  const handlePrevPage = () => {
    setColorPageIndex((prevIndex) => (prevIndex - 1 + totalPages) % totalPages);
    playInteractionSound();
  };

  const handleCanvasSelect = (canvasId: string, canvasData: CanvasData) => {
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
  };

  const handleColorSelect = (color: { id: number, color: string }) => {
    setSelectedColor(color.color);
    setSelectedColorIndex(color.id);
    playInteractionSound();
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
    
    try {
      saveSound.play();

      const { title, description, colorPlacements } = await getCanvasData();

      const { artworkData } = convertCanvasForContractArtwork(colorPlacements);
      
      // Set the pending canvas ID before initiating transaction
      if (selectedCanvasData?.networkId) {
        setPendingCanvasId(selectedCanvasData.networkId);
      }
      
      // Show status modal immediately with "in progress" state
      setStatusMessage("Processing your canvas...");
      setStatusModalOpen(true);

      const result = await simulateContract(config,{
        abi: pixelatedDelightsABI,
        address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
        functionName: 'finishCanvas',
        args: [
          BigInt(selectedCanvasData?.networkId!),
          artworkData,
          title,
          description
        ],
        account: userAddress
      });

      writeContract({
        address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
        abi: pixelatedDelightsABI,
        functionName: 'finishCanvas',
        args: [
          BigInt(selectedCanvasData?.networkId!),
          artworkData,
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
      saveSound.play();
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

  /*

  // Separate hook to track transaction status
  useEffect(() => {
    if (!hash || pendingCanvasId === null) return;
    
    // Transaction has been initiated
    setStatusMessage("Waiting for confirmation...");
    
    // We only care about confirmed transactions
    if (isConfirmed) {
      setStatusMessage("Transaction confirmed! Reloading your canvas...");
      setTransactionComplete(true);
      
      // Reload will be handled by the inventory component
      setStatusMessage("Canvas successfully saved!");
    }
  }, [hash, isConfirmed, pendingCanvasId]);
  */

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
            console.log("Canvas inventory reloaded successfully", updatedCanvasses);
            
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full text-center">
          <h3 className="text-xl font-bold text-white mb-4 font-[family-name:var(--font-pixelify-sans)]">Canvas Status</h3>
          
          {/* Display the dynamically generated canvas SVG if transaction is complete */}
          {transactionComplete && canvasSvg && (
            <div className="mb-4 flex justify-center">
              <div 
                className="h-[180px] w-[180px] border-2 border-gray-700 bg-white"
                dangerouslySetInnerHTML={{ __html: canvasSvg }}
              />
            </div>
          )}
          
          <div className="text-gray-300 mb-6 font-[family-name:var(--font-pixelify-sans)]">
            {statusMessage}
            {!transactionComplete && (
              <div className="mt-4 animate-pulse">
                <div className="h-2 bg-blue-500 rounded w-24 mx-auto"></div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-3">
            {transactionComplete && (
              <a 
                href={`https://robinhoodchain.blockscout.com/token/${PIXELATED_DELIGHTS_CONTRACT_ADDRESS}/instance/${pendingCanvasId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-[family-name:var(--font-pixelify-sans)] w-full"
              >
                View on OpenSea
              </a>
            )}
            
            <button
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${!transactionComplete ? 'opacity-50 cursor-not-allowed' : ''} font-[family-name:var(--font-pixelify-sans)] w-full`}
              onClick={handleCloseStatusModal}
              disabled={!transactionComplete}
            >
              OK
            </button>
          </div>
        </div>
      </div>
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
  const handleEraseCanvas = async () => {
    try {
      eraseSound.play();
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

  return (
    <div className="site-shell min-h-screen flex flex-col font-[family-name:var(--font-pixelify-sans)] text-white">
      <Header
        toggleSound={interactionSound.toggleMute}
        isSoundMuted={interactionSound.isMuted}
        toggleMusic={backgroundMusic.toggleMute}
        isMusicMuted={backgroundMusic.isMuted}
        isMusicPlaying={backgroundMusic.isPlaying}
      />
      <main className="mx-auto grid w-full max-w-7xl flex-grow gap-4 px-4 pb-8 pt-24 lg:grid-cols-[250px_minmax(360px,1fr)_300px] lg:items-start lg:px-6">
        <aside className="order-2 flex flex-col gap-4 lg:order-1">
          <CanvasInventory 
            ref={canvasInventoryRef}
            userAddress={userAddress}
            currentCanvasId={currentCanvasId}
            onCanvasSelect={handleCanvasSelect}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            interactionSound={interactionSound}
          />
          <div className="studio-panel p-4">
            {userAddress ? (
              <button 
                onClick={() => setMintModalOpen(true)}
                className="w-full bg-[#f8d65d] py-3 text-[#08101c] shadow-[4px_4px_0_rgba(0,0,0,.3)] transition hover:-translate-y-0.5"
              >
                MINT A NEW CANVAS ↗
              </button>
            ) : (
              <WalletButton 
                iconVersion={false}
                shape="rounded-none"
                backgroundColor="bg-[#a8f85b]"
                paddingX="px-9"
              />
            )}
          </div>
        </aside>
        <section className="order-1 flex min-h-[430px] flex-col items-center justify-center border border-white/10 bg-[#08111f]/75 p-6 shadow-[10px_10px_0_rgba(0,0,0,.2)] lg:order-2 lg:min-h-[calc(100vh-9rem)]">
          <div className="mb-7 flex w-full max-w-md items-center justify-between"><div><p className="eyebrow">Glee studio</p><h1 className="mt-1 text-2xl">Paint your canvas</h1></div><span className="border border-[#a8f85b]/50 px-2 py-1 text-xs text-[#a8f85b]">9 × 9</span></div>
        <div className="h-[292px] w-[292px] border-4 border-[#a8f85b] bg-white shadow-[8px_8px_0_rgba(0,0,0,.35)] [&_svg]:h-full [&_svg]:w-full sm:h-[364px] sm:w-[364px]">
          {userAddress && currentCanvasId ? (
            isCurrentCanvasFinished && displayedSvgData ? (
              // Display the SVG for finished canvases
              <div 
                className="h-full w-full flex items-center justify-center bg-white"
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
        <p className="mt-7 max-w-md text-center text-sm leading-relaxed text-slate-400">Choose a color, place pixels, and give your creation a name when it feels complete.</p>
        </section>
        <aside className="order-3 flex flex-col gap-4">
          <div className="studio-panel p-4">
            <h2 className="studio-label">Artwork details</h2>
            <label className="studio-label mt-5 block">Title</label>
            <input
              type="text"
              className="studio-input"
              placeholder="ARTWORK TITLE..."
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
            <h2 className="studio-label">Palette</h2>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {getCurrentPageColors().map((color) => (
                <button
                  key={color.id}
                  aria-label={`Select ${color.color} paint`}
                  className={`w-full aspect-square cursor-pointer border border-white/20 shadow-[2px_2px_0_rgba(0,0,0,.28)] ${
                    selectedColor === color.color ? 'ring-2 ring-[#a8f85b] ring-offset-2 ring-offset-[#0d1827]' : ''
                  }`}
                  style={{ backgroundColor: color.color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between mt-2">
                <button 
                  onClick={handlePrevPage}
                  className="border border-white/15 bg-white/5 px-3 py-1 text-white hover:bg-white/10"
                >
                  ←
                </button>
                <span className="text-white">
                  {colorPageIndex + 1} / {totalPages}
                </span>
                <button 
                  onClick={handleNextPage}
                  className="border border-white/15 bg-white/5 px-3 py-1 text-white hover:bg-white/10"
                >
                  →
                </button>
              </div>
            )}
          </div>
          {/* Action buttons */}
          <div className="studio-panel p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadCanvas}
                disabled={!currentCanvasId}
                className={`py-3 ${!currentCanvasId ? 'bg-slate-700 cursor-not-allowed' : 'bg-[#295dd9] hover:bg-[#3b70eb]'} text-white shadow-[3px_3px_0_rgba(0,0,0,.24)]`}
              >
                DOWNLOAD PNG
              </button>
              {!isCurrentCanvasFinished && (
                <button
                  onClick={() => setEraseModalOpen(true)}
                  disabled={!currentCanvasId || isCurrentCanvasFinished}
                  className={`py-3 ${!currentCanvasId || isCurrentCanvasFinished ? 'bg-slate-700 cursor-not-allowed' : 'bg-[#cf4f51] hover:bg-[#e25f61]'} text-white shadow-[3px_3px_0_rgba(0,0,0,.24)]`}
                >
                  ERASE
                </button>
              )}
              {!isCurrentCanvasFinished && (
                <button
                  onClick={mintCanvasAsSingleNFT}
                  disabled={!currentCanvasId || isSaveLoading || isCurrentCanvasFinished}
                  className={`col-span-2 py-3 ${!currentCanvasId || isSaveLoading || isCurrentCanvasFinished ? 'bg-slate-700 cursor-not-allowed' : 'bg-[#a8f85b] hover:bg-[#c0ff7f]'} text-[#08101c] shadow-[3px_3px_0_rgba(0,0,0,.24)]`}
                >
                  {isSaveLoading ? 'SAVING...' : 'FINISH THE CANVAS'}
                </button>
              )}
            </div>
          </div>
        </aside>
      </main>
      
      {/* Modals */}
      {eraseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="studio-panel w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Erase Canvas</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to erase this canvas? This action cannot be undone.</p>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded mr-4 hover:bg-gray-700"
                onClick={() => setEraseModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={handleEraseCanvas}
              >
                Erase
              </button>
            </div>
          </div>
        </div>
      )}
      
      {statusModalOpen && <StatusModal />}
      
      {mintModalOpen && (
        <div className="fixed inset-0 bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Mint New Canvas</h3>
              <button 
                onClick={() => setMintModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <MintCanvas
              basePrice={0.0011}
              onMintSuccess={() => {
                // Call the reloadCanvases method on the inventory component
                canvasInventoryRef.current?.reloadCanvases();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorTownCreate;
