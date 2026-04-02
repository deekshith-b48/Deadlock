"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useVault } from "@/hooks/useVault";
import { VaultStatus, TriggerType } from "@/lib/utils/vaultSchema";
import {
  truncateAddress,
  truncateVaultId,
  timeAgo,
  vaultStatusToLabel,
  triggerTypeToLabel,
} from "@/lib/utils/formatting";
import { Shield, Clock, Plus, Eye, Activity, Gift, ChevronRight, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCheckin } from "@/hooks/useCheckin";

const TABS = ["My Vaults", "My Duties", "My Inheritances"] as const;
type Tab = typeof TABS[number];

const TRIGGER_ICONS: Record<TriggerType, string> = {
  [TriggerType.INACTIVITY]: "🕐",
  [TriggerType.TIMELOCK]: "📅",
  [TriggerType.DEATH_QUORUM]: "⚰️",
  [TriggerType.GEOPOLITICAL]: "🌍",
  [TriggerType.MUTUAL]: "🔗",
};

const STATUS_CLASS: Record<VaultStatus, string> = {
  [VaultStatus.ACTIVE]: "badge badge-active",
  [VaultStatus.RELEASED]: "badge badge-released",
  [VaultStatus.CANCELLED]: "badge badge-cancelled",
};

function CheckinCountdown({ lastCheckin, inactivityWindow }: { lastCheckin: bigint; inactivityWindow: bigint }) {
  const deadline = new Date((Number(lastCheckin) + Number(inactivityWindow)) * 1000);
  const remaining = deadline.getTime() - Date.now();
  const windowMs = Number(inactivityWindow) * 1000;

  let color = "#22c55e";
  let label = "SAFE";
  if (remaining <= 0) { color = "#ef4444"; label = "OVERDUE"; }
  else if (remaining <= windowMs * 0.1) { color = "#ef4444"; label = "CRITICAL"; }
  else if (remaining <= windowMs * 0.25) { color = "#f59e0b"; label = "WARNING"; }

  const pct = Math.max(0, Math.min(100, (remaining / windowMs) * 100));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono" style={{ color }}>
          {label} — {remaining <= 0 ? "TRIGGER MAY FIRE" : formatDistanceToNow(deadline, { addSuffix: false }) + " left"}
        </span>
        <span className="text-xs text-[var(--muted)]">{Math.round(pct)}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("My Vaults");
  const { ownerVaults, beneficiaryVaults, isLoading, attestDeath } = useVault();
  const { checkin, isChecking } = useCheckin();

  const witnessVaults = beneficiaryVaults.filter(
    (v) => v.witnesses.map((w) => w.toLowerCase()).includes(address?.toLowerCase() ?? "") && v.status === VaultStatus.ACTIVE
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-8 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-bright rounded-3xl p-12 text-center max-w-md w-full glow"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--purple)]/20 border border-[var(--purple)]/30 flex items-center justify-center">
            <Shield className="w-10 h-10 text-[var(--purple-bright)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Connect Your Wallet</h1>
          <p className="text-[var(--muted)] mb-8 leading-relaxed">
            Connect to view your vaults, witness duties, and incoming inheritances.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  const TAB_META = [
    { id: "My Vaults", icon: <Shield className="w-4 h-4" />, count: ownerVaults.length },
    { id: "My Duties", icon: <Eye className="w-4 h-4" />, count: witnessVaults.length },
    { id: "My Inheritances", icon: <Gift className="w-4 h-4" />, count: beneficiaryVaults.length },
  ];

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-12"
        >
          <div>
            <p className="text-[var(--purple-bright)] text-sm font-mono mb-2">// DEADLOCK PROTOCOL</p>
            <h1 className="text-4xl font-black mb-2">Dashboard</h1>
            <p className="text-[var(--muted)]">
              Logged in as <span className="font-mono text-[var(--text)]">{truncateAddress(address!)}</span>
            </p>
          </div>
          <Link href="/vault/create">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Vault
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          {[
            { label: "Vaults Owned", value: ownerVaults.length, color: "var(--purple-bright)", icon: "🔐" },
            { label: "Witness Duties", value: witnessVaults.length, color: "var(--cyan)", icon: "👁" },
            { label: "Inheritances", value: beneficiaryVaults.length, color: "var(--pink)", icon: "🎁" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="stat-card">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-3xl font-black font-mono mb-1" style={{ color }}>{value}</div>
              <div className="text-sm text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 p-1.5 glass rounded-2xl mb-8 w-fit"
        >
          {TAB_META.map(({ id, icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as Tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === id
                  ? "bg-[var(--purple)] text-white shadow-lg shadow-[var(--purple)]/30"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {icon}
              {id}
              {count > 0 && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeTab === id ? "bg-white/20" : "bg-[var(--surface2)]"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-32"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
              <p className="text-[var(--muted)]">Loading vaults from Filecoin...</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
            >

              {/* ─── My Vaults ─── */}
              {activeTab === "My Vaults" && (
                <div className="space-y-4">
                  {ownerVaults.length === 0 ? (
                    <EmptyState
                      emoji="🔐"
                      title="No vaults yet"
                      desc="Create your first dead man's switch vault to get started."
                      cta={{ label: "Create Your First Vault", href: "/vault/create" }}
                    />
                  ) : (
                    ownerVaults.map((vault, i) => (
                      <motion.div
                        key={vault.vaultId}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.005, borderColor: "rgba(124,58,237,0.4)" }}
                        className="glass-bright rounded-2xl p-6 border border-[var(--border)] cursor-default"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[var(--purple)]/10 border border-[var(--purple)]/20 flex items-center justify-center text-2xl">
                              {TRIGGER_ICONS[vault.triggerType]}
                            </div>
                            <div>
                              <p className="text-xs font-mono text-[var(--muted)] mb-0.5">{truncateVaultId(vault.vaultId)}</p>
                              <p className="font-bold">{triggerTypeToLabel(vault.triggerType)} Vault</p>
                            </div>
                          </div>
                          <span className={STATUS_CLASS[vault.status]}>{vaultStatusToLabel(vault.status)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-5 text-sm">
                          {[
                            { label: "Last Check-in", value: timeAgo(vault.lastCheckin) },
                            { label: "Beneficiaries", value: vault.beneficiaries.length },
                            { label: "Created", value: timeAgo(vault.createdAt) },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs text-[var(--muted)] mb-1">{label}</p>
                              <p className="font-semibold">{value}</p>
                            </div>
                          ))}
                        </div>

                        {(vault.triggerType === TriggerType.INACTIVITY || vault.triggerType === TriggerType.GEOPOLITICAL) && vault.status === VaultStatus.ACTIVE && (
                          <CheckinCountdown lastCheckin={vault.lastCheckin} inactivityWindow={vault.inactivityWindow} />
                        )}

                        <div className="flex items-center gap-3 mt-5">
                          {vault.status === VaultStatus.ACTIVE && (
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => checkin(vault.vaultId)}
                              disabled={isChecking}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--green)]/10 border border-[var(--green)]/25 text-[var(--green)] hover:bg-[var(--green)]/20 transition-colors disabled:opacity-50"
                            >
                              <Activity className="w-4 h-4" />
                              {isChecking ? "Checking in..." : "Check In"}
                            </motion.button>
                          )}
                          <Link href={`/vault/${vault.vaultId}`}>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-ghost"
                            >
                              View Details <ChevronRight className="w-4 h-4" />
                            </motion.button>
                          </Link>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* ─── My Duties ─── */}
              {activeTab === "My Duties" && (
                <div className="space-y-4">
                  {witnessVaults.length === 0 ? (
                    <EmptyState
                      emoji="👁️"
                      title="No witness duties"
                      desc="You haven't been designated as a witness for any active vaults."
                    />
                  ) : (
                    witnessVaults.map((vault, i) => (
                      <motion.div
                        key={vault.vaultId}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="glass-bright rounded-2xl p-6 border border-[var(--border)]"
                      >
                        <div className="flex items-start justify-between mb-5">
                          <div>
                            <p className="text-xs font-mono text-[var(--muted)] mb-1">{truncateVaultId(vault.vaultId)}</p>
                            <p className="font-bold">
                              Owner: <span className="font-mono text-[var(--purple-bright)]">{truncateAddress(vault.owner)}</span>
                            </p>
                            <p className="text-sm text-[var(--muted)] mt-1">{triggerTypeToLabel(vault.triggerType)} trigger</p>
                          </div>
                          <span className={STATUS_CLASS[vault.status]}>{vaultStatusToLabel(vault.status)}</span>
                        </div>

                        {vault.triggerType === TriggerType.DEATH_QUORUM && (
                          <>
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2 text-sm">
                                <span className="text-[var(--muted)]">Witness votes</span>
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
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => attestDeath(vault.vaultId)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--pink)]/10 border border-[var(--pink)]/25 text-[var(--pink)] hover:bg-[var(--pink)]/20 transition-colors"
                            >
                              ⚰️ Attest Death
                            </motion.button>
                          </>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* ─── My Inheritances ─── */}
              {activeTab === "My Inheritances" && (
                <div className="space-y-4">
                  {beneficiaryVaults.length === 0 ? (
                    <EmptyState
                      emoji="🎁"
                      title="No inheritances"
                      desc="You haven't been designated as a beneficiary for any vaults yet."
                    />
                  ) : (
                    beneficiaryVaults.map((vault, i) => (
                      <motion.div
                        key={vault.vaultId}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="glass-bright rounded-2xl p-6 border border-[var(--border)]"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-xs font-mono text-[var(--muted)] mb-1">{truncateVaultId(vault.vaultId)}</p>
                            <p className="font-bold">
                              From: <span className="font-mono text-[var(--purple-bright)]">{truncateAddress(vault.owner)}</span>
                            </p>
                          </div>
                          <span className={STATUS_CLASS[vault.status]}>{vaultStatusToLabel(vault.status)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-4">
                          <span>{TRIGGER_ICONS[vault.triggerType]}</span>
                          <span>{triggerTypeToLabel(vault.triggerType)} trigger</span>
                        </div>

                        {vault.status === VaultStatus.RELEASED ? (
                          <Link href="/beneficiary">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-colors"
                            >
                              🔓 Claim Vault <ChevronRight className="w-4 h-4" />
                            </motion.button>
                          </Link>
                        ) : (
                          <p className="text-xs text-[var(--muted)] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Locked — waiting for release conditions
                          </p>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, desc, cta }: {
  emoji: string;
  title: string;
  desc: string;
  cta?: { label: string; href: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-bright rounded-3xl p-14 text-center border border-[var(--border)] glow-sm"
    >
      <div className="text-6xl mb-6">{emoji}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-[var(--muted)] mb-8 max-w-sm mx-auto leading-relaxed">{desc}</p>
      {cta && (
        <Link href={cta.href}>
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            className="btn-primary"
          >
            <Zap className="w-4 h-4" />
            {cta.label}
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}
