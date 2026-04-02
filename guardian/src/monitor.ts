import { ethers } from 'ethers';
import type { GuardianNode, TriggerVoteMessage } from './node.js';
import { TOPICS } from './node.js';

const REGISTRY_ABI = [
  'event VaultCreated(bytes32 indexed vaultId, address indexed owner, uint8 triggerType)',
  'event VaultReleased(bytes32 indexed vaultId, address indexed triggeredBy, uint256 timestamp)',
  'function getVault(bytes32 vaultId) external view returns (tuple(bytes32,address,uint256,string,string,uint8,uint256,uint256,uint256,address[],address[],uint256,uint256,uint8,uint256,uint256))',
  'function canTriggerInactivity(bytes32 vaultId) external view returns (bool)',
  'function canTriggerTimelock(bytes32 vaultId) external view returns (bool)',
];

const TRIGGER_TYPE_INACTIVITY = 0;
const TRIGGER_TYPE_TIMELOCK = 1;
const TRIGGER_TYPE_GEOPOLITICAL = 3;
const STATUS_ACTIVE = 0;

export class VaultMonitor {
  private provider: ethers.JsonRpcProvider;
  private registry: ethers.Contract | null = null;
  private node: GuardianNode;
  private trackedVaults: Map<string, { triggerType: number; status: number }> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private peerId: string = '';

  constructor(node: GuardianNode) {
    this.node = node;
    const rpcUrl = process.env.NEXT_PUBLIC_FILECOIN_RPC || 'https://api.calibration.node.glif.io/rpc/v1';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
    if (registryAddress) {
      this.registry = new ethers.Contract(registryAddress, REGISTRY_ABI, this.provider);
    }
  }

  async start() {
    if (!this.registry) {
      console.warn('[Monitor] NEXT_PUBLIC_REGISTRY_ADDRESS not set — monitoring disabled');
      return;
    }

    this.peerId = this.node.peerId.toString();
    console.log(`[Monitor] Starting with peer ID: ${this.peerId}`);

    // Load existing vaults from historical events
    await this.loadExistingVaults();

    // Subscribe to new vault events
    this.registry.on('VaultCreated', (vaultId: string, _owner: string, triggerType: number) => {
      console.log(`[Monitor] New vault tracked: ${vaultId} (type=${triggerType})`);
      this.trackedVaults.set(vaultId, { triggerType, status: STATUS_ACTIVE });
    });

    this.registry.on('VaultReleased', (vaultId: string) => {
      console.log(`[Monitor] Vault released, removing from tracking: ${vaultId}`);
      this.trackedVaults.delete(vaultId);
    });

    // Poll every 60 seconds
    this.pollInterval = setInterval(() => this.poll(), 60_000);
    console.log('[Monitor] Polling every 60 seconds');

    // First poll immediately
    await this.poll();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.registry?.removeAllListeners();
  }

  private async loadExistingVaults() {
    const registry = this.registry!;
    try {
      console.log('[Monitor] Loading existing vaults from contract events...');
      const filter = registry.filters.VaultCreated();
      const events = await registry.queryFilter(filter, -10000);

      for (const event of events) {
        if ('args' in event && event.args) {
          const vaultId = event.args[0] as string;
          const triggerType = Number(event.args[2]);
          this.trackedVaults.set(vaultId, { triggerType, status: STATUS_ACTIVE });
        }
      }

      // Remove already-released vaults
      const releaseFilter = registry.filters.VaultReleased();
      const releaseEvents = await registry.queryFilter(releaseFilter, -10000);
      for (const event of releaseEvents) {
        if ('args' in event && event.args) {
          this.trackedVaults.delete(event.args[0] as string);
        }
      }

      console.log(`[Monitor] Loaded ${this.trackedVaults.size} active vaults`);
    } catch (err) {
      console.error('[Monitor] Failed to load existing vaults:', err);
    }
  }

  private async poll() {
    if (!this.registry) return;
    const registry = this.registry;
    console.log(`[Monitor] Polling ${this.trackedVaults.size} vaults at ${new Date().toISOString()}`);

    for (const [vaultId, meta] of this.trackedVaults.entries()) {
      try {
        if (
          meta.triggerType === TRIGGER_TYPE_INACTIVITY ||
          meta.triggerType === TRIGGER_TYPE_GEOPOLITICAL
        ) {
          const canTrigger = await registry.canTriggerInactivity(vaultId);
          if (canTrigger) {
            console.log(`[Monitor] Vault ${vaultId} inactivity trigger ready — broadcasting vote`);
            await this.broadcastTriggerVote(vaultId, 'INACTIVITY');
          }
        } else if (meta.triggerType === TRIGGER_TYPE_TIMELOCK) {
          const canTrigger = await registry.canTriggerTimelock(vaultId);
          if (canTrigger) {
            console.log(`[Monitor] Vault ${vaultId} timelock trigger ready — broadcasting vote`);
            await this.broadcastTriggerVote(vaultId, 'TIMELOCK');
          }
        }
      } catch (err) {
        console.error(`[Monitor] Error checking vault ${vaultId}:`, err);
      }
    }
  }

  private async broadcastTriggerVote(
    vaultId: string,
    triggerType: 'INACTIVITY' | 'TIMELOCK'
  ) {
    const message: TriggerVoteMessage = {
      vaultId,
      triggerType,
      peerId: this.peerId,
      timestamp: Date.now(),
    };

    const pubsub = (this.node.services as any).pubsub;
    if (!pubsub) {
      console.warn('[Monitor] pubsub service not available');
      return;
    }

    try {
      await pubsub.publish(
        TOPICS.TRIGGER_VOTE,
        new TextEncoder().encode(JSON.stringify(message))
      );
    } catch (err) {
      console.error('[Monitor] Failed to publish trigger vote:', err);
    }
  }
}
