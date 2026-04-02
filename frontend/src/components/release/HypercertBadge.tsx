"use client";

import { Award, ExternalLink } from "lucide-react";

interface HypercertBadgeProps {
  hypercertId: string;
  vaultId: string;
  ownerAddress: string;
  beneficiaryAddress: string;
  releasedAt: number;
  triggerType: string;
}

export function HypercertBadge({
  hypercertId,
  vaultId,
  ownerAddress,
  beneficiaryAddress,
  releasedAt,
  triggerType,
}: HypercertBadgeProps) {
  const releasedDate = new Date(releasedAt * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 p-6">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 grid-bg pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-bold text-purple-300">DEADLOCK Inheritance Hypercert</div>
              <div className="text-xs text-purple-400/70 font-mono mt-0.5">{hypercertId}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-purple-400/70">Vault ID</span>
            <span className="font-mono text-xs">{vaultId.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-400/70">From</span>
            <span className="font-mono text-xs">{ownerAddress.slice(0, 12)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-400/70">To</span>
            <span className="font-mono text-xs">{beneficiaryAddress.slice(0, 12)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-400/70">Released</span>
            <span>{releasedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-400/70">Trigger</span>
            <span>{triggerType}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-purple-500/20">
          <div className="text-xs text-purple-400/50 text-center">
            Cryptographic proof of digital inheritance · DEADLOCK Protocol
          </div>
        </div>
      </div>
    </div>
  );
}
