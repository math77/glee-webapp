"use client";

import { useState, useEffect } from "react";

import { useAccount } from "wagmi";
import { Address } from "viem";

import Studio from "@/components/Studio/Studio";

export default function Page() {
  const [mounted, setMounted] = useState<boolean>(false);

  const { address: userAddress, isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Studio
      userAddress={userAddress as Address}
    />
  );
}