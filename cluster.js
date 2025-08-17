// cluster.js
const { PublicKey, Connection } = require('@solana/web3.js');
const { WINDOW_MS, MIN_CHILDREN, SPEND_RATE_WINDOW_MS } = require('./config');

const clusters = new Map();
const MAX_HISTORY_POINTS = 10;
const TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'); // Token Program
const RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'); // Raydium AMM
const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'); // pump.fun

function pruneOldEvents(cluster, now) {
  const cutoff = now - WINDOW_MS;
  cluster.events = cluster.events.filter(e => e.ts >= cutoff);
}

function computeActiveStatus(cluster, now) {
  pruneOldEvents(cluster, now);
  const uniq = new Set(cluster.events.map(e => e.child));
  const isActive = uniq.size >= MIN_CHILDREN;
  const total = cluster.events.reduce((s, e) => s + e.lamports, 0);

  cluster.active = isActive;
  cluster.totalFundedLamports = total;
  console.log(`Cluster ${cluster.parent} active status: ${isActive}, unique children: ${uniq.size}`);
}

function ingestTransfer({ parent, child, lamports, ts, slot }) {
  const now = ts * 1000;
  let cluster = clusters.get(parent);
  if (!cluster) {
    cluster = {
      parent,
      createdAt: now,
      events: [],
      children: new Map(),
      totalFundedLamports: 0,
      active: false,
      lastUpdate: now,
      fanOutSlot: slot,
      tokenMints: new Set(),
      buySlots: [],
      dexPrograms: new Set(),
    };
    clusters.set(parent, cluster);
    console.log(`New cluster created for parent: ${parent} at slot ${slot}`);
  }

  cluster.events.push({ child, lamports, ts: now });
  cluster.lastUpdate = now;

  let c = cluster.children.get(child) || {
    receivedLamports: 0,
    firstFundedAt: now,
    lastSeenAt: now,
    balanceHistory: [],
  };
  c.receivedLamports += lamports;
  c.lastSeenAt = now;
  cluster.children.set(child, c);

  computeActiveStatus(cluster, now);
}

function detectClusterBehavior(tx, blockTime, slot) {
  const now = blockTime * 1000;
  const ixns = tx.transaction.message.instructions || [];
  const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
  for (const ix of ixns) {
    const programId = ix.programId ? ix.programId.toString() : null;
    let dexName = null;
    if (programId === RAYDIUM_PROGRAM_ID.toString()) {
      dexName = 'RaydiumAMM';
    } else if (programId === PUMP_FUN_PROGRAM_ID.toString()) {
      dexName = 'pump.fun';
    }

    if (programId === TOKEN_PROGRAM_ID.toString() && ix.parsed?.type === 'initializeAccount') {
      const account = ix.parsed.info.account;
      const clustersArray = Array.from(clusters.values());
      for (const cluster of clustersArray) {
        if (cluster.children.has(account)) {
          console.log(`ATA created for ${account} in cluster ${cluster.parent} at slot ${slot}`);
          cluster.tokenMints.add(ix.parsed.info.mint || 'ALON'); // Use actual mint if available
        }
      }
    } else if (dexName && accountKeys.some(key => cluster.children.has(key))) {
      const account = tx.transaction.message.accountKeys[0].pubkey.toString();
      const clustersArray = Array.from(clusters.values());
      for (const cluster of clustersArray) {
        if (cluster.children.has(account)) {
          console.log(`Potential DEX swap on ${dexName} for ${account} in cluster ${cluster.parent} at slot ${slot}`);
          cluster.tokenMints.add('ALON'); // Placeholder; refine with swap output token
          cluster.dexPrograms.add(dexName);
          if (!cluster.buySlots.includes(slot)) cluster.buySlots.push(slot);
        }
      }
    }
  }
}

function lamportsToSOL(l) {
  return l / 1_000_000_000;
}

async function updateBalances(connection) {
  console.log('Updating balances for all clusters...');
  const now = Date.now();

  for (const cluster of clusters.values()) {
    if (!cluster.active) continue;
    console.log(`Updating balance for cluster ${cluster.parent}...`);

    const childAddrs = Array.from(cluster.children.keys());
    const balances = await getBalancesBatch(connection, childAddrs);

    let totalRemaining = 0;
    childAddrs.forEach((addr, idx) => {
      const balLamports = balances[idx] ?? 0;
      const child = cluster.children.get(addr);
      child.lastBalanceLamports = balLamports;

      child.balanceHistory.push({ t: now, bal: balLamports });
      if (child.balanceHistory.length > MAX_HISTORY_POINTS) {
        child.balanceHistory.shift();
      }

      totalRemaining += balLamports;
    });

    cluster.cachedRemainingLamports = totalRemaining;

    const windowStart = now - SPEND_RATE_WINDOW_MS;
    let balNow = 0;
    let balThen = 0;

    for (const child of cluster.children.values()) {
      if (child.balanceHistory.length === 0) continue;
      balNow += child.balanceHistory[child.balanceHistory.length - 1].bal;

      let thenPoint = child.balanceHistory[0];
      for (const p of child.balanceHistory) {
        if (p.t >= windowStart) { thenPoint = p; break; }
      }
      balThen += thenPoint.bal;
    }

    const delta = balThen - balNow;
    const secs = SPEND_RATE_WINDOW_MS / 1000;
    const ratePerSec = secs > 0 ? delta / secs : 0;
    cluster.cachedSpendRateLamportsPerSec = ratePerSec > 0 ? ratePerSec : 0;

    if (cluster.cachedSpendRateLamportsPerSec > 0) {
      cluster.cachedTimeRemainingSec = Math.floor(
        cluster.cachedRemainingLamports / cluster.cachedSpendRateLamportsPerSec
      );
    } else {
      cluster.cachedTimeRemainingSec = null;
    }

    console.log(`Cluster ${cluster.parent} - Remaining SOL: ${lamportsToSOL(totalRemaining)}, Time Remaining: ${cluster.cachedTimeRemainingSec} sec`);
    cluster.lastUpdate = now;
  }
}

async function getBalancesBatch(connection, addresses, concurrency = 2) {
  const out = new Array(addresses.length).fill(0);
  let i = 0;

  async function worker() {
    while (i < addresses.length) {
      const idx = i++;
      try {
        const bal = await connection.getBalance(new PublicKey(addresses[idx]), 'confirmed');
        console.log(`Fetched balance for ${addresses[idx]}: ${bal} lamports`);
        out[idx] = bal;
      } catch {
        out[idx] = 0;
      }
    }
  }

  const workers = [];
  for (let k = 0; k < concurrency; k++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

function serializeClusters() {
  const arr = [];
  for (const cluster of clusters.values()) {
    if (!cluster.active) continue;

    const childList = [];
    for (const [addr, c] of cluster.children.entries()) {
      childList.push({
        address: addr,
        receivedSOL: lamportsToSOL(c.receivedLamports),
        lastBalanceSOL: c.lastBalanceLamports != null ? lamportsToSOL(c.lastBalanceLamports) : null,
      });
    }

    arr.push({
      funding_wallet: cluster.parent,
      recipients: Array.from(cluster.children.keys()),
      token_mint: Array.from(cluster.tokenMints)[0] || null,
      fan_out_slot: cluster.fanOutSlot,
      buy_slots: cluster.buySlots,
      common_patterns: {
        amounts: `${lamportsToSOL(cluster.totalFundedLamports / cluster.children.size)} SOL each ±0.5 SOL`,
        wallet_age: cluster.children.size > 0 ? 'fresh' : 'unknown',
        dex_programs: Array.from(cluster.dexPrograms),
      },
      total_sol_funded: lamportsToSOL(cluster.totalFundedLamports),
      total_sol_remaining: cluster.cachedRemainingLamports != null ? lamportsToSOL(cluster.cachedRemainingLamports) : null,
      spend_rate_sol_per_min: cluster.cachedSpendRateLamportsPerSec != null
        ? lamportsToSOL(cluster.cachedSpendRateLamportsPerSec) * 60
        : null,
      time_remaining_sec: cluster.cachedTimeRemainingSec,
      last_update: cluster.lastUpdate,
    });
  }
  arr.sort((a, b) => (b.total_sol_funded - a.total_sol_funded));
  console.log(`Serialized ${arr.length} active clusters`);
  return arr;
}

module.exports = {
  ingestTransfer,
  updateBalances,
  detectClusterBehavior,
  serializeClusters,
};