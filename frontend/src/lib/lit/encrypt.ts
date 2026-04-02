"use client";

import { getLitClient } from "./client";
import type { VaultPayload, EncryptedVaultPayload } from "@/lib/utils/vaultSchema";

export async function encryptVaultPayload(
  payload: { files: File[]; message: string; credentials: string },
  accessControlConditions: object[],
  chain: string = "filecoin"
): Promise<EncryptedVaultPayload> {
  const client = await getLitClient();

  // 1. Serialize files to base64
  const serializedFiles = await Promise.all(
    payload.files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      return {
        name: file.name,
        type: file.type,
        data: base64,
      };
    })
  );

  // 2. Build vault payload
  const vaultPayload: VaultPayload = {
    files: serializedFiles,
    message: payload.message,
    credentials: payload.credentials,
    metadata: {
      createdAt: Date.now(),
      version: "1.0.0",
    },
  };

  // 3. Serialize to Uint8Array
  const payloadJson = JSON.stringify(vaultPayload);
  const payloadBytes = new TextEncoder().encode(payloadJson);

  // 4. Encrypt with Lit Protocol
  // The Lit nodes will hold the decryption key — only release when conditions are met
  const { LitNodeClient } = await import("@lit-protocol/lit-node-client");

  let encryptedData: Uint8Array;
  let encryptedSymmetricKey: string;

  try {
    // Use the Lit encryption API
    const { ciphertext, dataToEncryptHash } = await (client as any).encrypt({
      dataToEncrypt: payloadBytes,
      accessControlConditions,
    });

    encryptedData = new TextEncoder().encode(ciphertext);
    encryptedSymmetricKey = dataToEncryptHash;
  } catch (err) {
    // Fallback: use direct encryption if client method differs
    console.warn("[Encrypt] Falling back to alternative Lit encryption method");
    const { encryptString } = await import("@lit-protocol/encryption");
    const result = await encryptString(
      { accessControlConditions, dataToEncrypt: payloadJson },
      client as any
    );
    encryptedData = new TextEncoder().encode(result.ciphertext);
    encryptedSymmetricKey = result.dataToEncryptHash;
  }

  // 5. Return encrypted payload
  const base64EncryptedData = btoa(
    String.fromCharCode(...encryptedData)
  );

  return {
    encryptedData: base64EncryptedData,
    encryptedSymmetricKey,
    metadata: {
      createdAt: Date.now(),
      version: "1.0.0",
    },
  };
}
