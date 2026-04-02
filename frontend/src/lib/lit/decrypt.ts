"use client";

import { getLitClient } from "./client";
import type { VaultPayload } from "@/lib/utils/vaultSchema";

export async function decryptVaultPayload(
  encryptedDataBase64: string,
  encryptedSymmetricKey: string,
  accessControlConditions: object[],
  authSig: object,
  chain: string = "filecoin"
): Promise<VaultPayload> {
  const client = await getLitClient();

  // 1. Convert base64 back to Uint8Array
  const binaryString = atob(encryptedDataBase64);
  const encryptedData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedData[i] = binaryString.charCodeAt(i);
  }

  // 2. Call Lit Protocol to decrypt
  // Lit nodes evaluate the access control conditions on Filecoin FVM
  // If conditions are met, they reconstruct the symmetric key
  let decryptedPayloadJson: string;

  try {
    const decryptedBytes = await (client as any).decrypt({
      ciphertext: new TextDecoder().decode(encryptedData),
      dataToEncryptHash: encryptedSymmetricKey,
      accessControlConditions,
      authSig,
      chain,
    });

    decryptedPayloadJson = new TextDecoder().decode(decryptedBytes.decryptedData);
  } catch (err) {
    // Fallback decryption path
    console.warn("[Decrypt] Trying alternative decryption method");
    const { decryptToString } = await import("@lit-protocol/encryption");
    decryptedPayloadJson = await decryptToString(
      {
        ciphertext: new TextDecoder().decode(encryptedData),
        dataToEncryptHash: encryptedSymmetricKey,
        accessControlConditions,
        authSig,
        chain,
      },
      client as any
    );
  }

  // 3. Parse the decrypted JSON payload
  const payload: VaultPayload = JSON.parse(decryptedPayloadJson);
  return payload;
}

export function payloadFilesToBlobUrls(
  payload: VaultPayload
): { name: string; type: string; url: string; size: number }[] {
  return payload.files.map((f) => {
    const binaryString = atob(f.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: f.type });
    return {
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(blob),
      size: blob.size,
    };
  });
}
