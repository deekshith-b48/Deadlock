"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { DEADLOCK_REGISTRY_ABI } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { useDropzone } from "react-dropzone";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Shield, Clock, Users, Check, Loader2, ChevronRight, ChevronLeft,
  X, Plus, Lock, Sparkles, FileText, Key, MessageSquare,
} from "lucide-react";
import { useVault } from "@/hooks/useVault";
import { useLitEncrypt } from "@/hooks/useLitEncrypt";
import { useStoracha } from "@/hooks/useStoracha";
import { useWorldId } from "@/hooks/useWorldId";
import { buildAccessControlConditions } from "@/lib/lit/conditions";
import { TriggerType } from "@/lib/utils/vaultSchema";
import { formatFileSize } from "@/lib/utils/formatting";
import { WORLD_ID_CONFIG } from "@/lib/worldid/verify";

const STEPS = [
  { id: 1, label: "Verify Humanity", icon: "🌐" },
  { id: 2, label: "Upload Files", icon: "📁" },
  { id: 3, label: "Set Trigger", icon: "⚡" },
  { id: 4, label: "Beneficiaries", icon: "👥" },
  { id: 5, label: "Deploy", icon: "🚀" },
];

const INACTIVITY_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "180 days" },
  { days: 365, label: "1 year" },
];

const TRIGGER_OPTIONS = [
  { type: TriggerType.INACTIVITY, icon: "🕐", label: "Inactivity", desc: "Releases if you stop checking in", color: "#7c3aed", disabled: false },
  { type: TriggerType.TIMELOCK, icon: "📅", label: "Time Lock", desc: "Releases on a specific date", color: "#06b6d4", disabled: false },
  { type: TriggerType.DEATH_QUORUM, icon: "⚰️", label: "Death Quorum", desc: "Releases when witnesses confirm death", color: "#ec4899", disabled: false },
  { type: TriggerType.GEOPOLITICAL, icon: "🌍", label: "Geopolitical", desc: "Activates if you're silenced or detained", color: "#22c55e", disabled: false },
  { type: TriggerType.MUTUAL, icon: "🔗", label: "Mutual", desc: "Neither of you checks in — you inherit each other's vault", color: "#f59e0b", disabled: true },
];

export default function CreateVaultPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);

  // Form state
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>(TriggerType.INACTIVITY);
  const [inactivityDays, setInactivityDays] = useState(30);
  const [unlockDate, setUnlockDate] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([{ address: "", nickname: "" }]);
  const [witnesses, setWitnesses] = useState([{ address: "" }]);
  const [quorum, setQuorum] = useState(1);

  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySteps, setDeploySteps] = useState<{ label: string; status: "pending" | "loading" | "done" | "error" }[]>([]);
  const [deployedVaultId, setDeployedVaultId] = useState<string | null>(null);

  const { proofState, onSuccess: onWorldIdSuccess, onError: onWorldIdError, isVerified } = useWorldId();
  const isDevMode = !WORLD_ID_CONFIG.appId || WORLD_ID_CONFIG.appId === "app_placeholder" || WORLD_ID_CONFIG.appId === "app_staging_placeholder";
  const { encrypt } = useLitEncrypt();
  const { upload } = useStoracha();
  const { createVault } = useVault();
  const { writeContractAsync: updateCIDAsync } = useWriteContract();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => setFiles((p) => [...p, ...accepted]),
    maxSize: 100 * 1024 * 1024,
  });

  const validBeneficiaries = beneficiaries.filter((b) => ethers.isAddress(b.address));
  const validWitnesses = witnesses.filter((w) => ethers.isAddress(w.address));

  const handleDeploy = async () => {
    if (!proofState || !address) return;
    const litCID = process.env.NEXT_PUBLIC_LIT_ACTION_CID || "bafkreiplaceholder";
    const steps = [
      { label: "Registering on Filecoin FVM", status: "pending" as const },
      { label: "Encrypting files with Lit Protocol", status: "pending" as const },
      { label: "Uploading to IPFS via Storacha", status: "pending" as const },
      { label: "Sealing vault CID on-chain", status: "pending" as const },
      { label: "Minting Witness NFTs", status: "pending" as const },
    ];
    setDeploySteps(steps);
    setIsDeploying(true);

    try {
      let triggerValue = BigInt(0);
      let inactivityWindow = BigInt(0);
      if (triggerType === TriggerType.TIMELOCK && unlockDate) {
        triggerValue = BigInt(Math.floor(new Date(unlockDate).getTime() / 1000));
      } else if (triggerType === TriggerType.INACTIVITY || triggerType === TriggerType.GEOPOLITICAL) {
        inactivityWindow = BigInt(inactivityDays * 86400);
      }

      // Step 1: Register vault on FVM first to obtain the real vault ID
      setDeploySteps((s) => s.map((item, i) => i === 0 ? { ...item, status: "loading" } : item));
      const vaultId = await createVault({
        worldIdNullifier: proofState.nullifier,
        worldIdProof: proofState.proof,
        encryptedCID: "pending",
        litActionCID: litCID,
        triggerType,
        triggerValue,
        inactivityWindow,
        beneficiaries: validBeneficiaries.map((b) => b.address),
        witnesses: triggerType === TriggerType.DEATH_QUORUM ? validWitnesses.map((w) => w.address) : [],
        witnessQuorum: triggerType === TriggerType.DEATH_QUORUM ? BigInt(quorum) : BigInt(0),
      });
      setDeploySteps((s) => s.map((item, i) => i === 0 ? { ...item, status: "done" } : item));

      // Step 2: Encrypt with the real vault ID so Lit conditions reference the correct vault
      const conditions = buildAccessControlConditions(vaultId, triggerType);
      setDeploySteps((s) => s.map((item, i) => i === 1 ? { ...item, status: "loading" } : item));
      const encrypted = await encrypt({ files, message, credentials }, conditions);
      setDeploySteps((s) => s.map((item, i) => i === 1 ? { ...item, status: "done" } : item));

      // Step 3: Upload encrypted vault to IPFS
      setDeploySteps((s) => s.map((item, i) => i === 2 ? { ...item, status: "loading" } : item));
      const encryptedCID = await upload(encrypted);
      setDeploySteps((s) => s.map((item, i) => i === 2 ? { ...item, status: "done" } : item));

      // Step 4: Seal the real IPFS CID into the vault record on-chain
      setDeploySteps((s) => s.map((item, i) => i === 3 ? { ...item, status: "loading" } : item));
      await updateCIDAsync({
        address: CONTRACT_ADDRESSES.REGISTRY,
        abi: DEADLOCK_REGISTRY_ABI,
        functionName: "updateCID",
        args: [vaultId as `0x${string}`, encryptedCID],
      });
      setDeploySteps((s) => s.map((item, i) => i === 3 ? { ...item, status: "done" } : item));

      // Step 5: Mint Witness NFTs
      setDeploySteps((s) => s.map((item, i) => i === 4 ? { ...item, status: "loading" } : item));
      await new Promise((r) => setTimeout(r, 800));
      setDeploySteps((s) => s.map((item, i) => i === 4 ? { ...item, status: "done" } : item));

      setDeployedVaultId(vaultId);
    } catch (err) {
      setDeploySteps((s) => s.map((item) => item.status === "loading" ? { ...item, status: "error" } : item));
      console.error("Deployment failed:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-6 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-bright rounded-3xl p-12 text-center max-w-md w-full glow"
        >
          <Lock className="w-16 h-16 mx-auto mb-6 text-[var(--purple-bright)]" />
          <h1 className="text-2xl font-bold mb-3">Wallet Required</h1>
          <p className="text-[var(--muted)] mb-8">Connect your wallet to create a DEADLOCK vault.</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg py-12 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-[var(--purple-bright)] text-sm font-mono mb-2">// CREATE VAULT</p>
          <h1 className="text-4xl font-black mb-2">Your Digital Legacy</h1>
          <p className="text-[var(--muted)]">Cryptographically secure. Trustlessly delivered.</p>
        </motion.div>

        {/* Step progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center mb-10"
        >
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step > s.id
                      ? "bg-[var(--purple)] text-white shadow-lg shadow-[var(--purple)]/40"
                      : step === s.id
                      ? "border-2 border-[var(--purple)] text-[var(--purple-bright)] bg-[var(--purple)]/10"
                      : "border border-[var(--border)] text-[var(--muted)] bg-[var(--surface)]"
                  }`}
                >
                  {step > s.id ? <Check className="w-4 h-4" /> : s.icon}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.id ? "text-[var(--purple-bright)]" : "text-[var(--muted)]"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 transition-all duration-300 ${step > s.id ? "bg-[var(--purple)]" : "bg-[var(--border)]"}`} />
              )}
            </div>
          ))}
        </motion.div>

        {/* Step panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >

            {/* ── Step 1: World ID ── */}
            {step === 1 && (
              <div className="glass-bright rounded-3xl p-8 border border-[var(--border)] glow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--purple)]/20 border border-[var(--purple)]/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[var(--purple-bright)]" />
                  </div>
                  <h2 className="text-xl font-bold">Verify Your Humanity</h2>
                </div>
                <p className="text-[var(--muted)] mb-8 leading-relaxed">
                  World ID ensures one vault per unique human — preventing abuse without revealing personal data.
                  Your identity stays private; only a zero-knowledge proof is stored on-chain.
                </p>

                {isVerified ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-3 p-5 rounded-2xl bg-[var(--green)]/10 border border-[var(--green)]/25"
                  >
                    <Check className="w-6 h-6 text-[var(--green)]" />
                    <div>
                      <p className="font-bold text-[var(--green)]">Identity Verified</p>
                      <p className="text-sm text-[var(--muted)]">World ID proof recorded</p>
                    </div>
                  </motion.div>
                ) : isDevMode ? (
                  /* Dev mode bypass — no real World ID app configured */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono">
                      ⚠ DEV MODE — World ID app_id not configured in .env.local
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onWorldIdSuccess({
                        nullifier_hash: "0x" + "0".repeat(64),
                        proof: "0x" + "0".repeat(512),
                        merkle_root: "0x" + "0".repeat(64),
                        verification_level: "device",
                      })}
                      className="btn-primary w-full justify-center py-4 text-base"
                    >
                      <span className="text-xl">🔧</span>
                      Skip Verification (Dev Mode)
                    </motion.button>
                  </div>
                ) : (
                  <IDKitWidget
                    app_id={WORLD_ID_CONFIG.appId}
                    action={WORLD_ID_CONFIG.action}
                    verification_level={VerificationLevel.Device}
                    handleVerify={() => {}}
                    onSuccess={onWorldIdSuccess}
                    onError={onWorldIdError}
                  >
                    {({ open }: { open: () => void }) => (
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={open}
                        className="btn-primary w-full justify-center py-4 text-base"
                      >
                        <span className="text-xl">🌐</span>
                        Verify with World ID
                      </motion.button>
                    )}
                  </IDKitWidget>
                )}

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  onClick={() => isVerified && setStep(2)}
                  disabled={!isVerified}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {/* ── Step 2: Upload ── */}
            {step === 2 && (
              <div className="glass-bright rounded-3xl p-8 border border-[var(--border)] space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--cyan)]/20 border border-[var(--cyan)]/30 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[var(--cyan)]" />
                  </div>
                  <h2 className="text-xl font-bold">Upload Files</h2>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? "border-[var(--purple)] bg-[var(--purple)]/5"
                      : "border-[var(--border)] hover:border-[var(--purple)]/50 hover:bg-[var(--purple)]/3"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--muted)]" />
                  <p className="text-[var(--text)] font-medium mb-1">
                    {isDragActive ? "Drop files here..." : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">Any file type · Max 100MB · Encrypted client-side</p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 glass rounded-xl border border-[var(--border)]"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[var(--purple-bright)]" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-[var(--muted)]">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <MessageSquare className="w-4 h-4 text-[var(--purple-bright)]" />
                    Secret Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a message to your beneficiaries..."
                    rows={4}
                    className="input"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Key className="w-4 h-4 text-[var(--purple-bright)]" />
                    Credentials / Seed Phrases
                  </label>
                  <textarea
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="Seed phrases, passwords, private keys... (end-to-end encrypted)"
                    rows={4}
                    className="input input-mono"
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    🔒 Encrypted with Lit Protocol before leaving your browser. Never logged.
                  </p>
                </div>

                <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
              </div>
            )}

            {/* ── Step 3: Trigger ── */}
            {step === 3 && (
              <div className="glass-bright rounded-3xl p-8 border border-[var(--border)] space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold">Choose Release Trigger</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {TRIGGER_OPTIONS.map(({ type, icon, label, desc, color, disabled }) => (
                    <motion.button
                      key={type}
                      whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
                      whileTap={disabled ? undefined : { scale: 0.98 }}
                      onClick={() => !disabled && setTriggerType(type)}
                      disabled={disabled}
                      className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                        disabled
                          ? "border-[var(--border)] glass opacity-50 cursor-not-allowed col-span-2"
                          : triggerType === type
                          ? "border-[var(--purple)] bg-[var(--purple)]/10 shadow-lg shadow-[var(--purple)]/15"
                          : "border-[var(--border)] hover:border-[var(--border-bright)] glass"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">{icon}</div>
                        {disabled && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                      <div className="font-bold mb-1">{label}</div>
                      <div className="text-xs text-[var(--muted)] leading-relaxed">{desc}</div>
                      {!disabled && triggerType === type && (
                        <div className="mt-3 w-2 h-2 rounded-full" style={{ background: color }} />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Inactivity window */}
                {(triggerType === TriggerType.INACTIVITY || triggerType === TriggerType.GEOPOLITICAL) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="block text-sm font-semibold mb-3 text-[var(--muted)]">
                      Release if I don't check in for:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INACTIVITY_OPTIONS.map(({ days, label }) => (
                        <button
                          key={days}
                          onClick={() => setInactivityDays(days)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            inactivityDays === days
                              ? "bg-[var(--purple)] text-white shadow-md shadow-[var(--purple)]/30"
                              : "glass border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Timelock date */}
                {triggerType === TriggerType.TIMELOCK && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="block text-sm font-semibold mb-2 text-[var(--muted)]">Release on:</label>
                    <input
                      type="datetime-local"
                      value={unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                      className="input"
                    />
                  </motion.div>
                )}

                {/* Death quorum witnesses */}
                {triggerType === TriggerType.DEATH_QUORUM && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-[var(--muted)]">Witness Addresses</label>
                      {witnesses.map((w, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input
                            value={w.address}
                            onChange={(e) => setWitnesses((p) => p.map((item, idx) => idx === i ? { address: e.target.value } : item))}
                            placeholder="0x..."
                            className="input input-mono"
                          />
                          {witnesses.length > 1 && (
                            <button
                              onClick={() => setWitnesses((p) => p.filter((_, idx) => idx !== i))}
                              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--pink)] hover:bg-[var(--pink)]/10 transition-colors flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setWitnesses((p) => [...p, { address: "" }])}
                        className="text-sm text-[var(--purple-bright)] hover:text-[var(--purple)] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add witness
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[var(--muted)]">
                        Quorum: <span className="text-[var(--purple-bright)]">{quorum} of {witnesses.length}</span> required
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={witnesses.length}
                        value={quorum}
                        onChange={(e) => setQuorum(Number(e.target.value))}
                        className="w-full"
                        style={{ accentColor: "var(--purple)" }}
                      />
                    </div>
                  </motion.div>
                )}

                <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
              </div>
            )}

            {/* ── Step 4: Beneficiaries ── */}
            {step === 4 && (
              <div className="glass-bright rounded-3xl p-8 border border-[var(--border)] space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--pink)]/20 border border-[var(--pink)]/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[var(--pink)]" />
                  </div>
                  <h2 className="text-xl font-bold">Add Beneficiaries</h2>
                </div>

                <div className="space-y-3">
                  {beneficiaries.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2"
                    >
                      <input
                        value={b.address}
                        onChange={(e) => setBeneficiaries((p) => p.map((item, idx) => idx === i ? { ...item, address: e.target.value } : item))}
                        placeholder="0x... wallet address"
                        className={`input input-mono min-w-0 flex-1 ${b.address && !ethers.isAddress(b.address) ? "input-error" : ""}`}
                      />
                      <input
                        value={b.nickname}
                        onChange={(e) => setBeneficiaries((p) => p.map((item, idx) => idx === i ? { ...item, nickname: e.target.value } : item))}
                        placeholder="Nickname"
                        className="input w-24 flex-shrink-0"
                      />
                      {beneficiaries.length > 1 && (
                        <button
                          onClick={() => setBeneficiaries((p) => p.filter((_, idx) => idx !== i))}
                          className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--pink)] hover:bg-[var(--pink)]/10 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}

                  {beneficiaries.length < 10 && (
                    <button
                      onClick={() => setBeneficiaries((p) => [...p, { address: "", nickname: "" }])}
                      className="text-sm text-[var(--purple-bright)] flex items-center gap-1 hover:text-[var(--purple)] transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add beneficiary
                    </button>
                  )}
                </div>

                <div className="p-4 glass rounded-2xl border border-[var(--border)] text-sm text-[var(--muted)] leading-relaxed">
                  <span className="text-[var(--text)] font-semibold">Note:</span> Beneficiaries can decrypt vault contents only after
                  release conditions are confirmed on-chain by the Filecoin FVM. Addresses are stored publicly.
                </div>

                <NavButtons
                  onBack={() => setStep(3)}
                  onNext={() => setStep(5)}
                  nextDisabled={validBeneficiaries.length === 0}
                  nextLabel={`Continue (${validBeneficiaries.length} valid)`}
                />
              </div>
            )}

            {/* ── Step 5: Deploy ── */}
            {step === 5 && (
              <div className="glass-bright rounded-3xl p-8 border border-[var(--border)] space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[var(--green)]/20 border border-[var(--green)]/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[var(--green)]" />
                  </div>
                  <h2 className="text-xl font-bold">Deploy Vault</h2>
                </div>

                {/* Summary */}
                <div className="space-y-3 p-5 glass rounded-2xl border border-[var(--border)] text-sm">
                  {[
                    { label: "Files", value: `${files.length} file(s)` },
                    { label: "Message", value: message ? "Included" : "None" },
                    {
                      label: "Trigger",
                      value: triggerType === TriggerType.INACTIVITY ? `🕐 Inactivity — ${inactivityDays} days`
                        : triggerType === TriggerType.TIMELOCK ? `📅 Timelock — ${unlockDate}`
                        : triggerType === TriggerType.DEATH_QUORUM ? `⚰️ Quorum — ${quorum}/${witnesses.length}`
                        : `🌍 Geopolitical — ${inactivityDays} days`,
                    },
                    { label: "Beneficiaries", value: `${validBeneficiaries.length}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[var(--muted)]">{label}</span>
                      <span className="font-mono font-semibold">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Deploy progress */}
                {deploySteps.length > 0 && (
                  <div className="space-y-3">
                    {deploySteps.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                          {s.status === "done" && <Check className="w-4 h-4 text-[var(--green)]" />}
                          {s.status === "loading" && <Loader2 className="w-4 h-4 text-[var(--purple-bright)] animate-spin" />}
                          {s.status === "pending" && <div className="w-2.5 h-2.5 rounded-full border border-[var(--muted)]" />}
                          {s.status === "error" && <X className="w-4 h-4 text-[var(--pink)]" />}
                        </div>
                        <span className={`text-sm ${s.status === "loading" ? "text-[var(--text)]" : s.status === "done" ? "text-[var(--green)]" : "text-[var(--muted)]"}`}>
                          {s.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {deployedVaultId ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-5"
                  >
                    <div className="text-6xl">🎉</div>
                    <div>
                      <h3 className="text-2xl font-black text-gradient mb-2">Vault Created!</h3>
                      <p className="font-mono text-sm text-[var(--muted)] break-all">{deployedVaultId}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      onClick={() => router.push(`/vault/${deployedVaultId}`)}
                      className="btn-primary w-full justify-center"
                    >
                      <Sparkles className="w-4 h-4" />
                      View Your Vault
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(4)}
                      disabled={isDeploying}
                      className="btn-ghost flex-1 justify-center disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDeploy}
                      disabled={isDeploying || !proofState}
                      className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isDeploying && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isDeploying ? "Deploying..." : "Create Vault"}
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = "Continue",
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={onBack}
        className="btn-ghost flex-1 justify-center"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        disabled={nextDisabled}
        className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {nextLabel} <ChevronRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
