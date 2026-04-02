"use client";

import { useState, useCallback } from "react";
import { encryptVaultPayload } from "@/lib/lit/encrypt";
import type { EncryptedVaultPayload } from "@/lib/utils/vaultSchema";

export function useLitEncrypt() {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt = useCallback(
    async (
      payload: { files: File[]; message: string; credentials: string },
      accessControlConditions: object[]
    ): Promise<EncryptedVaultPayload> => {
      setIsEncrypting(true);
      setError(null);
      try {
        const result = await encryptVaultPayload(payload, accessControlConditions, "filecoin");
        return result;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setIsEncrypting(false);
      }
    },
    []
  );

  return { encrypt, isEncrypting, error };
}
