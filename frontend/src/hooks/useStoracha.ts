"use client";

import { useState, useCallback } from "react";
import { uploadEncryptedVault } from "@/lib/storacha/upload";
import { retrieveVaultByCID } from "@/lib/storacha/retrieve";
import type { EncryptedVaultPayload } from "@/lib/utils/vaultSchema";

export function useStoracha() {
  const [isUploading, setIsUploading] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [uploadedCID, setUploadedCID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (payload: EncryptedVaultPayload): Promise<string> => {
    setIsUploading(true);
    setError(null);
    try {
      const cid = await uploadEncryptedVault(payload);
      setUploadedCID(cid);
      return cid;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const retrieve = useCallback(async (cid: string): Promise<EncryptedVaultPayload> => {
    setIsRetrieving(true);
    setError(null);
    try {
      return await retrieveVaultByCID(cid);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setIsRetrieving(false);
    }
  }, []);

  return { upload, retrieve, isUploading, isRetrieving, uploadedCID, error };
}
