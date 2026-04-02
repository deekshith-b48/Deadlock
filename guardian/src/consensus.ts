import type { GuardianNode, TriggerVoteMessage, TriggerConfirmMessage } from './node.js';
import { TOPICS } from './node.js';
import { executeTrigger } from './trigger.js';

const QUORUM_THRESHOLD = parseInt(process.env.GUARDIAN_QUORUM_THRESHOLD || '3', 10);
const VOTE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

type VoteRecord = {
  votes: Map<string, TriggerVoteMessage>; // peerId -> vote
  triggerType: 'INACTIVITY' | 'TIMELOCK';
  firstVoteAt: number;
  confirmed: boolean;
};

export class ConsensusEngine {
  private voteCollections: Map<string, VoteRecord> = new Map();
  private node: GuardianNode;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(node: GuardianNode) {
    this.node = node;
  }

  start() {
    const pubsub = (this.node.services as any).pubsub;
    if (!pubsub) {
      console.warn('[Consensus] pubsub service not available');
      return;
    }

    pubsub.subscribe(TOPICS.TRIGGER_VOTE);
    pubsub.addEventListener('message', this.handleMessage.bind(this));

    // Clean up expired vote collections every 2 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);

    console.log(`[Consensus] Listening for trigger votes (quorum=${QUORUM_THRESHOLD})`);
  }

  stop() {
    const pubsub = (this.node.services as any).pubsub;
    if (pubsub) {
      pubsub.unsubscribe(TOPICS.TRIGGER_VOTE);
      pubsub.removeEventListener('message', this.handleMessage.bind(this));
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private handleMessage(event: CustomEvent) {
    if (event.detail.topic !== TOPICS.TRIGGER_VOTE) return;

    let vote: TriggerVoteMessage;
    try {
      const text = new TextDecoder().decode(event.detail.data);
      vote = JSON.parse(text) as TriggerVoteMessage;
    } catch {
      console.warn('[Consensus] Failed to parse trigger vote message');
      return;
    }

    if (!vote.vaultId || !vote.triggerType || !vote.peerId) {
      console.warn('[Consensus] Invalid vote message structure');
      return;
    }

    this.recordVote(vote);
  }

  private recordVote(vote: TriggerVoteMessage) {
    const { vaultId, peerId, triggerType } = vote;

    if (!this.voteCollections.has(vaultId)) {
      this.voteCollections.set(vaultId, {
        votes: new Map(),
        triggerType,
        firstVoteAt: Date.now(),
        confirmed: false,
      });
    }

    const record = this.voteCollections.get(vaultId)!;

    if (record.confirmed) {
      return; // Already triggered
    }

    // Prevent double-counting same peer
    if (record.votes.has(peerId)) {
      return;
    }

    record.votes.set(peerId, vote);
    console.log(
      `[Consensus] Vote recorded for vault ${vaultId} from ${peerId} (${record.votes.size}/${QUORUM_THRESHOLD})`
    );

    if (record.votes.size >= QUORUM_THRESHOLD) {
      record.confirmed = true;
      console.log(
        `[Consensus] QUORUM REACHED for vault ${vaultId} (${record.votes.size} votes) — executing trigger`
      );
      this.onQuorumReached(vaultId, triggerType, record.votes.size);
    }
  }

  private async onQuorumReached(
    vaultId: string,
    triggerType: 'INACTIVITY' | 'TIMELOCK',
    voterCount: number
  ) {
    // Publish confirmation to network
    const confirmMsg: TriggerConfirmMessage = {
      vaultId,
      triggerType,
      voterCount,
      timestamp: Date.now(),
    };

    const pubsub = (this.node.services as any).pubsub;
    try {
      await pubsub.publish(
        TOPICS.TRIGGER_CONFIRM,
        new TextEncoder().encode(JSON.stringify(confirmMsg))
      );
    } catch (err) {
      console.error('[Consensus] Failed to publish confirmation:', err);
    }

    // Execute on-chain trigger
    try {
      await executeTrigger(vaultId, triggerType);
    } catch (err) {
      console.error(`[Consensus] Failed to execute trigger for vault ${vaultId}:`, err);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [vaultId, record] of this.voteCollections.entries()) {
      if (record.confirmed || now - record.firstVoteAt > VOTE_EXPIRY_MS) {
        this.voteCollections.delete(vaultId);
        if (!record.confirmed) {
          console.log(`[Consensus] Vote collection for ${vaultId} expired without quorum`);
        }
      }
    }
  }
}
