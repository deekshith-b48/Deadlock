// Contract ABIs for DEADLOCK Protocol
// These match the deployed Solidity contracts exactly

export const DEADLOCK_REGISTRY_ABI = [
  // View functions
  {
    name: "getVault",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "vaultId", type: "bytes32" },
          { name: "owner", type: "address" },
          { name: "worldIdNullifier", type: "uint256" },
          { name: "encryptedCID", type: "string" },
          { name: "litActionCID", type: "string" },
          { name: "triggerType", type: "uint8" },
          { name: "triggerValue", type: "uint256" },
          { name: "lastCheckin", type: "uint256" },
          { name: "inactivityWindow", type: "uint256" },
          { name: "beneficiaries", type: "address[]" },
          { name: "witnesses", type: "address[]" },
          { name: "witnessQuorum", type: "uint256" },
          { name: "witnessVoteCount", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "releasedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getOwnerVaults",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getBeneficiaryVaults",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "beneficiary", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "isReleaseConditionMet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isBeneficiary",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "vaultId", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isWitness",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "vaultId", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "totalVaults",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "canTriggerInactivity",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "canTriggerTimelock",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // Write functions
  {
    name: "createVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "worldIdNullifier", type: "uint256" },
      { name: "worldIdProof", type: "uint256[8]" },
      { name: "encryptedCID", type: "string" },
      { name: "litActionCID", type: "string" },
      { name: "triggerType", type: "uint8" },
      { name: "triggerValue", type: "uint256" },
      { name: "inactivityWindow", type: "uint256" },
      { name: "beneficiaries", type: "address[]" },
      { name: "witnesses", type: "address[]" },
      { name: "witnessQuorum", type: "uint256" },
    ],
    outputs: [{ name: "vaultId", type: "bytes32" }],
  },
  {
    name: "checkin",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "attestDeath",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "claimVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "cancelVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "updateBeneficiaries",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "bytes32" },
      { name: "newBeneficiaries", type: "address[]" },
    ],
    outputs: [],
  },
  {
    name: "updateCID",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "bytes32" },
      { name: "newEncryptedCID", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "guardianTriggerInactivity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "guardianTriggerTimelock",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  // Events
  {
    name: "VaultCreated",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "triggerType", type: "uint8", indexed: false },
    ],
  },
  {
    name: "CheckinRecorded",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "VaultReleased",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "triggeredBy", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "VaultCancelled",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
  {
    name: "WitnessAttestation",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "witness", type: "address", indexed: true },
      { name: "voteCount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "VaultClaimed",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const DEADLOCK_WITNESS_NFT_ABI = [
  {
    name: "mintWitness",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "vaultId", type: "bytes32" },
      { name: "role", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "batchMintWitnesses",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "witnesses", type: "address[]" },
      { name: "vaultId", type: "bytes32" },
      { name: "role", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "WitnessMinted",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "witness", type: "address", indexed: true },
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "role", type: "string", indexed: false },
    ],
  },
] as const;

export const DEADLOCK_HYPERCERT_ABI = [
  {
    name: "recordInheritance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "beneficiaries", type: "address[]" },
      { name: "releasedAt", type: "uint256" },
      { name: "encryptedCID", type: "string" },
      { name: "triggerType", type: "uint8" },
    ],
    outputs: [{ name: "hypercertId", type: "uint256" }],
  },
  {
    name: "recordClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "getInheritanceRecord",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "vaultId", type: "bytes32" },
          { name: "owner", type: "address" },
          { name: "beneficiaries", type: "address[]" },
          { name: "releasedAt", type: "uint256" },
          { name: "encryptedCID", type: "string" },
          { name: "triggerType", type: "uint8" },
          { name: "hypercertId", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "InheritanceRecorded",
    type: "event",
    inputs: [
      { name: "vaultId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "beneficiaries", type: "address[]", indexed: false },
      { name: "releasedAt", type: "uint256", indexed: false },
      { name: "encryptedCID", type: "string", indexed: false },
      { name: "triggerType", type: "uint8", indexed: false },
      { name: "hypercertId", type: "uint256", indexed: false },
    ],
  },
] as const;
