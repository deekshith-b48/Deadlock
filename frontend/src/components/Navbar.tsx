"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vault/create", label: "Create Vault" },
  { href: "/beneficiary", label: "My Inheritances" },
  { href: "/guardian", label: "Run Guardian" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-[var(--purple)]/20 border border-[var(--purple)]/40 flex items-center justify-center text-lg glow-sm transition-all group-hover:bg-[var(--purple)]/30">
                ☠
              </div>
              <span className="font-mono font-black text-xl tracking-widest text-gradient">
                DEADLOCK
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => {
                const active = pathname === href || pathname?.startsWith(href + "/");
                return (
                  <Link key={href} href={href}>
                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 block ${
                        active
                          ? "text-[var(--purple-bright)] bg-[var(--purple)]/10 border border-[var(--purple)]/25"
                          : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                      }`}
                    >
                      {label}
                    </motion.span>
                  </Link>
                );
              })}
            </div>

            {/* Wallet + mobile toggle */}
            <div className="flex items-center gap-3">
              <ConnectButton
                chainStatus="icon"
                showBalance={false}
                accountStatus="address"
              />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-xl px-4 pb-4"
          >
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl my-1 text-sm font-semibold transition-colors ${
                    active
                      ? "text-[var(--purple-bright)] bg-[var(--purple)]/10"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </motion.nav>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
}
