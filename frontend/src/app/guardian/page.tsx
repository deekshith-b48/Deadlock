"use client";

import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { motion } from "framer-motion";
import { Shield, Activity, Users, Zap, Terminal, ExternalLink, Copy, CheckCircle, Server, Radio } from "lucide-react";
import { DEADLOCK_REGISTRY_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { timeAgo } from "@/lib/utils/formatting";

interface TriggerEvent {
  vaultId: string;
  guardian: string;
  timestamp: number;
  txHash: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={copy}
      className="text-[var(--muted)] hover:text-[var(--purple-bright)] transition-colors"
    >
      {copied ? <CheckCircle className="w-4 h-4 text-[var(--green)]" /> : <Copy className="w-4 h-4" />}
    </motion.button>
  );
}

const SETUP_STEPS = [
  {
    step: "01",
    title: "Clone the repository",
    code: "git clone https://github.com/deadlock-protocol/deadlock\ncd deadlock",
  },
  {
    step: "02",
    title: "Configure environment",
    code: "cp .env.example guardian/.env\n# Set GUARDIAN_PRIVATE_KEY and NEXT_PUBLIC_REGISTRY_ADDRESS",
  },
  {
    step: "03",
    title: "Install & run guardian",
    code: "cd guardian\nnpm install\nnpm run dev",
  },
  {
    step: "04",
    title: "Run with Docker (recommended)",
    code: "docker build -t deadlock-guardian ./guardian\ndocker run --env-file guardian/.env deadlock-guardian",
  },
];

const ROLES = [
  {
    icon: <Activity className="w-6 h-6" />,
    title: "Monitor",
    desc: "Poll DeadlockRegistry every 60 seconds for expired inactivity windows and elapsed timelocks.",
    color: "var(--cyan)",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Consensus",
    desc: "Use libp2p GossipSub on deadlock/trigger-votes/v1 to coordinate with peers. Require 3+ votes.",
    color: "var(--purple-bright)",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Execute",
    desc: "When quorum is reached, call guardianTriggerInactivity() or guardianTriggerTimelock() on Filecoin FVM.",
    color: "var(--pink)",
  },
];

export default function GuardianPage() {
  const publicClient = usePublicClient();
  const [totalVaults, setTotalVaults] = useState<number | null>(null);
  const [recentTriggers, setRecentTriggers] = useState<TriggerEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    if (!publicClient) return;
    const load = async () => {
      try {
        const total = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.REGISTRY,
          abi: DEADLOCK_REGISTRY_ABI,
          functionName: "totalVaults",
        });
        setTotalVaults(Number(total));

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.REGISTRY,
          event: {
            name: "GuardianTrigger",
            type: "event",
            inputs: [
              { name: "vaultId", type: "bytes32", indexed: true },
              { name: "guardian", type: "address", indexed: true },
            ],
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        setRecentTriggers(
          logs.slice(-10).map((log) => ({
            vaultId: (log.args as any).vaultId as string,
            guardian: (log.args as any).guardian as string,
            timestamp: Date.now() / 1000,
            txHash: log.transactionHash,
          })).reverse()
        );
      } catch (err) {
        console.error("[Guardian page] Failed to load stats:", err);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    load();
  }, [publicClient]);

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
          <p className="text-[var(--purple-bright)] text-sm font-mono mb-2">// GUARDIAN NETWORK</p>
          <h1 className="text-4xl font-black mb-3">Run a Guardian Node</h1>
          <p className="text-[var(--muted)] text-lg leading-relaxed max-w-xl">
            Join the decentralized vault monitoring network. No registration. No permission needed. Earn protocol trust.
          </p>
        </motion.div>

        {/* Network stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-12"
        >
          {[
            { label: "Total Vaults", value: totalVaults !== null ? totalVaults : "—", color: "var(--purple-bright)", icon: "🔐" },
            { label: "Recent Triggers", value: recentTriggers.length, color: "var(--green)", icon: "⚡" },
            { label: "Quorum Threshold", value: 3, color: "var(--cyan)", icon: "🗳" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="stat-card pulse-glow">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-3xl font-black font-mono mb-1" style={{ color }}>{value}</div>
              <div className="text-sm text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* What guardians do */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-bright rounded-3xl p-8 border border-[var(--border)] mb-8 glow-sm"
        >
          <h2 className="text-xl font-bold mb-8">What Guardians Do</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {ROLES.map(({ icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-center"
              >
                <div
                  className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                  style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
                >
                  {icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Setup instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-bright rounded-3xl p-8 border border-[var(--border)] mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--purple)]/20 border border-[var(--purple)]/30 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-[var(--purple-bright)]" />
            </div>
            <h2 className="text-xl font-bold">Setup Your Node</h2>
          </div>
          <p className="text-[var(--muted)] text-sm mb-8 ml-13">
            Guardians are permissionless — anyone can run one. No sign-up, no fees, no central approval.
            <span className="text-amber-400 ml-2">⚠ Testnet phase — no on-chain rewards in MVP.</span>
          </p>

          <div className="space-y-6">
            {SETUP_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--purple)] flex items-center justify-center text-xs font-black text-white">
                    {s.step}
                  </div>
                  <span className="font-semibold">{s.title}</span>
                </div>
                <div className="relative group">
                  <pre className="glass rounded-2xl border border-[var(--border)] p-5 text-sm font-mono text-[var(--green)] overflow-x-auto leading-relaxed">
                    {s.code}
                  </pre>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={s.code} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-5 glass rounded-2xl border border-[var(--border)] text-sm">
            <div className="flex items-center gap-2 font-bold mb-2">
              <Server className="w-4 h-4 text-[var(--cyan)]" />
              Requirements
            </div>
            <ul className="text-[var(--muted)] space-y-1 ml-6 list-disc">
              <li>Node.js 20+ or Docker</li>
              <li>Filecoin Calibration wallet with tFIL for gas</li>
              <li>Stable internet connection (port 4001 open for libp2p)</li>
            </ul>
          </div>
        </motion.div>

        {/* Recent trigger events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-bright rounded-3xl p-8 border border-[var(--border)]"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/20 border border-[var(--green)]/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-[var(--green)]" />
            </div>
            <h2 className="text-xl font-bold">Recent Trigger Events</h2>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-ping" />
              <span className="text-xs text-[var(--green)] font-mono">LIVE</span>
            </div>
          </div>

          {isLoadingEvents ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-[var(--purple)] border-t-transparent animate-spin" />
              <p className="text-[var(--muted)] text-sm">Loading events from chain...</p>
            </div>
          ) : recentTriggers.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)]">
              <Activity className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-1">No trigger events yet</p>
              <p className="text-sm">Events will appear here when guardians execute vault releases.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTriggers.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 glass rounded-2xl border border-[var(--border)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/25 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-[var(--green)]" />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-[var(--muted)]">Vault: {event.vaultId.slice(0, 18)}...</p>
                      <p className="text-sm text-[var(--muted)] mt-0.5">
                        Guardian: <span className="font-mono text-[var(--text)]">{event.guardian.slice(0, 14)}...</span>
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://calibration.filscan.io/tx/${event.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--purple-bright)] bg-[var(--purple)]/10 hover:bg-[var(--purple)]/20 transition-colors"
                  >
                    FilScan <ExternalLink className="w-3 h-3" />
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
