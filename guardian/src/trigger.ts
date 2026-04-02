import { ethers } from 'ethers';

const REGISTRY_ABI = [
  'function guardianTriggerInactivity(bytes32 vaultId) external',
  'function guardianTriggerTimelock(bytes32 vaultId) external',
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeTrigger(
  vaultId: string,
  triggerType: 'INACTIVITY' | 'TIMELOCK'
): Promise<string> {
  const privateKey = process.env.GUARDIAN_PRIVATE_KEY;
  const rpcUrl = process.env.NEXT_PUBLIC_FILECOIN_RPC || 'https://api.calibration.node.glif.io/rpc/v1';
  const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;

  if (!privateKey) {
    throw new Error('GUARDIAN_PRIVATE_KEY not set');
  }
  if (!registryAddress) {
    throw new Error('NEXT_PUBLIC_REGISTRY_ADDRESS not set');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, wallet);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[Trigger] Attempt ${attempt}/${MAX_RETRIES}: ${triggerType} trigger for vault ${vaultId}`
      );

      let tx: ethers.TransactionResponse;
      if (triggerType === 'INACTIVITY') {
        tx = await registry.guardianTriggerInactivity(vaultId);
      } else {
        tx = await registry.guardianTriggerTimelock(vaultId);
      }

      console.log(`[Trigger] Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(
        `[Trigger] SUCCESS: Vault ${vaultId} triggered via ${triggerType}. Tx: ${receipt?.hash}`
      );
      return receipt?.hash ?? tx.hash;
    } catch (err) {
      lastError = err as Error;
      console.error(`[Trigger] Attempt ${attempt} failed:`, err);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[Trigger] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `[Trigger] All ${MAX_RETRIES} attempts failed for vault ${vaultId}: ${lastError?.message}`
  );
}
