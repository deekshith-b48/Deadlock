"use client";

import { useState, useCallback } from "react";
import { useWriteContract } from "wagmi";
import { DEADLOCK_REGISTRY_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

export function useCheckin() {
  const { writeContractAsync } = useWriteContract();
  const [isChecking, setIsChecking] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkin = useCallback(async (vaultId: string) => {
    setIsChecking(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.REGISTRY,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "checkin",
        args: [vaultId as `0x${string}`],
      });
      setLastTxHash(hash);
      return hash;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, [writeContractAsync]);

  return { checkin, isChecking, lastTxHash, error };
}
