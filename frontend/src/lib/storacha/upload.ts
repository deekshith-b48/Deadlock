"use client";

import { getStorachaClient } from "./client";
import type { EncryptedVaultPayload } from "@/lib/utils/vaultSchema";

export async function uploadEncryptedVault(
  encryptedPayload: EncryptedVaultPayload
): Promise<string> {
  const client = await getStorachaClient();

  // Build the upload payload as a JSON blob
  const uploadData = JSON.stringify(encryptedPayload);
  const blob = new Blob([uploadData], { type: "application/json" });
  const file = new File([blob], "vault.json", { type: "application/json" });

  console.log("[Storacha] Uploading encrypted vault...");

  let cid: string;
  try {
    // Try Storacha SDK upload
    const result = await (client as any).uploadFile(file);
    cid = result.toString();
  } catch (err) {
    console.error("[Storacha] Upload failed:", err);
    throw new Error(`Failed to upload vault to IPFS: ${(err as Error).message}`);
  }

  console.log("[Storacha] Uploaded successfully. CID:", cid);
  return cid;
}

export async function uploadLitAction(actionCode: string): Promise<string> {
  const client = await getStorachaClient();

  const blob = new Blob([actionCode], { type: "application/javascript" });
  const file = new File([blob], "litAction.js", { type: "application/javascript" });

  const result = await (client as any).uploadFile(file);
  return result.toString();
}
