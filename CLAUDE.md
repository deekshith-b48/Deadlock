# DEADLOCK Protocol — Claude Code Instructions

## What This Is
A trustless dead man's switch and digital inheritance protocol built for the PL_Genesis hackathon, Infrastructure & Digital Rights track.

## Build Order
1. Install dependencies: `npm install` in root (workspaces install everything)
2. Build contracts: `cd contracts && npx hardhat compile`
3. Deploy to Filecoin Calibration: `cd contracts && npx hardhat run scripts/deploy.ts --network calibration`
4. Copy deployed addresses to frontend/.env.local
5. Upload Lit Action to IPFS: `cd lit-actions && npm run build && npm run upload`
6. Copy Lit Action CID to frontend/.env.local
7. Run frontend: `cd frontend && npm run dev`
8. Run guardian node: `cd guardian && npm run dev`

## Key Architectural Decisions
- Lit Protocol is the ONLY entity that can decrypt vaults — even DEADLOCK cannot
- libp2p guardians trigger smart contracts — no centralized cron job
- World ID ensures one vault per human — nullifier stored on Filecoin FVM
- Storacha CIDs are stored in the smart contract — vault contents are verifiable
- Hypercerts are minted AFTER successful decryption — proof of inheritance

## Filecoin Calibration Testnet
- RPC: https://api.calibration.node.glif.io/rpc/v1
- Chain ID: 314159
- Faucet: https://faucet.calibnet.chainsafe-fil.io/funds.html
- Explorer: https://calibration.filscan.io/

## Testing
Run `npm test` to run smart contract tests

## Environment Setup
Copy `.env.example` to `.env.local` (frontend) and `.env` (guardian) and fill in all values.

## Tech Stack
- Smart Contracts: Solidity on Filecoin FEVM (Calibration Testnet)
- Storage: IPFS via Storacha SDK + Filecoin permanent pinning
- Encryption: Lit Protocol V1 (Naga) with PKPs + Lit Actions
- P2P Network: libp2p with GossipSub for guardian heartbeat
- Identity: World ID SDK for proof-of-humanity
- Provenance: Hypercerts for inheritance attestation
- Frontend: Next.js 14, TypeScript, TailwindCSS, shadcn/ui, wagmi v2
