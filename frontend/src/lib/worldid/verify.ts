"use client";

export interface WorldIDVerificationResult {
  nullifier_hash: string;
  proof: string;
  merkle_root: string;
  verification_level: string;
}

export function parseWorldIDProof(
  proofString: string
): [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  // World ID proof is a hex string encoding 8 uint256 values
  // Remove 0x prefix if present
  const clean = proofString.startsWith("0x") ? proofString.slice(2) : proofString;

  // Each uint256 is 64 hex chars (32 bytes)
  const parts: bigint[] = [];
  for (let i = 0; i < 8; i++) {
    const chunk = clean.slice(i * 64, (i + 1) * 64);
    parts.push(BigInt(`0x${chunk || "0"}`));
  }

  return parts as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

export function nullifierHashToBigInt(nullifierHash: string): bigint {
  const clean = nullifierHash.startsWith("0x") ? nullifierHash : `0x${nullifierHash}`;
  return BigInt(clean);
}

export const WORLD_ID_CONFIG = {
  appId: process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID as `app_${string}` || "app_placeholder",
  action: process.env.NEXT_PUBLIC_WORLDCOIN_ACTION || "create_deadlock_vault",
};
