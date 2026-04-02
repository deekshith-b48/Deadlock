"use client";

import { useState, useCallback } from "react";
import { decryptVaultPayload, payloadFilesToBlobUrls } from "@/lib/lit/decrypt";
import { retrieveVaultByCID } from "@/lib/storacha/retrieve";
import type { VaultPayload } from "@/lib/utils/vaultSchema";

export function useLitDecrypt() {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPayload, setDecryptedPayload] = useState<VaultPayload | null>(null);
  const [decryptedFiles, setDecryptedFiles] = useState<
    { name: string; type: string; url: string; size: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (
      encryptedCID: string,
      accessControlConditions: object[],
      authSig: object
    ): Promise<VaultPayload> => {
      setIsDecrypting(true);
      setError(null);
      try {
        // 1. Retrieve encrypted payload from IPFS
        const encryptedPayload = await retrieveVaultByCID(encryptedCID);

        // 2. Decrypt with Lit Protocol
        const payload = await decryptVaultPayload(
          encryptedPayload.encryptedData,
          encryptedPayload.encryptedSymmetricKey,
          accessControlConditions,
          authSig,
          "filecoin"
        );

        // 3. Create blob URLs for files
        const files = payloadFilesToBlobUrls(payload);

        setDecryptedPayload(payload);
        setDecryptedFiles(files);
        return payload;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setIsDecrypting(false);
      }
    },
    []
  );

  const clearDecrypted = useCallback(() => {
    // Revoke blob URLs to prevent memory leaks
    decryptedFiles.forEach((f) => URL.revokeObjectURL(f.url));
    setDecryptedPayload(null);
    setDecryptedFiles([]);
  }, [decryptedFiles]);

  return {
    decrypt,
    decryptedPayload,
    decryptedFiles,
    clearDecrypted,
    isDecrypting,
    error,
  };
}
