"use client";

import { useState, useCallback } from "react";
import { parseWorldIDProof, nullifierHashToBigInt } from "@/lib/worldid/verify";

export interface WorldIDProofState {
  verified: boolean;
  nullifier: bigint;
  proof: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  merkleRoot: string;
}

export function useWorldId() {
  const [proofState, setProofState] = useState<WorldIDProofState | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback(
    (result: {
      nullifier_hash: string;
      proof: string;
      merkle_root: string;
      verification_level: string;
    }) => {
      setIsVerifying(true);
      setError(null);
      try {
        const nullifier = nullifierHashToBigInt(result.nullifier_hash);
        const proof = parseWorldIDProof(result.proof);

        setProofState({
          verified: true,
          nullifier,
          proof,
          merkleRoot: result.merkle_root,
        });
      } catch (err) {
        setError(`Failed to parse World ID proof: ${(err as Error).message}`);
      } finally {
        setIsVerifying(false);
      }
    },
    []
  );

  const onError = useCallback((error: { code: string; detail: string }) => {
    setError(`World ID verification failed: ${error.detail || error.code}`);
  }, []);

  const reset = useCallback(() => {
    setProofState(null);
    setError(null);
  }, []);

  return {
    proofState,
    onSuccess,
    onError,
    reset,
    isVerifying,
    isVerified: proofState?.verified ?? false,
    error,
  };
}
