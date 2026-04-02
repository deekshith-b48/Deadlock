"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useLitDecrypt } from "@/hooks/useLitDecrypt";
import { buildAccessControlConditions } from "@/lib/lit/conditions";
import { Download, Unlock, Loader2, Shield, MessageSquare, Key, FileText } from "lucide-react";
import { formatFileSize } from "@/lib/utils/formatting";
import type { Vault } from "@/lib/utils/vaultSchema";

interface ClaimVaultProps {
  vault: Vault;
}

export function ClaimVault({ vault }: ClaimVaultProps) {
  const { address } = useAccount();
  const { decrypt, decryptedPayload, decryptedFiles, isDecrypting, error } = useLitDecrypt();
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    try {
      const conditions = buildAccessControlConditions(vault.vaultId, vault.triggerType);
      const { ethers } = await import("ethers");
      const provider = new (ethers as any).BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const msg = `DEADLOCK: Access vault ${vault.vaultId}`;
      const authSig = {
        sig: await signer.signMessage(msg),
        derivedVia: "web3.eth.personal.sign",
        signedMessage: msg,
        address,
      };
      await decrypt(vault.encryptedCID, conditions, authSig);
      setClaimed(true);
    } catch (err) {
      console.error("[ClaimVault] Decrypt failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {!decryptedPayload ? (
        <div>
          <button
            onClick={handleClaim}
            disabled={isDecrypting}
            className="w-full flex items-center justify-center gap-3 py-4 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-xl font-semibold hover:bg-orange-600/30 transition-colors disabled:opacity-50"
          >
            {isDecrypting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Decrypting...
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                Decrypt Vault
              </>
            )}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-green-400 font-medium">
            <Shield className="w-5 h-5" />
            Vault Decrypted by Lit Protocol
          </div>

          {decryptedFiles.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Files
              </h4>
              <div className="space-y-2">
                {decryptedFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 text-sm">
                      <span>📄</span>
                      <div>
                        <div className="font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-medium hover:bg-primary/30 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decryptedPayload.message && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Message
              </h4>
              <div className="p-4 bg-muted rounded-xl text-sm whitespace-pre-wrap">
                {decryptedPayload.message}
              </div>
            </div>
          )}

          {decryptedPayload.credentials && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Credentials
              </h4>
              <div className="p-4 bg-muted rounded-xl text-sm font-mono whitespace-pre-wrap border border-yellow-500/20">
                {decryptedPayload.credentials}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
