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
*/

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
