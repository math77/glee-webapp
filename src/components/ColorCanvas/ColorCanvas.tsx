/*
"use client"

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Address } from 'viem';

import { Parcel, CanvasData } from '@/types';

/*
interface Parcel {
  coord_x: number;
  coord_y: number;
  color_code: string;
}

// Type for canvas data
type CanvasData = {
  id: string;
  title: string;
  description: string;
  parcels: {[key: string]: Parcel};
  finished?: boolean;
  networkId?: number;
};
*&/

// Type for props
type ColorCanvasProps = {
  userAddress: Address;
  onSave?: (canvasData: CanvasData) => void;
  onColorSelected?: (color: string) => void;
  selectedColor?: string;
  selectedColorIndex?: number;
  currentCanvasId?: string;
  readOnly: boolean;
  canvasData?: CanvasData;
};

// Grid dimensions
const GRID_WIDTH = 9;
const GRID_HEIGHT = 9;
const PIXEL_SIZE = 20;

const ColorCanvas = forwardRef<
  { 
    saveCanvas: () => void; 
    getCanvasData: () => CanvasData;
    eraseCanvas: () => void;
  },
  ColorCanvasProps
>(({ 
  userAddress, 
  onSave, 
  onColorSelected, 
  selectedColor,
  selectedColorIndex,
  currentCanvasId = 'default-canvas', 
  readOnly, 
  canvasData: initialCanvasData 
}, ref) => {

  // State for storing the parcels data
  const [parcels, setParcels] = useState<{[key: string]: Parcel}>({});
  // State for canvas metadata
  const [canvasTitle, setCanvasTitle] = useState<string>('');
  const [canvasDescription, setCanvasDescription] = useState<string>('');
  // State for loading indication
  const [isLoading, setIsLoading] = useState(true);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    saveCanvas: () => {
      if (onSave) {
        onSave({
          id: currentCanvasId,
          title: canvasTitle,
          description: canvasDescription,
          parcels: parcels
        });
      }
    },
    getCanvasData: () => ({
      id: currentCanvasId,
      title: canvasTitle,
      description: canvasDescription,
      parcels: parcels
    }),
    eraseCanvas: () => {
      // Clear all parcels
      setParcels({});
    }
  }));

  // Initialize or update canvas data when props change
  useEffect(() => {
    if (initialCanvasData) {
      setParcels(initialCanvasData.parcels || {});
      setCanvasTitle(initialCanvasData.title || '');
      setCanvasDescription(initialCanvasData.description || '');
      setIsLoading(false);
    } else {
      // Initialize empty canvas when no data is provided
      setParcels({});
      setCanvasTitle('');
      setCanvasDescription('');
      setIsLoading(false);
    }
  }, [initialCanvasData, currentCanvasId]);

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    if (readOnly) return;
    
    if (selectedColor) {
      // Place the selected color directly
      updateParcelWithColor(x, y, selectedColor, selectedColorIndex!);
    }
  };

  // Update parcel with color
  const updateParcelWithColor = (x: number, y: number, color: string, colorIndex: number) => {
    const cellKey = `${x}-${y}`;
    const updatedParcels = { ...parcels };
    
    updatedParcels[cellKey] = {
      coord_x: x,
      coord_y: y,
      color_code: color,
      color_index: colorIndex
    };
    
    // Update state
    setParcels(updatedParcels);
  };

  // Render grid cells using SVG
  const renderSVGGrid = () => {
    const cells = [];
    
    // Background grid
    cells.push(
      <rect 
        key="grid-bg" 
        width={GRID_WIDTH * PIXEL_SIZE} 
        height={GRID_HEIGHT * PIXEL_SIZE} 
        fill="white" 
        stroke="#ccc" 
        strokeWidth="1"
      />
    );
    
    // Create grid cells
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cellKey = `${x}-${y}`;
        const parcel = parcels[cellKey];
        
        // Cell rectangle
        cells.push(
          <rect
            key={`rect-${cellKey}`}
            x={x * PIXEL_SIZE}
            y={y * PIXEL_SIZE}
            width={PIXEL_SIZE}
            height={PIXEL_SIZE}
            fill="#f8f5f0"
            stroke="none"
            strokeOpacity={0.3}
            strokeWidth={1}
            onClick={() => handleCellClick(x, y)}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          />
        );
        
        // Color fill
        if (parcel) {
          cells.push(
            <rect
              key={`rect-fill-${cellKey}`}
              x={x * PIXEL_SIZE}
              y={y * PIXEL_SIZE}
              width={PIXEL_SIZE}
              height={PIXEL_SIZE}
              fill={parcel.color_code}
              stroke="none"
              strokeOpacity={0.2}
              strokeWidth={1}
              onClick={() => handleCellClick(x, y)}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}
            />
          );
        }
      }
    }
    
    return cells;
  };

  return (
    <div className="relative h-full w-full">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
          <div className="text-lg text-black font-semibold">Loading Grid...</div>
        </div>
      ) : (
        <svg 
          width="100%"
          height="100%"
          viewBox={`0 0 ${GRID_WIDTH * PIXEL_SIZE} ${GRID_HEIGHT * PIXEL_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label="9 by 9 pixel canvas"
        >
          {renderSVGGrid()}
        </svg>
      )}
    </div>
  );
});

export default ColorCanvas;
*/

"use client"

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Address } from 'viem';

import { Parcel, CanvasData } from '@/types';

// Type for props
type ColorCanvasProps = {
  userAddress: Address;
  onSave?: (canvasData: CanvasData) => void;
  onColorSelected?: (color: string) => void;
  selectedColor?: string;
  selectedColorIndex?: number;
  currentCanvasId?: string;
  readOnly: boolean;
  canvasData?: CanvasData;
};

// Grid dimensions
const GRID_WIDTH = 9;
const GRID_HEIGHT = 9;
const PIXEL_SIZE = 20;

// Unpainted cells sit on this paper tone — kept deliberately close to white since it's
// also the background the finished artwork is rendered against elsewhere in the app.
const PAPER = '#fbf8f2';

const ColorCanvas = forwardRef<
  { 
    saveCanvas: () => void; 
    getCanvasData: () => CanvasData;
    eraseCanvas: () => void;
  },
  ColorCanvasProps
>(({ 
  userAddress, 
  onSave, 
  onColorSelected, 
  selectedColor,
  selectedColorIndex,
  currentCanvasId = 'default-canvas', 
  readOnly, 
  canvasData: initialCanvasData 
}, ref) => {

  // State for storing the parcels data
  const [parcels, setParcels] = useState<{[key: string]: Parcel}>({});
  // State for canvas metadata
  const [canvasTitle, setCanvasTitle] = useState<string>('');
  const [canvasDescription, setCanvasDescription] = useState<string>('');
  // State for loading indication
  const [isLoading, setIsLoading] = useState(true);
  // Cell currently under the pointer, so we can preview the selected color before it's placed
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    saveCanvas: () => {
      if (onSave) {
        onSave({
          id: currentCanvasId,
          title: canvasTitle,
          description: canvasDescription,
          parcels: parcels
        });
      }
    },
    getCanvasData: () => ({
      id: currentCanvasId,
      title: canvasTitle,
      description: canvasDescription,
      parcels: parcels
    }),
    eraseCanvas: () => {
      // Clear all parcels
      setParcels({});
    }
  }));

  // Initialize or update canvas data when props change
  useEffect(() => {
    if (initialCanvasData) {
      setParcels(initialCanvasData.parcels || {});
      setCanvasTitle(initialCanvasData.title || '');
      setCanvasDescription(initialCanvasData.description || '');
      setIsLoading(false);
    } else {
      // Initialize empty canvas when no data is provided
      setParcels({});
      setCanvasTitle('');
      setCanvasDescription('');
      setIsLoading(false);
    }
  }, [initialCanvasData, currentCanvasId]);

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    if (readOnly) return;
    
    if (selectedColor) {
      // Place the selected color directly
      updateParcelWithColor(x, y, selectedColor, selectedColorIndex!);
    }
  };

  // Update parcel with color
  const updateParcelWithColor = (x: number, y: number, color: string, colorIndex: number) => {
    const cellKey = `${x}-${y}`;
    const updatedParcels = { ...parcels };
    
    updatedParcels[cellKey] = {
      coord_x: x,
      coord_y: y,
      color_code: color,
      color_index: colorIndex
    };
    
    // Update state
    setParcels(updatedParcels);
  };

  // Render grid cells using SVG
  const renderSVGGrid = () => {
    const cells = [];
    
    // Background grid
    cells.push(
      <rect 
        key="grid-bg" 
        width={GRID_WIDTH * PIXEL_SIZE} 
        height={GRID_HEIGHT * PIXEL_SIZE} 
        fill={PAPER}
        stroke="none"
      />
    );
    
    // Create grid cells
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cellKey = `${x}-${y}`;
        const parcel = parcels[cellKey];
        const isHovered = hoveredCell === cellKey;
        const canPreview = !readOnly && !parcel && isHovered && selectedColor;

        // Cell rectangle — carries the hairline grid and hover/click handling
        cells.push(
          <rect
            key={`rect-${cellKey}`}
            x={x * PIXEL_SIZE}
            y={y * PIXEL_SIZE}
            width={PIXEL_SIZE}
            height={PIXEL_SIZE}
            fill="transparent"
            stroke="rgba(20,18,15,0.06)"
            strokeWidth={1}
            onClick={() => handleCellClick(x, y)}
            onMouseEnter={() => setHoveredCell(cellKey)}
            onMouseLeave={() => setHoveredCell((current) => (current === cellKey ? null : current))}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          />
        );
        
        // Color fill — painted color if present, otherwise a soft preview of the color about to be placed
        cells.push(
          <motion.rect
            key={`rect-fill-${cellKey}`}
            x={x * PIXEL_SIZE}
            y={y * PIXEL_SIZE}
            width={PIXEL_SIZE}
            height={PIXEL_SIZE}
            fill={parcel ? parcel.color_code : (selectedColor || PAPER)}
            initial={false}
            animate={{
              opacity: parcel ? 1 : canPreview ? 0.35 : 0,
              scale: parcel ? 1 : 0.9,
            }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center', pointerEvents: 'none' }}
          />
        );
      }
    }
    
    return cells;
  };

  return (
    <div className="relative h-full w-full">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background-2)]">
          <div className="plaque text-sm">Preparing the canvas…</div>
        </div>
      ) : (
        <motion.svg 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          width="100%"
          height="100%"
          viewBox={`0 0 ${GRID_WIDTH * PIXEL_SIZE} ${GRID_HEIGHT * PIXEL_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label="9 by 9 pixel canvas"
        >
          {renderSVGGrid()}
        </motion.svg>
      )}
    </div>
  );
});

ColorCanvas.displayName = 'ColorCanvas';

export default ColorCanvas;