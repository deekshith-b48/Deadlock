import { formatDistanceToNow, format, fromUnixTime } from "date-fns";
import { TriggerType, VaultStatus, type Vault } from "./vaultSchema";

// ─── Address Formatting ───────────────────────────────────────────────────────

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

// ─── Vault ID Formatting ──────────────────────────────────────────────────────

export function truncateVaultId(vaultId: string, chars = 8): string {
  if (!vaultId) return "";
  return `${vaultId.slice(0, chars + 2)}...${vaultId.slice(-chars)}`;
}

// ─── Time Formatting ──────────────────────────────────────────────────────────

export function formatUnixTimestamp(unix: bigint | number): string {
  if (!unix) return "Never";
  const ts = Number(unix);
  if (ts === 0) return "Never";
  try {
    return format(fromUnixTime(ts), "MMM d, yyyy 'at' HH:mm 'UTC'");
  } catch {
    return "Invalid date";
  }
}

export function timeAgo(unix: bigint | number): string {
  if (!unix) return "never";
  const ts = Number(unix);
  if (ts === 0) return "never";
  try {
    return formatDistanceToNow(fromUnixTime(ts), { addSuffix: true });
  } catch {
    return "unknown";
  }
}

export function secondsToHumanReadable(seconds: bigint | number): string {
  const s = Number(seconds);
  if (s <= 0) return "0 seconds";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

export function getNextCheckinDeadline(vault: Vault): Date | null {
  if (vault.triggerType !== TriggerType.INACTIVITY && vault.triggerType !== TriggerType.GEOPOLITICAL) {
    return null;
  }
  const deadlineUnix = Number(vault.lastCheckin) + Number(vault.inactivityWindow);
  return fromUnixTime(deadlineUnix);
}

export function getCheckinUrgency(vault: Vault): "safe" | "warning" | "critical" | "overdue" {
  const deadline = getNextCheckinDeadline(vault);
  if (!deadline) return "safe";

  const now = Date.now();
  const deadlineMs = deadline.getTime();
  const remaining = deadlineMs - now;
  const windowMs = Number(vault.inactivityWindow) * 1000;

  if (remaining <= 0) return "overdue";
  if (remaining <= windowMs * 0.1) return "critical"; // < 10% of window remaining
  if (remaining <= windowMs * 0.25) return "warning"; // < 25% remaining
  return "safe";
}

// ─── File Size Formatting ──────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ─── IPFS ────────────────────────────────────────────────────────────────────

export function cidToGatewayUrl(cid: string, gateway?: string): string {
  const gw = gateway || process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://w3s.link/ipfs";
  return `${gw}/${cid}`;
}

// ─── Vault Status ────────────────────────────────────────────────────────────

export function vaultStatusToLabel(status: VaultStatus): string {
  const labels = { [VaultStatus.ACTIVE]: "Active", [VaultStatus.RELEASED]: "Released", [VaultStatus.CANCELLED]: "Cancelled" };
  return labels[status] ?? "Unknown";
}

export function triggerTypeToLabel(type: TriggerType): string {
  const labels = {
    [TriggerType.INACTIVITY]: "Inactivity",
    [TriggerType.TIMELOCK]: "Time Lock",
    [TriggerType.DEATH_QUORUM]: "Death Quorum",
    [TriggerType.GEOPOLITICAL]: "Geopolitical",
    [TriggerType.MUTUAL]: "Mutual",
  };
  return labels[type] ?? "Unknown";
}

// ─── CSS Utilities ────────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
