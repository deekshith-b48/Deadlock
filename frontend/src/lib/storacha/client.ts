"use client";

import { create } from "@storacha/client";
import { StoreMemory } from "@storacha/client/stores/memory";

let storachaClient: Awaited<ReturnType<typeof create>> | null = null;
let initPromise: Promise<Awaited<ReturnType<typeof create>>> | null = null;

export async function getStorachaClient() {
  if (storachaClient) return storachaClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("[Storacha] Initializing client...");
    const client = await create({ store: new StoreMemory() });

    const email = process.env.NEXT_PUBLIC_STORACHA_EMAIL;
    const spaceDid = process.env.STORACHA_SPACE_DID;

    if (email) {
      try {
        await (client as any).login(email);
        console.log("[Storacha] Logged in as", email);
      } catch (err) {
        console.warn("[Storacha] Login failed (running without auth):", err);
      }
    }

    if (spaceDid) {
      try {
        await (client as any).setCurrentSpace(spaceDid);
        console.log("[Storacha] Space set:", spaceDid);
      } catch (err) {
        console.warn("[Storacha] Failed to set space:", err);
      }
    }

    storachaClient = client;
    initPromise = null;
    return client;
  })();

  return initPromise;
}
