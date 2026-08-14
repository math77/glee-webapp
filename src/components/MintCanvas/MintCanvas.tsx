/*
"use client";

import React, { useEffect, useState } from 'react';

import { 
  type BaseError,
  useWriteContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useReadContract
} from 'wagmi';

import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from '../../../utils/contractAbi';
import { parseEther } from 'viem';

import Pending from '../Pending/Pending';
import useSoundEffect from '@/hooks/useSoundEffect';

interface MintCanvasProps {
  basePrice: number;
}

const MintCanvas: React.FC<MintCanvasProps> = ({
  basePrice = 0.0011
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isMintPeriodOver, setIsMintPeriodOver] = useState<boolean>(false);
  
  const mintSuccessSound = useSoundEffect('/sounds/mintsuccess.mp3');

  const { data: hash, error, isPending, writeContract } = useWriteContract();
  
  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };
  
  const handleDecrement = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };
  
  // Calculate the total price
  const totalPrice = basePrice * quantity;
  
  // Format the price string correctly
  const formattedPrice = totalPrice >= 1 
    ? totalPrice.toFixed(1) // Show 1 decimal place when ≥ 1 ETH
    : totalPrice.toFixed(4); // Show 4 decimal places when < 1 ETH

  const { data: simulateData, error: simulateError, isPending: isSimulatePending } = useSimulateContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'mintCanvas',
    args: [BigInt(quantity)],
    value: parseEther(String(totalPrice))
  });

  console.log("ERROR (data): ", simulateData);
  console.log("ERROR (error): ", simulateError);

  // Check if there's an insufficient funds error
  const hasInsufficientFundsError = simulateError && 
    (simulateError.message.includes("insufficient funds") || 
     (simulateError as any)?.shortMessage?.includes("insufficient funds"));
  
  
  const walletNotConnectedsError = simulateError && 
    (simulateError.message.includes("Connector not connected") || 
      (simulateError as any)?.shortMessage?.includes("Connector not connected."));


  const { data, isLoading: isConfirmingMintCanvas, isSuccess: isConfirmedMintCanvas } =
    useWaitForTransactionReceipt({
      hash,
    }
  );

  const { data: totalMintedSoFar, error: totalSupplyError, isPending: totalSupplyIsPending } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'totalSupply',
  });
  
  const { data: timeToEndMint, error: errorToGetTime, isPending: pendingTime } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'mintEndTime',
  });

  // Update countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const difference = Number(timeToEndMint) - now;
      
      if (difference <= 0) {
        // Mint period has ended
        setTimeLeft("Mint period ended");
        setIsMintPeriodOver(true);
        return;
      }
      
      setIsMintPeriodOver(false);
      
      // Calculate days, hours, minutes and seconds
      const days = Math.floor(difference / (60 * 60 * 24));
      const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);
      const seconds = difference % 60;
      
      // Format the time string
      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;
      
      setTimeLeft(timeString);
    };

    // Initial calculation
    calculateTimeLeft();
    
    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Clean up
    return () => clearInterval(timer);
  }, [timeToEndMint]);

  useEffect(() => {
    if (isConfirmedMintCanvas) {
      mintSuccessSound.play();
    }
  }, [isConfirmedMintCanvas]); 

  // Determine if the mint button should be disabled
  const isMintButtonDisabled = isPending || isSimulatePending || isConfirmingMintCanvas || isMintPeriodOver || hasInsufficientFundsError;

  return (
    <div className="max-w-md mx-auto p-6 border-1 border-white border-dashed shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl text-white font-bold tracking-tight font-[family-name:var(--font-pixelify-sans)]">{formattedPrice} ETH</h1>
        </div>
        
        <div className="flex flex-col border rounded-lg">
          <button 
            onClick={handleIncrement}
            className="px-4 py-2 border-b hover:bg-emerald-500"
            aria-label="Increase quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <div className="px-6 py-2 text-white text-center font-[family-name:var(--font-pixelify-sans)]">
            {quantity}
          </div>
          
          <button 
            onClick={handleDecrement}
            className="px-4 py-2 border-t hover:bg-emerald-500"
            aria-label="Decrease quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <button 
        className={`flex justify-center items-center w-full bg-white text-black py-4 px-6 rounded-lg mb-6 transition-colors font-semibold font-[family-name:var(--font-pixelify-sans)] ${isMintButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-500'}`}
        disabled={isMintButtonDisabled}
        onClick={() => 
          writeContract({
            address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
            abi: pixelatedDelightsABI,
            functionName: 'mintCanvas',
            args: [BigInt(quantity)],
            value: parseEther(String(totalPrice))
          })
        }
      >
        {isPending || isConfirmingMintCanvas || isSimulatePending ? <Pending className="animate-spin"/> : "Mint"}
      </button>
      
      <div className="mt-8">
        <div className="flex justify-between text-white text-sm mb-2">
          <span className="font-[family-name:var(--font-pixelify-sans)] text-base">{totalMintedSoFar?.toLocaleString()} minted</span>
          <span className="font-[family-name:var(--font-pixelify-sans)] text-base">Time left: {timeLeft}</span>
        </div>
      </div>
      {isConfirmedMintCanvas &&
        <p className="text-center text-green-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Success! <br/>
          Your minted {quantity} canvas
        </p>
      }
      {walletNotConnectedsError &&
        <p className="text-center text-yellow-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Please, connect your wallet!
        </p>
      }
      {hasInsufficientFundsError &&
        <p className="text-center text-red-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Insufficient funds for gas and mint price.
        </p>
      }
      {isMintPeriodOver &&
        <p className="text-center text-amber-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Mint period has ended
        </p>
      }
    </div>
  );
};

export default MintCanvas;
*/

"use client";

import React, { useEffect, useState, useRef } from 'react';

import { 
  type BaseError,
  useWriteContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useReadContract
} from 'wagmi';

import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from '../../../utils/contractAbi';
import { parseEther } from 'viem';

import Pending from '../Pending/Pending';
import useSoundEffect from '@/hooks/useSoundEffect';

interface MintCanvasProps {
  basePrice: number;
  onMintSuccess?: () => void; // New prop for handling successful mints
}

const MintCanvas: React.FC<MintCanvasProps> = ({
  basePrice = 0.0011,
  onMintSuccess
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isMintPeriodOver, setIsMintPeriodOver] = useState<boolean>(false);
  const mintProcessedRef = useRef<boolean>(false);
  
  const mintSuccessSound = useSoundEffect('/sounds/mintsuccess.mp3');

  const { data: hash, error, isPending, writeContract } = useWriteContract();
  
  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };
  
  const handleDecrement = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };
  
  // Calculate the total price
  const totalPrice = basePrice * quantity;
  
  // Format the price string correctly
  const formattedPrice = totalPrice >= 1 
    ? totalPrice.toFixed(1) // Show 1 decimal place when ≥ 1 ETH
    : totalPrice.toFixed(4); // Show 4 decimal places when < 1 ETH

  const { data: simulateData, error: simulateError, isPending: isSimulatePending } = useSimulateContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'mintCanvas',
    args: [BigInt(quantity)],
    value: parseEther(String(totalPrice))
  });

  // Check if there's an insufficient funds error
  const hasInsufficientFundsError = simulateError && 
    (simulateError.message.includes("insufficient funds") || 
     (simulateError as any)?.shortMessage?.includes("insufficient funds"));
  
  
  const walletNotConnectedsError = simulateError && 
    (simulateError.message.includes("Connector not connected") || 
      (simulateError as any)?.shortMessage?.includes("Connector not connected."));


  const { data, isLoading: isConfirmingMintCanvas, isSuccess: isConfirmedMintCanvas } =
    useWaitForTransactionReceipt({
      hash,
    }
  );

  // Reset the processed state when starting a new transaction
  useEffect(() => {
    if (hash) {
      mintProcessedRef.current = false;
    }
  }, [hash]);

  const { data: totalMintedSoFar, error: totalSupplyError, isPending: totalSupplyIsPending } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'totalSupply',
  });
  
  const { data: timeToEndMint, error: errorToGetTime, isPending: pendingTime } = useReadContract({
    abi: pixelatedDelightsABI,
    address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
    functionName: 'mintEndTime',
  });

  // Update countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const difference = Number(timeToEndMint) - now;
      
      if (difference <= 0) {
        // Mint period has ended
        setTimeLeft("Mint period ended");
        setIsMintPeriodOver(true);
        return;
      }
      
      setIsMintPeriodOver(false);
      
      // Calculate days, hours, minutes and seconds
      const days = Math.floor(difference / (60 * 60 * 24));
      const hours = Math.floor((difference % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((difference % (60 * 60)) / 60);
      const seconds = difference % 60;
      
      // Format the time string
      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;
      
      setTimeLeft(timeString);
    };

    // Initial calculation
    calculateTimeLeft();
    
    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Clean up
    return () => clearInterval(timer);
  }, [timeToEndMint]);

  useEffect(() => {
    if (isConfirmedMintCanvas && !mintProcessedRef.current) {
      // Mark this mint as processed
      mintProcessedRef.current = true;
      
      // Play sound
      mintSuccessSound.play();
      
      // Call the onMintSuccess callback if it exists
      if (onMintSuccess && typeof onMintSuccess === 'function') {
        onMintSuccess();
      }
    }
  }, [isConfirmedMintCanvas, onMintSuccess, mintSuccessSound]); 

  // Determine if the mint button should be disabled
  const isMintButtonDisabled = isPending || isSimulatePending || isConfirmingMintCanvas || isMintPeriodOver || hasInsufficientFundsError;

  return (
    <div className="max-w-md mx-auto p-6 border-1 border-white border-dashed shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl text-white font-bold tracking-tight font-[family-name:var(--font-pixelify-sans)]">{formattedPrice} ETH</h1>
        </div>
        
        <div className="flex flex-col border rounded-lg">
          <button 
            onClick={handleIncrement}
            className="px-4 py-2 border-b hover:bg-emerald-500"
            aria-label="Increase quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <div className="px-6 py-2 text-white text-center font-[family-name:var(--font-pixelify-sans)]">
            {quantity}
          </div>
          
          <button 
            onClick={handleDecrement}
            className="px-4 py-2 border-t hover:bg-emerald-500"
            aria-label="Decrease quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <button 
        className={`flex justify-center items-center w-full bg-white text-black py-4 px-6 rounded-lg mb-6 transition-colors font-semibold font-[family-name:var(--font-pixelify-sans)] ${isMintButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-500'}`}
        disabled={isMintButtonDisabled}
        onClick={() => 
          writeContract({
            address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS,
            abi: pixelatedDelightsABI,
            functionName: 'mintCanvas',
            args: [BigInt(quantity)],
            value: parseEther(String(totalPrice))
          })
        }
      >
        {isPending || isConfirmingMintCanvas || isSimulatePending ? <Pending className="animate-spin"/> : "Mint"}
      </button>
      
      <div className="mt-8">
        <div className="flex justify-between text-white text-sm mb-2">
          <span className="font-[family-name:var(--font-pixelify-sans)] text-base">{totalMintedSoFar?.toLocaleString()} minted</span>
          <span className="font-[family-name:var(--font-pixelify-sans)] text-base">Time left: {timeLeft}</span>
        </div>
      </div>
      {isConfirmedMintCanvas &&
        <p className="text-center text-green-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Success! <br/>
          Your minted {quantity} canvas
        </p>
      }
      {walletNotConnectedsError &&
        <p className="text-center text-yellow-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Please, connect your wallet!
        </p>
      }
      {hasInsufficientFundsError &&
        <p className="text-center text-red-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Insufficient funds for gas and mint price.
        </p>
      }
      {isMintPeriodOver &&
        <p className="text-center text-amber-500 font-semibold text-base mt-4 font-[family-name:var(--font-pixelify-sans)]">
          Mint period has ended
        </p>
      }
    </div>
  );
};

export default MintCanvas;
