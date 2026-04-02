"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useVault } from "@/hooks/useVault";
import { useCheckin } from "@/hooks/useCheckin";
import { VaultStatus, TriggerType } from "@/lib/utils/vaultSchema";
import {
  truncateAddress,
  formatUnixTimestamp,
  timeAgo,
  secondsToHumanReadable,
  cidToGatewayUrl,
  triggerTypeToLabel,
  vaultStatusToLabel,
} from "@/lib/utils/formatting";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, Users, FileText, ExternalLink, AlertTriangle, Check, X, Loader2, ChevronLeft, Activity } from "lucide-react";
import Link from "next/link";

const STATUS_CLASS: Record<VaultStatus, string> = {
  [VaultStatus.ACTIVE]: "badge badge-active",
  [VaultStatus.RELEASED]: "badge badge-released",
  [VaultStatus.CANCELLED]: "badge badge-cancelled",
};

export default function VaultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const vaultId = params.vaultId as string;

  const { vault, cancelVault, isLoading } = useVault(vaultId);
  const { checkin, isChecking } = useCheckin();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const isOwner = address?.toLowerCase() === vault?.owner?.toLowerCase();
  const isInactivity = vault?.triggerType === TriggerType.INACTIVITY || vault?.triggerType === TriggerType.GEOPOLITICAL;
  const isDeathQuorum = vault?.triggerType === TriggerType.DEATH_QUORUM;
  const isTimelock = vault?.triggerType === TriggerType.TIMELOCK;
  const checkinDeadlineUnix = vault ? Number(vault.lastCheckin) + Number(vault.inactivityWindow) : 0;
  const checkinDeadline = new Date(checkinDeadlineUnix * 1000);
  const isOverdue = isInactivity && vault?.status === VaultStatus.ACTIVE && Date.now() > checkinDeadline.getTime();

  const handleCheckin = async () => {
    try {
      setActionStatus("Signing check-in transaction...");
      await checkin(vaultId);
      setActionStatus("✓ Check-in recorded! Timer reset.");
      setTimeout(() => setActionStatus(null), 4000);
    } catch (err) {
      setActionStatus(`Failed: ${(err as Error).message}`);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelVault(vaultId);
      setShowCancelConfirm(false);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !vault) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!vault || vault.vaultId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-6">
        <Shield className="w-16 h-16 text-[var(--muted)]" />
        <h1 className="text-2xl font-bold">Vault Not Found</h1>
        <Link href="/dashboard" className="text-[var(--purple-bright)] hover:text-[var(--purple)] flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-black font-mono text-gradient break-all">
                  {vaultId.slice(0, 20)}...
                </h1>
                <span className={STATUS_CLASS[vault.status]}>{vaultStatusToLabel(vault.status)}</span>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Created {timeAgo(vault.createdAt)} by{" "}
                <span className="font-mono text-[var(--text)]">{truncateAddress(vault.owner)}</span>
                {isOwner && <span className="ml-2 text-[var(--purple-bright)] font-semibold">(You)</span>}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Overdue alert */}
        {isOverdue && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-4"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-400 mb-1">Check-in Window Expired!</p>
              <p className="text-sm text-red-300/70">
                The guardian network may trigger this vault at any time. Check in immediately to reset the timer.
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-5">

          {/* Trigger Config */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-bright rounded-2xl p-6 border border-[var(--border)]"
          >
            <h2 className="font-bold mb-5 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--purple-bright)]" />
              Trigger Configuration
            </h2>
            <div className="space-y-4 text-sm">
              <InfoRow label="Type" value={triggerTypeToLabel(vault.triggerType)} />

              {isInactivity && (
                <>
                  <InfoRow label="Inactivity Window" value={secondsToHumanReadable(vault.inactivityWindow)} />
                  <InfoRow label="Last Check-in" value={timeAgo(vault.lastCheckin)} />
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[var(--muted)]">Next Deadline</span>
                      <span className={isOverdue ? "text-red-400 font-mono" : "text-[var(--green)] font-mono"}>
                        {checkinDeadline.toLocaleString()}
                      </span>
                    </div>
                    {vault.status === VaultStatus.ACTIVE && (
                      <div className="progress-bar mt-2">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.max(0, 100 - ((Date.now() - Number(vault.lastCheckin) * 1000) / (Number(vault.inactivityWindow) * 1000)) * 100)}%`,
                            background: isOverdue ? "linear-gradient(90deg, #ef444488, #ef4444)" : undefined,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {isTimelock && (
                <InfoRow label="Scheduled Release" value={formatUnixTimestamp(vault.triggerValue)} />
              )}

              {isDeathQuorum && (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[var(--muted)]">Quorum Votes</span>
                      <span className="font-mono font-bold">
                        {vault.witnessVoteCount.toString()} / {vault.witnessQuorum.toString()}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(100, (Number(vault.witnessVoteCount) / Number(vault.witnessQuorum)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Storage Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-bright rounded-2xl p-6 border border-[var(--border)]"
          >
            <h2 className="font-bold mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--cyan)]" />
              Vault Storage
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[var(--muted)] text-xs mb-1.5">Encrypted CID (IPFS)</p>
                <div className="flex items-center gap-2 glass rounded-xl border border-[var(--border)] px-3 py-2">
                  <span className="font-mono text-xs text-[var(--green)] flex-1 truncate">
                    {vault.encryptedCID === "pending"
                      ? "Sealing to IPFS..."
                      : `${vault.encryptedCID.slice(0, 24)}...`}
                  </span>
                  {vault.encryptedCID !== "pending" && vault.encryptedCID.length > 10 && (
                    <a href={cidToGatewayUrl(vault.encryptedCID)} target="_blank" rel="noopener noreferrer" className="text-[var(--purple-bright)] hover:text-[var(--purple)] flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-1.5">Lit Action CID</p>
                <div className="glass rounded-xl border border-[var(--border)] px-3 py-2">
                  <span className="font-mono text-xs text-[var(--green)]">{vault.litActionCID.slice(0, 24)}...</span>
                </div>
              </div>
              {vault.releasedAt > BigInt(0) && (
                <InfoRow label="Released At" value={formatUnixTimestamp(vault.releasedAt)} />
              )}
            </div>
          </motion.div>

          {/* Beneficiaries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-bright rounded-2xl p-6 border border-[var(--border)]"
          >
            <h2 className="font-bold mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--pink)]" />
              Beneficiaries ({vault.beneficiaries.length})
            </h2>
            <div className="space-y-2">
              {vault.beneficiaries.map((addr) => (
                <div key={addr} className="flex items-center gap-3 p-3 glass rounded-xl border border-[var(--border)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--pink)]" />
                  <span className="font-mono text-sm">{truncateAddress(addr, 8)}</span>
                  {addr.toLowerCase() === address?.toLowerCase() && (
                    <span className="ml-auto text-xs text-[var(--pink)] font-semibold">You</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Witnesses (Death Quorum) */}
          {isDeathQuorum && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-bright rounded-2xl p-6 border border-[var(--border)]"
            >
              <h2 className="font-bold mb-5 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--purple-bright)]" />
                Witnesses ({vault.witnesses.length})
              </h2>
              <div className="space-y-2">
                {vault.witnesses.map((addr) => (
                  <div key={addr} className="flex items-center justify-between p-3 glass rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--purple)]" />
                      <span className="font-mono text-sm">{truncateAddress(addr, 8)}</span>
                    </div>
                    <span className="text-xs text-[var(--muted)]">witness</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        {isOwner && vault.status === VaultStatus.ACTIVE && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            {isInactivity && (
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckin}
                disabled={isChecking}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-[var(--green)]/10 border border-[var(--green)]/25 text-[var(--green)] hover:bg-[var(--green)]/20 transition-colors disabled:opacity-50"
              >
                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {isChecking ? "Signing..." : "Check In Now"}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel Vault
            </motion.button>
          </motion.div>
        )}

        {actionStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 glass rounded-2xl border border-[var(--border)] text-sm text-[var(--muted)]"
          >
            {actionStatus}
          </motion.div>
        )}

        {/* Claim button (for beneficiary) */}
        {vault.status === VaultStatus.RELEASED && vault.beneficiaries.map((b) => b.toLowerCase()).includes(address?.toLowerCase() ?? "") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            <Link href="/beneficiary">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/15 transition-colors"
              >
                🔓 Claim This Vault
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Cancel confirm modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={(e) => e.target === e.currentTarget && setShowCancelConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-bright rounded-3xl p-8 border border-red-500/30 max-w-md w-full glow-pink"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-5">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-black text-red-400 mb-3">Cancel Vault?</h3>
                <p className="text-[var(--muted)] mb-8 leading-relaxed">
                  This action is permanent and cannot be reversed. The vault will be cancelled and your beneficiaries will lose access to the encrypted content stored on IPFS.
                </p>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Keep Vault
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel Vault
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
