import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { identify } from '@libp2p/identify';
import { bootstrap } from '@libp2p/bootstrap';
import { mdns } from '@libp2p/mdns';

// ─── GossipSub Topics ─────────────────────────────────────────────────────────
export const TOPICS = {
  HEARTBEAT: 'deadlock/heartbeats/v1',
  TRIGGER_VOTE: 'deadlock/trigger-votes/v1',
  TRIGGER_CONFIRM: 'deadlock/trigger-confirmed/v1',
  GUARDIAN_ANNOUNCE: 'deadlock/guardians/v1',
};

export type TriggerVoteMessage = {
  vaultId: string;
  triggerType: 'INACTIVITY' | 'TIMELOCK';
  peerId: string;
  timestamp: number;
  signature?: string;
};

export type TriggerConfirmMessage = {
  vaultId: string;
  triggerType: 'INACTIVITY' | 'TIMELOCK';
  voterCount: number;
  timestamp: number;
};

export async function createGuardianNode() {
  const bootstrapPeers = (process.env.GUARDIAN_BOOTSTRAP_PEERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const listenPort = parseInt(process.env.GUARDIAN_PORT || '0', 10);

  const node = await createLibp2p({
    addresses: {
      listen: [`/ip4/0.0.0.0/tcp/${listenPort}`],
    },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
        emitSelf: false,
        scoreParams: {
          behaviourPenaltyWeight: -10,
          behaviourPenaltyDecay: 0.986,
        },
        scoreThresholds: {
          gossipThreshold: -4000,
          publishThreshold: -8000,
          graylistThreshold: -16000,
          acceptPXThreshold: 100,
          opportunisticGraftThreshold: 5,
        },
      }),
      ...(bootstrapPeers.length > 0
        ? {
            bootstrap: bootstrap({
              list: bootstrapPeers,
            }),
          }
        : {}),
      mdns: mdns(),
    },
  });

  return node;
}

export type GuardianNode = Awaited<ReturnType<typeof createGuardianNode>>;
