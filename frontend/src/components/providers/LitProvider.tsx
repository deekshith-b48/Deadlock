"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getLitClient, LIT_NETWORK } from "@/lib/lit/client";
import type { LitNodeClient } from "@lit-protocol/lit-node-client";

interface LitContextValue {
  client: LitNodeClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
}

const LitContext = createContext<LitContextValue>({
  client: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  reconnect: () => {},
});

export function useLit() {
  return useContext(LitContext);
}

export function LitProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<LitNodeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const c = await getLitClient();
      setClient(c);
      setIsConnected(true);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      console.error("[LitProvider] Connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    connect();
  }, []);

  return (
    <LitContext.Provider
      value={{ client, isConnected, isConnecting, error, reconnect: connect }}
    >
      {children}
    </LitContext.Provider>
  );
}
