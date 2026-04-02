"use client";

import { LitNodeClient } from "@lit-protocol/lit-node-client";

let litClient: LitNodeClient | null = null;
let isConnecting = false;
let connectPromise: Promise<LitNodeClient> | null = null;

export const LIT_NETWORK = (process.env.NEXT_PUBLIC_LIT_NETWORK as string) || "datil-test";

export async function getLitClient(): Promise<LitNodeClient> {
  if (litClient && litClient.ready) {
    return litClient;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    console.log(`[Lit] Connecting to ${LIT_NETWORK}...`);
    const client = new LitNodeClient({
      litNetwork: LIT_NETWORK as any,
      debug: process.env.NODE_ENV === "development",
    });

    await client.connect();
    litClient = client;
    console.log("[Lit] Connected");
    connectPromise = null;
    return client;
  })();

  return connectPromise;
}

export function disconnectLitClient() {
  if (litClient) {
    litClient.disconnect();
    litClient = null;
  }
}
