import 'dotenv/config';
import { createGuardianNode, TOPICS } from './node.js';
import { VaultMonitor } from './monitor.js';
import { ConsensusEngine } from './consensus.js';

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║    DEADLOCK Guardian Node v1.0.0     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // ─── Create libp2p Node ──────────────────────────────────────────────────
  console.log('[Guardian] Creating libp2p node...');
  const node = await createGuardianNode();
  await node.start();

  const peerId = node.peerId.toString();
  const listenAddrs = node.getMultiaddrs().map((ma) => ma.toString());

  console.log(`[Guardian] Node started: ${peerId}`);
  if (listenAddrs.length > 0) {
    console.log('[Guardian] Listening on:');
    listenAddrs.forEach((addr) => console.log(`  ${addr}`));
  }

  // ─── Subscribe to Topics ──────────────────────────────────────────────────
  const pubsub = (node.services as any).pubsub;
  if (pubsub) {
    for (const topic of Object.values(TOPICS)) {
      pubsub.subscribe(topic);
    }
    console.log('[Guardian] Subscribed to all topics');
  }

  // ─── Announce Self ────────────────────────────────────────────────────────
  if (pubsub) {
    const announcement = JSON.stringify({
      peerId,
      addresses: listenAddrs,
      role: 'guardian',
      version: '1.0.0',
      timestamp: Date.now(),
    });

    try {
      await pubsub.publish(
        TOPICS.GUARDIAN_ANNOUNCE,
        new TextEncoder().encode(announcement)
      );
      console.log('[Guardian] Announced to network');
    } catch {
      // Ignore if no peers connected yet
    }
  }

  // ─── Start Consensus Engine ───────────────────────────────────────────────
  const consensus = new ConsensusEngine(node);
  consensus.start();
  console.log('[Guardian] Consensus engine started');

  // ─── Start Vault Monitor ──────────────────────────────────────────────────
  const monitor = new VaultMonitor(node);
  await monitor.start();
  console.log('[Guardian] Vault monitor started');

  // ─── Periodic Heartbeat ───────────────────────────────────────────────────
  // Broadcasts guardian liveness every 5 minutes so peers know we're online.
  setInterval(async () => {
    if (!pubsub) return;
    try {
      const heartbeat = JSON.stringify({
        peerId,
        role: 'guardian',
        timestamp: Date.now(),
        versionStr: '1.0.0',
      });
      await pubsub.publish(TOPICS.HEARTBEAT, new TextEncoder().encode(heartbeat));
    } catch {
      // Ignore publish errors when no peers are connected yet
    }
  }, 5 * 60 * 1000);

  // ─── Log Peer Discovery ───────────────────────────────────────────────────
  node.addEventListener('peer:connect', (event) => {
    console.log(`[Guardian] Peer connected: ${event.detail.toString()}`);
  });

  node.addEventListener('peer:disconnect', (event) => {
    console.log(`[Guardian] Peer disconnected: ${event.detail.toString()}`);
  });

  console.log('');
  console.log('[Guardian] Running. Press Ctrl+C to stop.');

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async () => {
    console.log('\n[Guardian] Shutting down...');
    monitor.stop();
    consensus.stop();
    await node.stop();
    console.log('[Guardian] Stopped. Goodbye.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Guardian] Fatal error:', err);
  process.exit(1);
});
