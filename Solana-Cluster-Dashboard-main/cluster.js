
// cluster.js
const { PublicKey, Connection } = require('@solana/web3.js');
const { 
  WINDOW_MS, 
  MIN_CHILDREN, 
  FORMING_MIN_CHILDREN,
  SPEND_RATE_WINDOW_MS, 
  MIN_TRANSFER_LAMPORTS,
  MIN_CLUSTER_FUNDING_LAMPORTS,
  DATA_RETENTION_MS 
} = require('./config');

const clusters = new Map();// empty 
const MAX_HISTORY_POINTS = 20;

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

const DEX_PROGRAMS = {
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'pump.fun',
  
};

function lamportsToSOL(l) {
  return l / 1_000_000_000;
}

function pruneOldEvents(cluster, now) {
  const cutoff = now - WINDOW_MS;
  cluster.events = cluster.events.filter(e => e.ts >= cutoff);
}

function pruneOldClusters(now) {
  const cutoff = now - DATA_RETENTION_MS;
  for (const [parent, cluster] of clusters.entries()) {
    if (cluster.lastUpdate < cutoff) {
      console.log(`Removing old cluster ${parent} (last update: ${new Date(cluster.lastUpdate).toISOString()})`);
      clusters.delete(parent);
    }
  }
}

function computeActiveStatus(cluster, now) {
  pruneOldEvents(cluster, now);
  const uniq = new Set(cluster.events.map(e => e.child));
  const total = cluster.events.reduce((s, e) => s + e.lamports, 0);
  
  // Check if cluster meets minimum requirements
  const hasEnoughChildren = uniq.size >= MIN_CHILDREN;
  const hasEnoughFunding = total >= MIN_CLUSTER_FUNDING_LAMPORTS;
  const isActive = hasEnoughChildren && hasEnoughFunding;

  cluster.active = isActive;
  cluster.totalFundedLamports = total;
  
  console.log(`Cluster ${cluster.parent} - Children: ${uniq.size}/${MIN_CHILDREN}, Funding: ${lamportsToSOL(total)}/${lamportsToSOL(MIN_CLUSTER_FUNDING_LAMPORTS)} SOL, Active: ${isActive}`);
}

function ingestTransfer({ parent, child, lamports, ts, slot, signature, ixIdx }) {
  const now = ts * 1000;
  
  // Filter out transfers below minimum threshold
  if (lamports < MIN_TRANSFER_LAMPORTS) {
    console.log(`Transfer below minimum threshold: ${lamportsToSOL(lamports)} SOL (min: ${lamportsToSOL(MIN_TRANSFER_LAMPORTS)} SOL)`);
    return;
  }

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
      buySlots: [],
      dexPrograms: new Set(),
      tokenMints: new Set(),
      seen: new Set(),
    };
    clusters.set(parent, cluster);
    console.log(`New cluster created for parent: ${parent} at slot ${slot} with ${lamportsToSOL(lamports)} SOL transfer`);
  }

  // Dedupe
  const key = `${signature}:${ixIdx}`;
  if (cluster.seen.has(key)) {
    console.log(`Duplicate transfer detected for key ${key}`);
    return;
  }
  cluster.seen.add(key);
  if (cluster.seen.size > 1000) cluster.seen.clear();

  // Update fanOutSlot to earliest
  cluster.fanOutSlot = Math.min(cluster.fanOutSlot, slot);

  cluster.events.push({ child, lamports, ts: now });
  cluster.lastUpdate = now;

  let c = cluster.children.get(child) || {
    receivedLamports: 0,
    firstFundedAt: now,
    lastSeenAt: now,
    balanceHistory: [],
    lastBalanceLamports: 0,
  };
  c.receivedLamports += lamports;
  c.lastSeenAt = now;
  cluster.children.set(child, c);

  computeActiveStatus(cluster, now);
}

function detectClusterBehavior(tx, blockTime, slot) {
  const now = blockTime * 1000;
  const msg = tx.transaction.message;
  const meta = tx.meta || {};
  const accountKeys = msg.accountKeys.map(k => k.pubkey.toString());

  const allIxs = [...msg.instructions];
  for (const inner of (meta.innerInstructions || [])) {
    allIxs.push(...inner.instructions);
  }

  const touchClusters = [];
  for (const [_, cluster] of clusters.entries()) {
    if (accountKeys.some(k => cluster.children.has(k))) {
      touchClusters.push(cluster);
    }
  }
  if (touchClusters.length === 0) return;

  // Mints from postTokenBalances
  const mints = new Set();
  for (const bal of (meta.postTokenBalances || [])) {
    if (bal.mint) mints.add(bal.mint);
  }
  for (const cluster of touchClusters) {
    for (const m of mints) cluster.tokenMints.add(m);
    if (mints.size > 0 && !cluster.buySlots.includes(slot)) {
      cluster.buySlots.push(slot);
    }
  }

  // Scan instructions
  for (const ix of allIxs) {
    let programId;
    if (ix.programId) {
      programId = ix.programId.toString();
    } else if (ix.programIdIndex !== undefined) {
      programId = accountKeys[ix.programIdIndex];
    }
    if (!programId) continue;

    const dexName = DEX_PROGRAMS[programId];
    if (dexName) {
      for (const cluster of touchClusters) {
        cluster.dexPrograms.add(dexName);
        if (!cluster.buySlots.includes(slot)) cluster.buySlots.push(slot);
      }
    }

    if (ix.parsed) {
      const type = ix.parsed.type;
      const info = ix.parsed.info;
      if (programId === ASSOCIATED_TOKEN_PROGRAM_ID && (type === 'create' || type === 'createIdempotent')) {
        const mint = info?.mint;
        if (mint) {
          for (const cluster of touchClusters) cluster.tokenMints.add(mint);
        }
      } else if (programId === TOKEN_PROGRAM_ID && type?.startsWith('initializeAccount')) {
        const mint = info?.mint;
        if (mint) {
          for (const cluster of touchClusters) cluster.tokenMints.add(mint);
        }
      }
    }
  }

  console.log(`Processed behavior for ${touchClusters.length} clusters at slot ${slot}`);
}

async function updateBalances(connection) {
  console.log('🔄 Updating balances for all clusters...');
  const now = Date.now();
  
  // Remove old clusters first
  pruneOldClusters(now);

  const activeClusters = Array.from(clusters.values()).filter(c => c.active || c.children.size >= FORMING_MIN_CHILDREN);
  console.log(`📊 Processing ${activeClusters.length} active/forming clusters for balance updates`);

  for (const cluster of activeClusters) {
    console.log(`💰 Updating balance for cluster ${cluster.parent.slice(0, 8)}... (${cluster.children.size} children)`);

    const childAddrs = Array.from(cluster.children.keys());
    const balances = await getBalancesBatch(connection, childAddrs);

    let totalRemaining = 0;
    let validBalances = 0;

    childAddrs.forEach((addr, idx) => {
      let balLamports = balances[idx];
      const child = cluster.children.get(addr);
      if (balLamports == null) balLamports = child.lastBalanceLamports || 0;

      child.lastBalanceLamports = balLamports;
      child.balanceHistory.push({ t: now, bal: balLamports });
      if (child.balanceHistory.length > MAX_HISTORY_POINTS) {
        child.balanceHistory.shift();
      }

      totalRemaining += balLamports;
      if (balLamports > 0) validBalances++;
    });

    cluster.cachedRemainingLamports = totalRemaining;

    // Calculate spend rate with better logic
    const windowStart = now - SPEND_RATE_WINDOW_MS;
    let balNow = 0;
    let balThen = 0;
    let hasHistoryData = false;

    for (const child of cluster.children.values()) {
      if (child.balanceHistory.length < 2) continue;
      
      const latest = child.balanceHistory[child.balanceHistory.length - 1];
      balNow += latest.bal;

      // Find the earliest point in our window
      let earliestInWindow = null;
      for (const point of child.balanceHistory) {
        if (point.t >= windowStart) {
          earliestInWindow = point;
          break;
        }
      }
    
      
      if (earliestInWindow) {
        balThen += earliestInWindow.bal;
        hasHistoryData = true;
      } else if (child.balanceHistory.length > 0) {
        // Use oldest available data point
        balThen += child.balanceHistory[0].bal;
        hasHistoryData = true;
      }
    }

    // Calculate spend rate only if we have meaningful data
    if (hasHistoryData && balThen > balNow) {
      const spentLamports = balThen - balNow;
      const timeElapsedMs = Math.min(now - windowStart, now - cluster.createdAt);
      const timeElapsedSec = timeElapsedMs / 1000;
      
      if (timeElapsedSec > 10) { // Only calculate if we have at least 10 seconds of data
        cluster.cachedSpendRateLamportsPerSec = spentLamports / timeElapsedSec;
        
        // Calculate time remaining
        if (cluster.cachedSpendRateLamportsPerSec > 0 && totalRemaining > 0) {
          cluster.cachedTimeRemainingSec = Math.floor(totalRemaining / cluster.cachedSpendRateLamportsPerSec);
        } else {
          cluster.cachedTimeRemainingSec = null;
        }
      } else {
        cluster.cachedSpendRateLamportsPerSec = 0;
        cluster.cachedTimeRemainingSec = null;
      }
    } else {
      cluster.cachedSpendRateLamportsPerSec = 0;
      cluster.cachedTimeRemainingSec = null;
    }

    const remainingSOL = lamportsToSOL(totalRemaining);
    const spendRateSOL = cluster.cachedSpendRateLamportsPerSec ? lamportsToSOL(cluster.cachedSpendRateLamportsPerSec) * 60 : 0;
    
    console.log(`✅ Cluster ${cluster.parent.slice(0, 8)}... - Remaining: ${remainingSOL.toFixed(6)} SOL, Spend Rate: ${spendRateSOL.toFixed(6)} SOL/min, Time Left: ${cluster.cachedTimeRemainingSec || 'calculating...'} sec, Active Wallets: ${validBalances}/${childAddrs.length}`);
    
    cluster.lastUpdate = now;
  }
  
  console.log(`🏁 Balance update completed for ${activeClusters.length} clusters`);
}

async function getBalancesBatch(connection, addresses) {
  const results = new Array(addresses.length).fill(null);
  const chunkSize = 100;
  const retries = 2;

  for (let i = 0; i < addresses.length; i += chunkSize) {
    const batch = addresses.slice(i, Math.min(i + chunkSize, addresses.length));
    const pubkeys = batch.map(addr => new PublicKey(addr));
    let success = false;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const infos = await connection.getMultipleAccountsInfo(pubkeys, 'confirmed');
        infos.forEach((info, j) => results[i + j] = info?.lamports ?? null);
        success = true;
        break;
      } catch (e) {
        console.warn(`Batch balance fetch attempt ${attempt + 1} failed: ${e.message}`);
        if (attempt === retries) {
          console.error(`Failed to fetch batch after retries`);
        }
      }
    }
    if (!success) {
      // Fallback to 0 or previous, but we'll handle in caller
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return results;
}

function serializeClusters() {
  const arr = [];
  const now = Date.now();
  
  for (const cluster of clusters.values()) {
    const uniq = new Set(cluster.events.map(e => e.child)).size;
    if (uniq < FORMING_MIN_CHILDREN) continue;

    // Calculate average and std transfer amount
    const received = Array.from(cluster.children.values()).map(c => c.receivedLamports);
    const avgTransferAmount = received.length > 0 ? received.reduce((a, b) => a + b, 0) / received.length : 0;
    const variance = received.reduce((s, x) => s + Math.pow(x - avgTransferAmount, 2), 0) / received.length;
    const std = Math.sqrt(variance);

    // Calculate cluster age in seconds
    const clusterAgeSeconds = Math.floor((now - cluster.createdAt) / 1000);

    // Ensure we have balance data - if not, set to 0 instead of null
    const remainingSOL = cluster.cachedRemainingLamports != null 
      ? lamportsToSOL(cluster.cachedRemainingLamports) 
      : 0;

    // Calculate spend rate - if we have balance history
    let spendRatePerMin = null;
    if (cluster.cachedSpendRateLamportsPerSec != null && cluster.cachedSpendRateLamportsPerSec > 0) {
      spendRatePerMin = lamportsToSOL(cluster.cachedSpendRateLamportsPerSec) * 60;
    }

    // Calculate time remaining
    let timeRemaining = null;
    if (spendRatePerMin && spendRatePerMin > 0 && remainingSOL > 0) {
      timeRemaining = Math.floor((remainingSOL / spendRatePerMin) * 60); // Convert to seconds
    }

    arr.push({
      funding_wallet: cluster.parent,
      recipients: Array.from(cluster.children.keys()),
      token_mints: Array.from(cluster.tokenMints),
      fan_out_slot: cluster.fanOutSlot,
      buy_slots: cluster.buySlots.sort((a, b) => a - b),
      common_patterns: {
        amounts: `~${lamportsToSOL(avgTransferAmount).toFixed(3)} SOL each (±${lamportsToSOL(std).toFixed(3)} SOL)`,
        wallet_age: `${clusterAgeSeconds} seconds old (fast funding detected)`,
        dex_programs: Array.from(cluster.dexPrograms),
      },
      total_sol_funded: lamportsToSOL(cluster.totalFundedLamports),
      total_sol_remaining: remainingSOL,
      spend_rate_sol_per_min: spendRatePerMin,
      time_remaining_sec: timeRemaining,
      last_update: cluster.lastUpdate,
      cluster_age_sec: clusterAgeSeconds,
      children_count: cluster.children.size,
      created_at: cluster.createdAt, // Add creation timestamp for sorting
      status: cluster.active ? 'active' : 'forming',
    });
  }
  
  // Sort by creation time (most recent first) - this shows newest clusters at top!
  arr.sort((a, b) => (b.created_at - a.created_at));
  console.log(`📊 Serialized ${arr.length} active clusters - sorted by newest first`);
  return arr;
}

function getClusterStats() {
  const totalClusters = clusters.size;
  const activeClusters = Array.from(clusters.values()).filter(c => c.active).length;
  return { totalClusters, activeClusters };
}

module.exports = {
  ingestTransfer,
  updateBalances,
  detectClusterBehavior,
  serializeClusters,
  getClusterStats,
};