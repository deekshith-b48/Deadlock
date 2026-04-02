import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// ─── Access Control Conditions ────────────────────────────────────────────────
// These are evaluated by Lit Protocol nodes against the Filecoin FVM chain.

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Build the two-condition ACC array that Lit Protocol evaluates on Filecoin FVM:
 *   1. isReleaseConditionMet(vaultId) == true  (vault is in RELEASED state)
 *   2. isBeneficiary(vaultId, :userAddress) == true  (requester is registered beneficiary)
 *
 * `:userAddress` is Lit Protocol's special placeholder that resolves to the wallet
 * address of the person requesting decryption — enforcing beneficiary-only access.
 */
function buildBaseConditions(vaultId: string, registry: string): object[] {
  return [
    {
      contractAddress: registry,
      standardContractType: "",
      chain: "filecoin",
      method: "isReleaseConditionMet",
      parameters: [vaultId],
      returnValueTest: {
        comparator: "=",
        value: "true",
      },
    },
    { operator: "and" },
    {
      contractAddress: registry,
      standardContractType: "",
      chain: "filecoin",
      method: "isBeneficiary",
      parameters: [vaultId, ":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: "true",
      },
    },
  ];
}

export function buildInactivityConditions(
  vaultId: string,
  registryAddress?: string
): object[] {
  const registry = registryAddress || CONTRACT_ADDRESSES.REGISTRY;
  return buildBaseConditions(vaultId, registry);
}

export function buildTimelockConditions(
  vaultId: string,
  registryAddress?: string
): object[] {
  const registry = registryAddress || CONTRACT_ADDRESSES.REGISTRY;
  return buildBaseConditions(vaultId, registry);
}

export function buildDeathQuorumConditions(
  vaultId: string,
  registryAddress?: string
): object[] {
  const registry = registryAddress || CONTRACT_ADDRESSES.REGISTRY;
  return buildBaseConditions(vaultId, registry);
}

export function buildGeopoliticalConditions(
  vaultId: string,
  registryAddress?: string
): object[] {
  return buildInactivityConditions(vaultId, registryAddress);
}

// Generic builder — picks the right condition based on trigger type
export function buildAccessControlConditions(
  vaultId: string,
  triggerType: number,
  registryAddress?: string
): object[] {
  switch (triggerType) {
    case 0: // INACTIVITY
      return buildInactivityConditions(vaultId, registryAddress);
    case 1: // TIMELOCK
      return buildTimelockConditions(vaultId, registryAddress);
    case 2: // DEATH_QUORUM
      return buildDeathQuorumConditions(vaultId, registryAddress);
    case 3: // GEOPOLITICAL
      return buildGeopoliticalConditions(vaultId, registryAddress);
    case 4: // MUTUAL — uses same release+beneficiary check
      return buildInactivityConditions(vaultId, registryAddress);
    default:
      return buildInactivityConditions(vaultId, registryAddress);
  }
}
