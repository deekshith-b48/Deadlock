"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { FILECOIN_CALIBRATION } from "@/lib/contracts/addresses";

const filecoinCalibration = {
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "testnet FIL", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.calibration.node.glif.io/rpc/v1"] },
    public: { http: ["https://api.calibration.node.glif.io/rpc/v1"] },
  },
  blockExplorers: {
    default: { name: "Filscan", url: "https://calibration.filscan.io" },
  },
  testnet: true,
} as const;

const config = getDefaultConfig({
  appName: "DEADLOCK Protocol",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "deadlock-protocol",
  chains: [filecoinCalibration],
  transports: {
    [filecoinCalibration.id]: http("https://api.calibration.node.glif.io/rpc/v1"),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7c3aed",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
          })}
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
