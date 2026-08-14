"use client";

import { useState, useEffect } from "react";

import { useAccount } from "wagmi";
import { Address } from "viem";

import ColorTownCreate from "@/components/ColorTownCreate/ColorTownCreate";

export default function Page() {
  const [mounted, setMounted] = useState<boolean>(false);

  const { address: userAddress, isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ColorTownCreate
      userAddress={userAddress as Address}
    />
  );
}