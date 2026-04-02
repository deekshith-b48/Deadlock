"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Shield, Lock, Clock, Key, Zap, Globe, Users, ChevronRight } from "lucide-react";

/* ── Animation Variants ───────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.1 } } };
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
};

/* ── Data ─────────────────────────────────────────────── */
const STATS = [
  { value: "$200B+", label: "In Lost Crypto", color: "#fb923c" },
  { value: "0", label: "Central Servers", color: "#22c55e" },
  { value: "7", label: "Sponsor Protocols", color: "#9f67ff" },
  { value: "∞", label: "Lines of Trust", color: "#06b6d4" },
];

const USE_CASES = [
  {
    emoji: "₿",
    title: "Crypto Holder",
    desc: "Your seed phrases transfer automatically to family after inactivity — no lawyers, no probate court, no lost keys.",
    accent: "#fb923c",
    gradient: "from-orange-500/10 to-yellow-500/5",
    border: "border-orange-500/20",
  },
  {
    emoji: "📰",
    title: "Journalist / Activist",
    desc: "Evidence locked behind a dead man's switch. If you're silenced, witnesses attest and the truth releases automatically.",
    accent: "#06b6d4",
    gradient: "from-cyan-500/10 to-blue-500/5",
    border: "border-cyan-500/20",
  },
  {
    emoji: "🏢",
    title: "Business Owner",
    desc: "Critical credentials, succession plans, and access keys. Set timelock for 2035 or trigger on inactivity.",
    accent: "#9f67ff",
    gradient: "from-purple-500/10 to-pink-500/5",
    border: "border-purple-500/20",
  },
];

const HOW_IT_WORKS = [
  { step: "01", icon: <Shield className="w-5 h-5" />, title: "Verify Humanity", desc: "Prove you're human with World ID. One vault per person — no duplicates, no bots.", color: "#22c55e" },
  { step: "02", icon: <Lock className="w-5 h-5" />, title: "Encrypt & Store", desc: "Lit Protocol encrypts your vault. Contents stored permanently on IPFS & Filecoin.", color: "#9f67ff" },
  { step: "03", icon: <Clock className="w-5 h-5" />, title: "Set Conditions", desc: "Choose inactivity window, timelock date, witness quorum, or geopolitical triggers.", color: "#06b6d4" },
  { step: "04", icon: <Key className="w-5 h-5" />, title: "Auto Release", desc: "Guardian network monitors 24/7. When conditions are met on-chain, the key releases.", color: "#fb923c" },
];

const TECH = [
  { name: "Filecoin FVM", desc: "Smart contracts & permanent storage" },
  { name: "Lit Protocol", desc: "Trustless encryption & decryption" },
  { name: "IPFS / Storacha", desc: "Decentralized file storage" },
  { name: "libp2p", desc: "P2P guardian heartbeat network" },
  { name: "World ID", desc: "Proof-of-humanity gating" },
  { name: "Hypercerts", desc: "Inheritance event attestation" },
];

/* ── Animated background orbs ─────────────────────────── */
function Orbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)", filter: "blur(60px)" }}
      />
    </div>
  );
}

/* ── Floating skull icon ──────────────────────────────── */
function FloatingIcon() {
  return (
    <motion.div
      animate={{ y: [0, -16, 0], rotateZ: [0, 3, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="relative"
    >
      <div
        className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl mx-auto"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.15))",
          border: "1px solid rgba(124,58,237,0.4)",
          boxShadow: "0 0 60px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        ☠️
      </div>
      {/* Ping ring */}
      <motion.div
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-3xl border border-purple-500/30"
      />
    </motion.div>
  );
}

/* ── Live terminal ticker ─────────────────────────────── */
function TerminalTicker() {
  const lines = [
    { color: "#22c55e", text: "vault_0xd4e9…f2a1 » ACTIVE · 23 days until trigger" },
    { color: "#9f67ff", text: "guardian_0x7f3a…c8b2 » CONNECTED · monitoring 847 vaults" },
    { color: "#06b6d4", text: "lit_nodes » ONLINE · datil-test network · 12/12 nodes" },
    { color: "#fb923c", text: "vault_0x8c2d…e9f3 » RELEASED · beneficiary claimed" },
    { color: "#22c55e", text: "checkin_0x1a5b…d7e8 » OK · timer reset · 30 days window" },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ background: "rgba(5,5,8,0.9)", borderColor: "rgba(124,58,237,0.2)" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-900/30">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-gray-600 font-mono">deadlock_network.log</span>
      </div>
      <div className="p-4 space-y-2">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 + 0.5 }}
            className="flex items-center gap-2 font-mono text-xs"
          >
            <span style={{ color: l.color }}>›</span>
            <span className="text-gray-400">{l.text}</span>
          </motion.div>
        ))}
        <motion.div
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="font-mono text-xs text-purple-400"
        >
          █
        </motion.div>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#050508" }}>
      <Orbs />

      {/* Grid bg */}
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none z-0" />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="mb-6">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                style={{
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#9f67ff",
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                />
                PL_Genesis Hackathon · Infrastructure & Digital Rights
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-6">
              Your Digital Life,{" "}
              <span className="text-gradient glow-text">
                Cryptographically Guaranteed
              </span>{" "}
              Beyond Death
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-gray-400 leading-relaxed mb-10 max-w-lg">
              A trustless dead man's switch with zero central servers. Your vaults auto-release
              to beneficiaries when programmable on-chain conditions are met.{" "}
              <span className="text-white font-semibold">No lawyers. No companies. Just math.</span>
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-12">
              <Link href="/vault/create" className="btn-primary pulse-glow">
                Create Your Vault
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/dashboard" className="btn-ghost">
                View Dashboard
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-black font-mono" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — terminal + floating icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-6"
          >
            <FloatingIcon />
            <TerminalTicker />
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────── */}
      <section className="relative z-10 border-y" style={{ borderColor: "rgba(124,58,237,0.1)", background: "rgba(13,13,20,0.5)" }}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {TECH.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <div>
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  <span className="text-xs text-gray-600 ml-2 hidden sm:inline">{t.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ─────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-purple-400 mb-3">Use Cases</p>
          <h2 className="text-4xl font-black mb-4">Who Needs DEADLOCK?</h2>
          <p className="text-gray-500 text-lg">Anyone with a digital life worth protecting.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {USE_CASES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`rounded-2xl p-8 border bg-gradient-to-br ${c.gradient} ${c.border} cursor-default`}
              style={{ backdropFilter: "blur(16px)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
                style={{ background: `${c.accent}15`, border: `1px solid ${c.accent}25` }}
              >
                {c.emoji}
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: c.accent }}>
                {c.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-sm">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-purple-400 mb-3">Protocol</p>
          <h2 className="text-4xl font-black mb-4">How DEADLOCK Works</h2>
          <p className="text-gray-500 text-lg">Four steps. Zero trust required.</p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute top-10 left-[12.5%] right-[12.5%] h-px hidden lg:block"
            style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), rgba(236,72,153,0.3), rgba(6,182,212,0.3), transparent)" }}
          />

          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
                    style={{
                      background: `${s.color}15`,
                      border: `1px solid ${s.color}30`,
                      color: s.color,
                    }}
                  >
                    {s.icon}
                  </motion.div>
                </div>
                <div className="text-xs font-mono text-gray-700 mb-2">{s.step}</div>
                <h3 className="font-bold text-base mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture diagram ───────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl p-8 border"
          style={{ background: "rgba(13,13,20,0.8)", borderColor: "rgba(124,58,237,0.2)", backdropFilter: "blur(20px)" }}
        >
          <h3 className="text-center font-bold text-xl mb-8 text-gray-300">Architecture</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { layer: "You", items: ["World ID", "Lit Encryption", "IPFS Upload"], color: "#9f67ff" },
              { layer: "Protocol", items: ["Filecoin FVM", "libp2p Guardians", "Lit Nodes"], color: "#06b6d4" },
              { layer: "Beneficiary", items: ["On-chain Verify", "Lit Decrypt", "Hypercert"], color: "#22c55e" },
            ].map((col) => (
              <div key={col.layer}>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full inline-block"
                  style={{ background: `${col.color}15`, color: col.color, border: `1px solid ${col.color}25` }}
                >
                  {col.layer}
                </div>
                <div className="space-y-2">
                  {col.items.map((item) => (
                    <div
                      key={item}
                      className="py-2 px-3 rounded-lg text-sm text-gray-400"
                      style={{ background: `${col.color}08`, border: `1px solid ${col.color}15` }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6 text-xs text-gray-700">
            Zero central servers · Fully trustless · Permanent on Filecoin
          </div>
        </motion.div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl p-12"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.08))",
            border: "1px solid rgba(124,58,237,0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-7xl mb-6"
          >
            🔐
          </motion.div>
          <h2 className="text-3xl font-black mb-4">
            Your vault won't create itself.
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            5 minutes. Zero lawyers. Works forever.
          </p>
          <Link href="/vault/create" className="btn-primary pulse-glow text-base px-10 py-4">
            Create Your Vault <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="relative z-10 border-t py-8 text-center" style={{ borderColor: "rgba(124,58,237,0.1)" }}>
        <p className="text-gray-700 text-sm font-mono">
          DEADLOCK Protocol · Built on Filecoin FVM · Trustless by Design
        </p>
      </footer>
    </div>
  );
}
