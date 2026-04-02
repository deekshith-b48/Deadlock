"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useVault } from "@/hooks/useVault";
import { useLitDecrypt } from "@/hooks/useLitDecrypt";
import { buildAccessControlConditions } from "@/lib/lit/conditions";
import { VaultStatus } from "@/lib/utils/vaultSchema";
import { truncateAddress, timeAgo, triggerTypeToLabel, formatFileSize } from "@/lib/utils/formatting";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Lock, Unlock, Loader2, Shield, FileText, MessageSquare, Key, Award, ChevronDown, ChevronUp } from "lucide-react";
import { useWriteContract, usePublicClient } from "wagmi";
import { DEADLOCK_REGISTRY_ABI, DEADLOCK_HYPERCERT_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

function ReleasedVaultClaim({ vault }: { vault: any }) {
  const { address } = useAccount();
  const { decrypt, decryptedPayload, decryptedFiles, isDecrypting, error } = useLitDecrypt();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [hypercertId, setHypercertId] = useState<string | null>(null);
  const [isMintingCert, setIsMintingCert] = useState(false);
  const [claimTxSent, setClaimTxSent] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDecrypt = async () => {
    try {
      const conditions = buildAccessControlConditions(vault.vaultId, vault.triggerType);
      const { ethers } = await import("ethers");
      const provider = new (ethers as any).BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const statement = `I am accessing my DEADLOCK vault ${vault.vaultId}`;
      const authSig = {
        sig: await signer.signMessage(statement),
        derivedVia: "web3.eth.personal.sign",
        signedMessage: statement,
        address,
      };
      await decrypt(vault.encryptedCID, conditions, authSig);
      if (!claimTxSent) {
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.REGISTRY,
          abi: DEADLOCK_REGISTRY_ABI,
          functionName: "claimVault",
          args: [vault.vaultId],
        });
        setClaimTxSent(true);
      }
    } catch (err) {
      console.error("Decrypt failed:", err);
    }
  };

  const handleMintHypercert = async () => {
    setIsMintingCert(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.HYPERCERT,
        abi: DEADLOCK_HYPERCERT_ABI,
        functionName: "recordInheritance",
        args: [
          vault.vaultId as `0x${string}`,
          vault.owner as `0x${string}`,
          vault.beneficiaries as `0x${string}`[],
          BigInt(Number(vault.releasedAt)),
          vault.encryptedCID,
          vault.triggerType,
        ],
      });
      // Parse hypercertId from the InheritanceRecorded event
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        for (const log of receipt.logs) {
          try {
            const event = publicClient.decodeEventLog({
              abi: DEADLOCK_HYPERCERT_ABI,
              eventName: "InheritanceRecorded",
              data: log.data,
              topics: log.topics,
            });
            if (event && (event as any).args?.hypercertId !== undefined) {
              setHypercertId((event as any).args.hypercertId.toString());
              return;
            }
          } catch {}
        }
      }
      setHypercertId(hash); // fallback: show tx hash
    } catch (err) {
      console.error("Mint failed:", err);
    } finally {
      setIsMintingCert(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-amber-500/25 overflow-hidden"
      style={{ background: "rgba(18,18,30,0.8)", backdropFilter: "blur(20px)" }}
    >
      {/* Vault header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs font-mono text-[var(--muted)] mb-1">{vault.vaultId.slice(0, 20)}...</p>
            <p className="font-bold text-lg">
              From: <span className="font-mono text-[var(--purple-bright)]">{truncateAddress(vault.owner)}</span>
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Released {timeAgo(vault.releasedAt)} · {triggerTypeToLabel(vault.triggerType)} trigger
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="badge badge-released">Released</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 flex items-center gap-1.5 transition-colors"
            >
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand</>}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6">
              <div className="h-px bg-[var(--border)]" />

              {/* Decrypt button / decrypted content */}
              {!decryptedPayload ? (
                <div>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDecrypt}
                    disabled={isDecrypting}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                  >
                    {isDecrypting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Decrypting — Lit Protocol verifying...</>
                    ) : (
                      <><Unlock className="w-5 h-5" /> Decrypt Vault Contents</>
                    )}
                  </motion.button>

                  {error && (
                    <div className="mt-3 p-4 rounded-xl bg-[var(--pink)]/10 border border-[var(--pink)]/25 text-[var(--pink)] text-sm">
                      {error}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-[var(--muted)] text-center leading-relaxed">
                    Lit Protocol nodes verify your beneficiary status on-chain before releasing the decryption key.
                    This requires a wallet signature — nothing is sent to any server.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--green)]/10 border border-[var(--green)]/25">
                    <Shield className="w-5 h-5 text-[var(--green)]" />
                    <div>
                      <p className="font-bold text-[var(--green)]">Vault Decrypted</p>
                      <p className="text-xs text-[var(--muted)]">Verified by Lit Protocol on Filecoin FVM</p>
                    </div>
                  </div>

                  {/* Files */}
                  {decryptedFiles.length > 0 && (
                    <div>
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--purple-bright)]" />
                        Files ({decryptedFiles.length})
                      </h3>
                      <div className="space-y-2">
                        {decryptedFiles.map((file) => (
                          <div key={file.name} className="flex items-center justify-between p-3 glass rounded-xl border border-[var(--border)]">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-[var(--muted)]" />
                              <div>
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-[var(--muted)]">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <a
                              href={file.url}
                              download={file.name}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--purple)]/20 text-[var(--purple-bright)] hover:bg-[var(--purple)]/30 transition-colors"
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {decryptedPayload.message && (
                    <div>
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[var(--cyan)]" />
                        Message
                      </h3>
                      <div className="p-5 glass rounded-2xl border border-[var(--border)] text-sm leading-relaxed whitespace-pre-wrap">
                        {decryptedPayload.message}
                      </div>
                    </div>
                  )}

                  {/* Credentials */}
                  {decryptedPayload.credentials && (
                    <div>
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-400" />
                        Credentials / Seed Phrases
                      </h3>
                      <div className="p-5 glass rounded-2xl border border-amber-500/25 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                        {decryptedPayload.credentials}
                      </div>
                      <p className="mt-2 text-xs text-amber-400/70">
                        ⚠️ Keep these secure. Do not screenshot in unsafe environments.
                      </p>
                    </div>
                  )}

                  {/* Hypercert */}
                  <div className="pt-4 border-t border-[var(--border)]">
                    {hypercertId ? (
                      <div className="flex items-center gap-3 p-5 rounded-2xl bg-[var(--purple)]/10 border border-[var(--purple)]/25">
                        <Award className="w-6 h-6 text-[var(--purple-bright)]" />
                        <div>
                          <p className="font-bold text-[var(--purple-bright)]">Inheritance Hypercert Minted</p>
                          <p className="text-xs font-mono text-[var(--muted)] mt-1">{hypercertId}</p>
                        </div>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={handleMintHypercert}
                        disabled={isMintingCert}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold bg-[var(--purple)]/10 border border-[var(--purple)]/25 text-[var(--purple-bright)] hover:bg-[var(--purple)]/20 transition-colors disabled:opacity-50"
                      >
                        {isMintingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        Mint Inheritance Hypercert
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click to expand CTA if collapsed and not decrypted */}
      {!expanded && (
        <div className="px-6 pb-5">
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Claim & Decrypt Vault
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

export default function BeneficiaryPage() {
  const { address, isConnected } = useAccount();
  const { beneficiaryVaults, isLoading } = useVault();

  const releasedVaults = beneficiaryVaults.filter((v) => v.status === VaultStatus.RELEASED);
  const pendingVaults = beneficiaryVaults.filter((v) => v.status === VaultStatus.ACTIVE);

  if (!isConnected) {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-bright rounded-3xl p-12 text-center max-w-md w-full glow"
        >
          <Lock className="w-16 h-16 mx-auto mb-6 text-[var(--purple-bright)]" />
          <h1 className="text-2xl font-bold mb-3">Connect to Claim Inheritance</h1>
          <p className="text-[var(--muted)] mb-8">Connect your wallet to see vaults where you are a beneficiary.</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <p className="text-[var(--purple-bright)] text-sm font-mono mb-2">// BENEFICIARY PORTAL</p>
          <h1 className="text-4xl font-black mb-2">My Inheritances</h1>
          <p className="text-[var(--muted)]">
            Vaults designating <span className="font-mono text-[var(--text)]">{truncateAddress(address!)}</span> as beneficiary
          </p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-32">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
            <p className="text-[var(--muted)]">Loading from Filecoin...</p>
          </div>
        ) : (
          <div className="space-y-12">

            {/* Released — ready to claim */}
            {releasedVaults.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">🔓</span>
                  <h2 className="text-xl font-bold text-amber-400">Ready to Claim</h2>
                  <span className="badge badge-released">{releasedVaults.length}</span>
                </div>
                <div className="space-y-4">
                  {releasedVaults.map((vault) => (
                    <ReleasedVaultClaim key={vault.vaultId} vault={vault} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending — still locked */}
            {pendingVaults.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">🔒</span>
                  <h2 className="text-xl font-bold text-[var(--muted)]">Pending</h2>
                  <span className="badge badge-active">{pendingVaults.length}</span>
                </div>
                <div className="space-y-3">
                  {pendingVaults.map((vault, i) => (
                    <motion.div
                      key={vault.vaultId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="glass-bright rounded-2xl p-5 border border-[var(--border)] flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono text-sm text-[var(--muted)] mb-1">{vault.vaultId.slice(0, 20)}...</p>
                        <p className="text-sm">
                          From: <span className="font-mono text-[var(--purple-bright)]">{truncateAddress(vault.owner)}</span>
                          <span className="text-[var(--muted)] mx-2">·</span>
                          {triggerTypeToLabel(vault.triggerType)} trigger
                        </p>
                      </div>
                      <span className="badge badge-active">Locked</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {beneficiaryVaults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-bright rounded-3xl p-14 text-center border border-[var(--border)] glow-sm"
              >
                <div className="text-6xl mb-6">🎁</div>
                <h3 className="text-xl font-bold mb-3">No Inheritances Found</h3>
                <p className="text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
                  You haven't been designated as a beneficiary for any vaults yet. Ask someone to add your address.
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
