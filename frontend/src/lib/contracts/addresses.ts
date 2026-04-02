// Contract addresses — update after deployment
// Run: cd contracts && npx hardhat run scripts/deploy.ts --network calibration

export const CONTRACT_ADDRESSES = {
  REGISTRY: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  WITNESS_NFT: (process.env.NEXT_PUBLIC_WITNESS_NFT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  HYPERCERT: (process.env.NEXT_PUBLIC_HYPERCERT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

export const FILECOIN_CALIBRATION = {
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "testnet FIL", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_FILECOIN_RPC || "https://api.calibration.node.glif.io/rpc/v1"] },
  },
  blockExplorers: {
    default: { name: "Filscan", url: "https://calibration.filscan.io" },
  },
  testnet: true,
} as const;
