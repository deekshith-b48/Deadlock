"use client";

import Link from "next/link";
import { VaultStatus, TriggerType, type Vault } from "@/lib/utils/vaultSchema";
import {
  truncateVaultId,
  timeAgo,
  triggerTypeToLabel,
  vaultStatusToLabel,
} from "@/lib/utils/formatting";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { useCheckin } from "@/hooks/useCheckin";

interface VaultCardProps {
  vault: Vault;
}

export function VaultCard({ vault }: VaultCardProps) {
  const { checkin, isChecking } = useCheckin();

  const statusClasses: Record<VaultStatus, string> = {
    [VaultStatus.ACTIVE]: "badge-active",
    [VaultStatus.RELEASED]: "badge-released",
    [VaultStatus.CANCELLED]: "badge-cancelled",
  };

  const triggerIcons: Record<TriggerType, string> = {
    [TriggerType.INACTIVITY]: "🕐",
    [TriggerType.TIMELOCK]: "📅",
    [TriggerType.DEATH_QUORUM]: "⚰️",
    [TriggerType.GEOPOLITICAL]: "🌍",
    [TriggerType.MUTUAL]: "🔗",
  };

  const isInactivity =
    vault.triggerType === TriggerType.INACTIVITY ||
    vault.triggerType === TriggerType.GEOPOLITICAL;

  const deadline =
    isInactivity
      ? fromUnixTime(Number(vault.lastCheckin) + Number(vault.inactivityWindow))
      : null;

  const isOverdue = deadline ? Date.now() > deadline.getTime() : false;

  return (
    <div className={`glass rounded-2xl p-6 border transition-colors hover:border-primary/30 ${
      isOverdue ? "border-red-500/30" : "border-border"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{triggerIcons[vault.triggerType]}</span>
          <div>
            <div className="font-mono text-xs text-muted-foreground">{truncateVaultId(vault.vaultId)}</div>
            <div className="font-semibold">{triggerTypeToLabel(vault.triggerType)} Vault</div>
          </div>
        </div>
        <span className={statusClasses[vault.status]}>{vaultStatusToLabel(vault.status)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs mb-0.5">Last Check-in</div>
          <div>{timeAgo(vault.lastCheckin)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-0.5">Beneficiaries</div>
          <div>{vault.beneficiaries.length}</div>
        </div>
        {isInactivity && deadline && vault.status === VaultStatus.ACTIVE && (
          <div className="col-span-2">
            <div className="text-muted-foreground text-xs mb-0.5">Next Check-in Deadline</div>
            <div className={isOverdue ? "text-red-400 font-medium" : "text-green-400"}>
              {isOverdue
                ? "OVERDUE — trigger may fire!"
                : formatDistanceToNow(deadline, { addSuffix: true })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {vault.status === VaultStatus.ACTIVE && isInactivity && (
          <button
            onClick={() => checkin(vault.vaultId)}
            disabled={isChecking}
            className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/30 disabled:opacity-50 transition-colors"
          >
            {isChecking ? "..." : "✓ Check In"}
          </button>
        )}
        <Link
          href={`/vault/${vault.vaultId}`}
          className="px-4 py-2 border border-border text-sm rounded-lg hover:border-primary/50 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
