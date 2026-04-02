// ─── TypeScript Types for DEADLOCK Vault Data ────────────────────────────────

export enum TriggerType {
  INACTIVITY = 0,
  TIMELOCK = 1,
  DEATH_QUORUM = 2,
  GEOPOLITICAL = 3,
  MUTUAL = 4,
}

export enum VaultStatus {
  ACTIVE = 0,
  RELEASED = 1,
  CANCELLED = 2,
}

export interface Vault {
  vaultId: string; // bytes32 hex string
  owner: string; // checksummed address
  worldIdNullifier: bigint;
  encryptedCID: string; // IPFS CID
  litActionCID: string; // IPFS CID of Lit Action
  triggerType: TriggerType;
  triggerValue: bigint; // TIMELOCK: unix timestamp; others: 0
  lastCheckin: bigint; // unix timestamp
  inactivityWindow: bigint; // seconds
  beneficiaries: string[]; // array of addresses
  witnesses: string[]; // array of addresses
  witnessQuorum: bigint;
  witnessVoteCount: bigint;
  status: VaultStatus;
  createdAt: bigint;
  releasedAt: bigint;
}

export interface CreateVaultParams {
  worldIdNullifier: bigint;
  worldIdProof: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  encryptedCID: string;
  litActionCID: string;
  triggerType: TriggerType;
  triggerValue: bigint;
  inactivityWindow: bigint;
  beneficiaries: string[];
  witnesses: string[];
  witnessQuorum: bigint;
}

export interface VaultPayload {
  files: { name: string; type: string; data: string }[]; // base64-encoded file data
  message: string;
  credentials: string;
  metadata: {
    createdAt: number;
    vaultId?: string;
    version: string;
  };
}

export interface EncryptedVaultPayload {
  encryptedData: string; // base64-encoded Uint8Array
  encryptedSymmetricKey: string;
  metadata: {
    createdAt: number;
    version: string;
  };
}

export interface TriggerConfig {
  type: TriggerType;
  // INACTIVITY / GEOPOLITICAL
  inactivityDays?: number;
  // TIMELOCK
  unlockDate?: Date;
  // DEATH_QUORUM
  witnessAddresses?: string[];
  quorumCount?: number;
}

export interface BeneficiaryConfig {
  address: string;
  nickname?: string;
}

export interface CreateVaultFormData {
  worldIdVerified: boolean;
  worldIdNullifier?: bigint;
  worldIdProof?: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  files: File[];
  message: string;
  credentials: string;
  triggerConfig: TriggerConfig;
  beneficiaries: BeneficiaryConfig[];
  witnesses: BeneficiaryConfig[];
}

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  [TriggerType.INACTIVITY]: "Inactivity",
  [TriggerType.TIMELOCK]: "Time Lock",
  [TriggerType.DEATH_QUORUM]: "Death Quorum",
  [TriggerType.GEOPOLITICAL]: "Geopolitical",
  [TriggerType.MUTUAL]: "Mutual",
};

export const TRIGGER_TYPE_ICONS: Record<TriggerType, string> = {
  [TriggerType.INACTIVITY]: "🕐",
  [TriggerType.TIMELOCK]: "📅",
  [TriggerType.DEATH_QUORUM]: "⚰️",
  [TriggerType.GEOPOLITICAL]: "🌍",
  [TriggerType.MUTUAL]: "🔗",
};

export const STATUS_LABELS: Record<VaultStatus, string> = {
  [VaultStatus.ACTIVE]: "Active",
  [VaultStatus.RELEASED]: "Released",
  [VaultStatus.CANCELLED]: "Cancelled",
};

export const STATUS_COLORS: Record<VaultStatus, string> = {
  [VaultStatus.ACTIVE]: "text-green-400 bg-green-400/10",
  [VaultStatus.RELEASED]: "text-orange-400 bg-orange-400/10",
  [VaultStatus.CANCELLED]: "text-gray-400 bg-gray-400/10",
};
