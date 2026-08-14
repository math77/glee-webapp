"use server"


//import { createClient } from "@supabase/supabase-js";

import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

//import mime from 'mime';


//import { coinABI } from "../../../utils/coinABI";

//const supabaseUrl = process.env.SUPABASE_URL as string;
//const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const BASE_SEPOLIA_RPC_URL = "https://base-sepolia.g.alchemy.com/v2/57oLAkG2wECl8Elpjs2gTFn8lt-nWNjG";
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIxOGFjYThmNi1iNGQ5LTRiZGQtYTFhYy00YWVlN2I5NDU1NjIiLCJlbWFpbCI6ImhpYnlkZWRAc2tpZmYuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjY4YzdhYjVjNjkwYWZiNTJhNWUxIiwic2NvcGVkS2V5U2VjcmV0IjoiM2ZkM2Q3MTUzZjY3ZmY3YWMyYjE4YTFmOWI1MmZkMGFjZWQ0YjdkMDY2MjJhY2Y0Njg1YTBlZDNmYzMxMjgxYyIsImV4cCI6MTc3MjcyMTUzMX0.NhMKvtHicBoy43nXEP90kVAlUq5EyLnF_vcgVWt4vTo";



const PINATA_BASE_ENDPOINT = "https://api.pinata.cloud/pinning";
const BASE_RPC_URL = "https://base-mainnet.g.alchemy.com/v2/57oLAkG2wECl8Elpjs2gTFn8lt-nWNjG";
const TOKEN_ADDRESS = "0x37ffe1ea1c5a1ad83db0ee609a52b0a98c460412";


//const PINATA_JWT = process.env.PINATA_JWT;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

type ColorPlacement = {
  x: number;
  y: number;
  color: string;
};

/*
const supabaseUrl = "https://muaxbhmqmplftizojmnd.supabase.co" as string;
//const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YXhiaG1xbXBsZnRpem9qbW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjA5NDYsImV4cCI6MjA1Njg5Njk0Nn0._lt3U4BsPw-4xpimA86Uz4dqqD4uMU6D2BvJ4ZY7pq4" as string;

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YXhiaG1xbXBsZnRpem9qbW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTMyMDk0NiwiZXhwIjoyMDU2ODk2OTQ2fQ.ZMPv-2YVS3qegoj-tU0KW70aYlmqhf-hlHSR1vEvd3A" as string;

const name = "BUY TO CONTROL";
const description = "Participatory media performative art coin\n\nBuy coins\nRun to: https://buytocontrol.xyz/\nJoin us";
const symbol = "BUY TO CONTROL";
*/

//const supabase = createClient(supabaseUrl, supabaseKey);

/*
export async function saveToDB(cidMetadata: string, userWallet: string, amountBurn: number, selectedMultiplier: number) {
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      cid_metadata: cidMetadata,
      user_wallet: userWallet,
      amount_burn: amountBurn,
      selected_multiplier: selectedMultiplier
    })
    .select()

    if (error?.code) return error;

    return data;
}
*/

export async function metadataUpload(canvas: ColorPlacement[], name: string, symbol: string, description: string): Promise<String> {
  try {
    
    const svgContentString = await generateSVG(canvas);
    const cidImage = await pinFileToIPFS(svgContentString);

    if (cidImage.length > 0) {
      const cidMetadata = await pinMetadataToIPFS(cidImage, name, symbol, description);

      return cidMetadata;
    }

    console.log("EMOJI PLACEMENT ON ACTION SERVER");
    console.log(canvas);

    return "";

  } catch (error: any) {
    console.log("ERROR METADATA UPLOAD: ", error);
    return "";
  }
}

async function generateSVG(parcels: ColorPlacement[]) {
  const GRID_WIDTH = 9;
  const GRID_HEIGHT = 9;
  const CELL_SIZE = 20;
  const padding = CELL_SIZE / 2;
  const svgWidth = GRID_WIDTH * CELL_SIZE + padding * 2;
  const svgHeight = GRID_HEIGHT * CELL_SIZE + padding * 2;
  
  let svgContent = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgWidth}' height='${svgHeight}'>`;
  
  // Add a white background
  //svgContent += `<rect width='${svgWidth}' height='${svgHeight}' fill='white' />`;
  svgContent += `<rect width='${svgWidth}' height='${svgHeight}' />`;
  
  // Create grid cells
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const posX = x * CELL_SIZE + padding;
      const posY = y * CELL_SIZE + padding;
      const cellKey = `${x}-${y}`;
      
      // Cell rectangle (background)
      //#f8f5f0
      svgContent += `<rect 
        x='${posX}' 
        y='${posY}' 
        width='${CELL_SIZE}' 
        height='${CELL_SIZE}' 
        fill='none' 
        stroke='none' 
        stroke-opacity='0.0' 
        stroke-width='none' 
      />`;
      
      // Find if this cell has a parcel
      const parcel = parcels.find(p => p.x === x && p.y === y);
      
      // If cell has a parcel, add the color fill
      if (parcel) {
        svgContent += `<rect 
          x='${posX}' 
          y='${posY}' 
          width='${CELL_SIZE}' 
          height='${CELL_SIZE}' 
          fill='${parcel.color}' 
          stroke='none' 
          stroke-opacity='0.2' 
          stroke-width='0' 
        />`;
      }
    }
  }
  
  svgContent += `</svg>`;
  return svgContent;
}

async function pinFileToIPFS(svgContent: string): Promise<string> {
  try {
    
    const filename = crypto.randomUUID();


    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const file = new File([blob], `${filename}.svg`);
    const data = new FormData();

    data.append("file", file);
    
    const res = await fetch(`${PINATA_BASE_ENDPOINT}/pinFileToIPFS`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: data,
    });

    const resData = await res.json();
    console.log("PINATA RESPONSE: ");
    console.log(resData);
    console.log(resData?.IpfsHash);

    return resData?.IpfsHash;

  } catch (error) {
    console.log("ERROR PIN FILE: ", error);
    return "";
  }
}

async function pinMetadataToIPFS(imageCid: string, name: string, symbol: string, description: string): Promise<string> {
  
  const metadata = JSON.stringify({
    pinataContent: {
      name,
      description,
      image: `ipfs://${imageCid}`
    },
    pinataMetadata: {
      name: "metadata.json"
    }
  });

  console.log("METADATA TO PIN: ", metadata);

  try {
    const res = await fetch(`${PINATA_BASE_ENDPOINT}/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: metadata,
    });
    const resData = await res.json();
    console.log("METADATA PIN RES:");
    console.log(resData);

    return resData?.IpfsHash;

  } catch (error: any) {
    console.log("ERROR PIN METADATA: ", error);
    return "";
  }
}