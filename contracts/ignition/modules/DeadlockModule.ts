import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeadlockModule = buildModule("DeadlockModule", (m) => {
  // Deploy DeadlockRegistry first (needs a guardian quorum address — use deployer for now)
  const deployer = m.getAccount(0);

  const registry = m.contract("DeadlockRegistry", [deployer]);

  // Deploy WitnessNFT with registry address
  const witnessNFT = m.contract("DeadlockWitnessNFT", [registry]);

  // Deploy Hypercert recorder with registry address
  const hypercert = m.contract("DeadlockHypercert", [registry]);

  return { registry, witnessNFT, hypercert };
});

export default DeadlockModule;
