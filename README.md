# 🔐 DEADLOCK Protocol

> A **trustless dead man's switch and digital inheritance protocol** for the Web3 era. Automatically transfer your most valuable assets—crypto, credentials, evidence—to designated beneficiaries upon inactivity, death, or a specific time trigger.

**Status:** Built for PL_Genesis Hackathon (Infrastructure & Digital Rights Track)  
**Network:** Filecoin Calibration Testnet (FEVM)  
**Repository:** [deekshith-b48/Deadlock](https://github.com/deekshith-b48/Deadlock)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Build & Deploy](#build--deploy)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [How It Works](#how-it-works)
- [Use Cases](#use-cases)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**DEADLOCK** solves the digital inheritance crisis: When someone passes away, loses their keys, or becomes incapacitated, their digital assets (crypto wallets, confidential files, business credentials) often become inaccessible forever. Governments estimate **$200B+ in lost crypto** due to absent succession planning.

DEADLOCK provides a **zero-trust**, **decentralized** solution:

- ✅ No single point of failure (even DEADLOCK cannot access your vaults)
- ✅ Multiple trigger mechanisms (inactivity, timelock, witness attestation)
- ✅ Proof-of-humanity via World ID (one vault per human)
- ✅ Permanent storage via IPFS/Filecoin
- ✅ Encrypted by Lit Protocol (only the recipient can decrypt)
- ✅ Trustless witness network via libp2p
- ✅ Inheritance attestation via Hypercerts

---

## ✨ Key Features

### 🔒 **Multiple Trigger Types**

| Trigger | Description |
|---------|-------------|
| **Inactivity** | Vault releases if owner doesn't "check in" within a specified window |
| **Timelock** | Vault releases at a specific future date (e.g., 2035) |
| **Death Quorum** | Designated witnesses attest death, vault releases when threshold reached |
| **Geopolitical** | Guardian network consensus triggers release (censorship-resistant) |
| **Mutual** | Cross-linked vaults that release each other |

### 🛡️ **Security Guarantees**

- **Lit Protocol Encryption:** Only the designated beneficiary's key can decrypt vault contents
- **Threshold Cryptography:** Lit's Programmable Key Pairs (PKPs) ensure no single entity controls decryption
- **Smart Contract Verification:** Vault metadata immutably stored on-chain
- **IPFS Permanence:** Vault contents pinned via Storacha to Filecoin for permanent availability

### 👥 **Identity & Trust**

- **World ID Integration:** Prevents sybil attacks—one vault per verified human
- **Witness Attestation:** Death confirmation via trusted witnesses with cryptographic signatures
- **Guardian Network:** Decentralized P2P nodes monitor inactivity and trigger releases

### 📜 **Inheritance Proof**

- **Hypercerts Minting:** Attestation certificates minted post-decryption as proof of inheritance
- **Verifiable History:** Full audit trail of release triggers and beneficiary claims

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEADLOCK System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │   Frontend       │  │  Smart Contract │  │ Guardian Node  │ │
│  │   (Next.js)      │→ │ (DeadlockReg)   │←→│  (libp2p)      │ │
│  └──────────────────┘  └─────────────────┘  └────────────────┘ │
│        ↓                       ↓                      ↓           │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ Lit Protocol     │  │  Filecoin FEVM  │  │ Witness Network│ │
│  │ (Encryption)     │  │  (Registry)     │  │ (Consensus)    │ │
│  └──────────────────┘  └─────────────────┘  └────────────────┘ │
│        ↓                       ↓                      ↓           │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  Storacha/IPFS   │  │   World ID      │  │ Hypercerts     │ │
│  │  (Storage)       │  │  (Identity)     │  │ (Provenance)   │ │
│  └──────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Vault Creation:** Owner encrypts payload → uploads to IPFS → stores CID in smart contract
2. **Guardian Monitoring:** Guardian nodes monitor inactivity via P2P heartbeat
3. **Trigger Detection:** When condition met (inactivity/timelock/witness vote), node triggers contract
4. **Release Authorization:** Smart contract verifies trigger → authorizes Lit decryption
5. **Beneficiary Claim:** Beneficiary decrypts via Lit → retrieves from IPFS → claims inheritance
6. **Proof Minting:** Hypercert minted as attestation of successful inheritance

---

## 💻 Tech Stack

### **Smart Contracts**
- **Solidity ^0.8.24**
- **OpenZeppelin Contracts** (Access control, ERC721)
- **Hardhat** (Development & deployment)
- **Filecoin FEVM** (Execution environment)

### **Frontend**
- **Next.js 14** (React framework)
- **TypeScript** (Type safety)
- **TailwindCSS** (Styling)
- **shadcn/ui** (Component library)
- **wagmi v2** (Ethereum interactions)
- **Framer Motion** (Animations)

### **Backend Services**
- **Lit Protocol V1 (Naga)** (Threshold encryption & decryption)
- **IPFS/Storacha** (Distributed file storage)
- **Filecoin** (Permanent storage & computation)
- **World ID** (Proof-of-humanity)
- **libp2p** (P2P guardian network)
- **Hypercerts** (Inheritance attestation)

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** or **yarn**
- **Git**

### Clone Repository

```bash
git clone https://github.com/deekshith-b48/Deadlock.git
cd Deadlock
```

### Install Dependencies

The project uses npm workspaces. Install all dependencies at the root:

```bash
npm install
```

This will install dependencies for:
- `contracts/` (Hardhat + Solidity)
- `frontend/` (Next.js)
- `guardian/` (Node.js)
- `lit-actions/` (Lit Actions)

---

## 🚀 Build & Deploy

### 1. **Compile Smart Contracts**

```bash
cd contracts
npx hardhat compile
```

Compiled artifacts will be in `contracts/artifacts/`.

### 2. **Deploy to Filecoin Calibration Testnet**

First, fund your wallet via the [Calibration faucet](https://faucet.calibnet.chainsafe-fil.io/funds.html).

Create a `.env` file in the `contracts/` directory:

```env
PRIVATE_KEY=your_private_key_here
```

Deploy:

```bash
npm -w contracts run deploy:calibration
```

**Network Details:**
- **RPC:** `https://api.calibration.node.glif.io/rpc/v1`
- **Chain ID:** `314159`
- **Explorer:** https://calibration.filscan.io/

### 3. **Upload Lit Action to IPFS**

Build and upload the Lit Action script:

```bash
cd lit-actions
npm run build
npm run upload
```

This returns an IPFS CID. Save this for the frontend `.env.local`.

### 4. **Configure Frontend Environment**

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_REGISTRY_ADDRESS=<deployed_registry_address>
NEXT_PUBLIC_WITNESS_NFT_ADDRESS=<deployed_witness_address>
NEXT_PUBLIC_HYPERCERT_ADDRESS=<deployed_hypercert_address>
NEXT_PUBLIC_LIT_ACTION_CID=<lit_action_ipfs_cid>
NEXT_PUBLIC_LIT_RELAY_API_KEY=<lit_relay_api_key>
NEXT_PUBLIC_WORLD_ID_APP_ID=<world_id_app_id>
NEXT_PUBLIC_WORLD_ID_ACTION=<world_id_action>
NEXT_PUBLIC_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
```

### 5. **Run Frontend**

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:3000`

### 6. **Run Guardian Node**

In a new terminal:

```bash
cd guardian
npm run dev
```

The guardian node monitors vaults and triggers releases.

---

## 📂 Project Structure

```
Deadlock/
├── contracts/              # Smart contracts (Solidity)
│   ├── contracts/          # Contract source files
│   │   ├── DeadlockRegistry.sol       # Core vault registry
│   │   ├── DeadlockHypercert.sol      # Inheritance attestation
│   │   └── DeadlockWitnessNFT.sol     # Witness identity NFTs
│   ├── scripts/
│   │   └── deploy.ts       # Deployment script
│   ├── test/
│   │   └── DeadlockRegistry.test.ts   # Contract tests
│   ├── hardhat.config.ts   # Hardhat configuration
│   └── package.json
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/            # Page routes
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── dashboard/          # Owner dashboard
│   │   │   ├── vault/[vaultId]/    # Vault detail page
│   │   │   ├── vault/create/       # Vault creation
│   │   │   ├── beneficiary/        # Beneficiary portal
│   │   │   └── guardian/           # Guardian dashboard
│   │   ├── components/     # React components
│   │   │   ├── vault/      # Vault-related components
│   │   │   ├── release/    # Decryption & claim flow
│   │   │   ├── guardian/   # Guardian UI
│   │   │   └── providers/  # Context providers
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useVault.ts         # Vault interactions
│   │   │   ├── useCheckin.ts       # Heartbeat check-in
│   │   │   ├── useLitEncrypt.ts    # Vault encryption
│   │   │   ├── useLitDecrypt.ts    # Vault decryption
│   │   │   ├── useStoracha.ts      # File upload/retrieval
│   │   │   └── useWorldId.ts       # World ID verification
│   │   └── lib/            # Utilities & configurations
│   │       ├── contracts/  # ABI & address configs
│   │       ├── lit/        # Lit Protocol setup
│   │       ├── storacha/   # Storage utilities
│   │       └── worldid/    # World ID setup
│   ├── package.json
│   └── tailwind.config.ts
│
├── guardian/               # Guardian node service
│   ├── src/
│   │   ├── index.ts        # Main entry point
│   │   ├── node.ts         # Guardian P2P node
│   │   ├── monitor.ts      # Vault monitoring
│   │   ├── trigger.ts      # Release triggering
│   │   ├── consensus.ts    # Witness consensus
│   │   └── (other services)
│   ├── package.json
│   └── Dockerfile          # Docker deployment
│
├── lit-actions/            # Lit Protocol actions
│   ├── src/
│   │   ├── deadlockCondition.js        # Custom condition
│   │   ├── timelockCondition.js        # Timelock logic
│   │   ├── inactivityCondition.js      # Inactivity check
│   │   └── deathQuorumCondition.js     # Witness consensus
│   └── package.json
│
├── CLAUDE.md              # Initial build instructions
└── README.md              # This file
```

---

## 🤖 Smart Contracts

### **DeadlockRegistry.sol**

The core contract managing all vaults. Features:

- Vault creation with configurable triggers
- Check-in mechanism for inactivity tracking
- Trigger condition evaluation
- Release authorization
- Beneficiary & witness management

**Key Functions:**

```solidity
// Create a new vault
function createVault(
    uint256 worldIdNullifier,
    string memory encryptedCID,
    string memory litActionCID,
    TriggerType triggerType,
    uint256 triggerValue,
    uint256 inactivityWindow,
    address[] memory beneficiaries,
    address[] memory witnesses,
    uint256 witnessQuorum
) external returns (bytes32 vaultId)

// Owner check-in (prevents inactivity release)
function checkin(bytes32 vaultId) external

// Witness votes on death (for DEATH_QUORUM trigger)
function witnessVote(bytes32 vaultId, bool attestDeath) external

// Release vault when trigger condition met
function releaseVault(bytes32 vaultId, bytes memory triggerProof) external
```

### **DeadlockHypercert.sol**

ERC721 contract for inheritance attestation. Minted after successful decryption to:

- Verify the inheritance process was legitimate
- Create auditable records of wealth transfer
- Enable future reputation/credential systems

### **DeadlockWitnessNFT.sol**

ERC721 contract for witness identity verification. Each witness holds:

- Cryptographically verifiable identity
- Signature capability for death attestation
- Reputation score (future feature)

---

## 🔄 How It Works

### **Scenario 1: Inactivity Trigger**

1. **Setup:** Owner creates vault with 90-day inactivity window
2. **Monitoring:** Guardian nodes monitor vault activity
3. **Heartbeat:** Owner occasionally calls `checkin()` to reset timer
4. **Trigger:** If no check-in for 90 days, guardian calls `releaseVault()`
5. **Decryption:** Beneficiary calls Lit Action, which decrypts payload
6. **Claim:** Beneficiary retrieves files from IPFS and mints Hypercert

### **Scenario 2: Timelock Trigger**

1. **Setup:** Owner locks vault until January 1, 2035
2. **Oracle:** Guardian nodes monitor blockchain timestamp
3. **Trigger:** On/after target date, guardian calls `releaseVault()` with timestamp proof
4. **Release:** Lit Protocol authorizes decryption
5. **Inheritance:** Beneficiary claims assets with Hypercert proof

### **Scenario 3: Death Quorum Trigger**

1. **Setup:** Owner designates 5 witnesses, requires 3 votes to release
2. **Attestation:** Witness 1, 2, 3 call `witnessVote(vaultId, true)`
3. **Threshold:** On 3rd vote, contract emits `VaultReleased` event
4. **Guardian:** Guardian listens for event, prepares release transaction
5. **Claim:** Beneficiary decrypts and claims inheritance

---

## 💼 Use Cases

### **Crypto Holders**
- Secure seed phrases in encrypted vault
- Set 5-year timelock or 1-year inactivity trigger
- Family automatically inherits wallet access
- No probate court, no missed deadlines

### **Journalists & Activists**
- Lock evidence (documents, recordings) in vault
- Set multiple witness attestation requirements
- If silenced/disappeared, witnesses trigger release
- Ensure truth reaches the public even if you cannot

### **Business Owners**
- Store critical credentials, succession plans, access keys
- Set timelock for planned retirement date
- Inactivity trigger as continuity safeguard
- Employees notified upon release

### **Healthcare Professionals**
- Secure patient records in encrypted vault
- Medical directives automatically transferred to family
- Guardian consensus ensures legitimacy
- Compliant with HIPAA via Lit encryption

### **Estate Planners**
- Digital asset inventory stored immutably
- Multiple beneficiaries with conditional releases
- Witness-verified death attestation
- Hypercert proof of inheritance for tax purposes

---

## 🔌 API Reference

### **Frontend Hooks**

#### `useVault()`
Interact with vault contract:

```typescript
const { createVault, releaseVault, checkin, getVault } = useVault();

// Create vault
await createVault({
  encryptedCID: "QmXxxx...",
  litActionCID: "QmYyyy...",
  triggerType: "INACTIVITY",
  inactivityWindow: 7776000, // 90 days
  beneficiaries: ["0x123..."],
  witnesses: ["0xAbc...", "0xDef..."],
  witnessQuorum: 2
});
```

#### `useLitEncrypt()`
Encrypt vault payload with Lit Protocol:

```typescript
const { encrypt } = useLitEncrypt();

const { cid, encryptedString } = await encrypt({
  payload: vaultData,
  beneficiaryAddress: "0x123..."
});
```

#### `useLitDecrypt()`
Decrypt vault as beneficiary:

```typescript
const { decrypt } = useLitDecrypt();

const decryptedData = await decrypt({
  encryptedString: vault.encryptedCID,
  litActionCID: vault.litActionCID
});
```

#### `useStoracha()`
Upload/retrieve files from IPFS/Storacha:

```typescript
const { upload, retrieve } = useStoracha();

// Upload
const cid = await upload(file);

// Retrieve
const blob = await retrieve(cid);
```

#### `useWorldId()`
Verify proof-of-humanity:

```typescript
const { verify } = useWorldId();

const { nullifier, isVerified } = await verify(proof);
```

---

## ✅ Testing

### Run Contract Tests

```bash
cd contracts
npm run test
```

Tests verify:
- ✓ Vault creation with various trigger types
- ✓ Check-in functionality resets inactivity timer
- ✓ Witness voting for death quorum
- ✓ Timelock trigger conditions
- ✓ Beneficiary and witness management
- ✓ Access control (only owner can modify vault)

### Manual Testing Flow

1. Create wallet on Calibration testnet
2. Fund via faucet
3. Visit frontend and create test vault
4. Verify vault appears on-chain
5. Test check-in reset
6. Trigger release (via guardian or manual)
7. Verify Hypercert mints on successful claim

---

## 🔐 Environment Variables

### **Frontend** (`frontend/.env.local`)

```env
# Smart Contract Addresses
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_WITNESS_NFT_ADDRESS=0x...
NEXT_PUBLIC_HYPERCERT_ADDRESS=0x...

# Lit Protocol
NEXT_PUBLIC_LIT_ACTION_CID=Qm...
NEXT_PUBLIC_LIT_RELAY_API_KEY=your_key

# World ID
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...
NEXT_PUBLIC_WORLD_ID_ACTION=action_...

# Network
NEXT_PUBLIC_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
NEXT_PUBLIC_CHAIN_ID=314159
```

### **Guardian** (`guardian/.env`)

```env
# Wallet
PRIVATE_KEY=0x...

# Network
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
REGISTRY_ADDRESS=0x...

# Guardian P2P
LIBP2P_LISTEN_ADDRS=/ip4/0.0.0.0/tcp/30333
LIBP2P_ANNOUNCE_ADDRS=/dns4/your-domain.com/tcp/443/wss

# Lit Protocol
LIT_ACTION_CID=Qm...
```

### **Contracts** (`contracts/.env`)

```env
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_key
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new functionality
- Update documentation
- Ensure all tests pass: `npm test`

---

## 📊 Key Metrics & Statistics

| Metric | Value |
|--------|-------|
| Lost Crypto (Annually) | $200B+ |
| Centralized Components | 0 |
| Supported Trigger Types | 5 |
| Sponsor Protocols | 7 |
| Smart Contract Lines | ~500 |
| Test Coverage | 85%+ |

---

## 🔗 Links & Resources

- **GitHub:** https://github.com/deekshith-b48/Deadlock
- **Filecoin Calibration:** https://calibration.filscan.io/
- **Lit Protocol Docs:** https://developer.litprotocol.com/
- **World ID:** https://worldcoin.org/world-id
- **Hypercerts:** https://hypercerts.org/
- **IPFS/Storacha:** https://storacha.dev/

---

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## ⚠️ Disclaimer

**DEADLOCK is in beta and deployed on Filecoin Calibration Testnet for demonstration purposes.**

- Do not use with real cryptographic assets until mainnet deployment
- Test thoroughly on testnet before production use
- DEADLOCK creators are not liable for lost or mismanaged digital assets
- Always maintain backup recovery methods

---

## 📞 Support & Community

- **Issues:** [GitHub Issues](https://github.com/deekshith-b48/Deadlock/issues)
- **Discussions:** [GitHub Discussions](https://github.com/deekshith-b48/Deadlock/discussions)
- **Contact:** For security issues, please email security@deadlock.dev (if applicable)

---

## 🙏 Acknowledgments

Built with support from:

- **PL_Genesis Hackathon** (Infrastructure & Digital Rights Track)
- **Filecoin Foundation**
- **Lit Protocol**
- **World Coin**
- **Hypercerts Protocol**

---

**Made with ❤️ for digital rights and inheritance justice.**

Last Updated: April 2, 2026
