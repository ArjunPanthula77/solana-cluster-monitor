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
const state = require('./state');

const clusters = new Map(); // empty 
const MAX_HISTORY_POINTS = 20;

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

// SOL and WSOL addresses to exclude from token filtering
const SOL_MINT = '11111111111111111111111111111111';
const WSOL_MINT = 'So11111111111111111111111111111112';

const DEX_PROGRAMS = {
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'pump.fun',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
  '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c': 'Lifinity',
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix V1',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM',
  'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG': 'Meteora DAMM',
  'GAMMA7meSFWaBXF25oSUgmGRwaW6sCMFLmBNiMSdbHVT': 'GooseFX',
  // Add more if needed
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

// New function to filter cluster by token consistency
function filterClusterByTokenConsistency(cluster) {
  // Get all non-SOL/WSOL tokens from the cluster
  const nonSolTokens = Array.from(cluster.tokenMints).filter(mint => 
    mint !== SOL_MINT && mint !== WSOL_MINT
  );
  
  if (nonSolTokens.length === 0) {
    // No tokens detected yet, keep all children for now
    console.log(`Cluster ${cluster.parent.slice(0, 8)}... - No tokens detected yet, keeping all children`);
    return {
      validChildren: Array.from(cluster.children.keys()),
      dominantToken: null,
      totalValidFunding: cluster.totalFundedLamports
    };
  }
  
  if (nonSolTokens.length === 1) {
    // Perfect case - only one token, all children are valid
    console.log(`Cluster ${cluster.parent.slice(0, 8)}... - Single token detected: ${nonSolTokens[0].slice(0, 8)}...`);
    return {
      validChildren: Array.from(cluster.children.keys()),
      dominantToken: nonSolTokens[0],
      totalValidFunding: cluster.totalFundedLamports
    };
  }
  
  // Multiple tokens detected - need to find which children bought which token
  // For now, we'll consider this cluster invalid since we can't easily track per-child token purchases
  // In a more advanced implementation, you'd track which child bought which token
  console.log(`Cluster ${cluster.parent.slice(0, 8)}... - Multiple tokens detected (${nonSolTokens.length}), marking as invalid`);
  
  return {
    validChildren: [],
    dominantToken: null,
    totalValidFunding: 0
  };
}

function computeActiveStatus(cluster, now) {
  pruneOldEvents(cluster, now);
  
  // Apply token consistency filtering
  const tokenFilter = filterClusterByTokenConsistency(cluster);
  const validChildren = tokenFilter.validChildren;
  const validChildrenSet = new Set(validChildren);
  
  // Filter events to only include valid children
  const validEvents = cluster.events.filter(e => validChildrenSet.has(e.child));
  const uniq = new Set(validEvents.map(e => e.child));
  const total = validEvents.reduce((s, e) => s + e.lamports, 0);
  
  // Check if cluster meets minimum requirements with valid children only
  const hasEnoughChildren = uniq.size >= MIN_CHILDREN;
  const hasEnoughFunding = total >= MIN_CLUSTER_FUNDING_LAMPORTS;
  const isActive = hasEnoughChildren && hasEnoughFunding && validChildren.length > 0;

  // Update cluster with filtered data
  cluster.active = isActive;
  cluster.totalFundedLamports = total;
  cluster.validChildren = validChildren;
  cluster.dominantToken = tokenFilter.dominantToken;
  cluster.filteredEvents = validEvents;
  
  console.log(`Cluster ${cluster.parent.slice(0, 8)}... - Valid Children: ${uniq.size}/${cluster.children.size}, Funding: ${lamportsToSOL(total)}/${lamportsToSOL(MIN_CLUSTER_FUNDING_LAMPORTS)} SOL, Active: ${isActive}, Token: ${tokenFilter.dominantToken?.slice(0, 8) || 'none'}...`);
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
      validChildren: [], // New: filtered children
      dominantToken: null, // New: the main token being bought
      filteredEvents: [], // New: events from valid children only
      childTokens: new Map(), // New: tracks which child bought which tokens
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

  // Track which children interacted with which tokens in this transaction
  const childTokenMap = new Map(); // child -> Set of tokens

  // Mints from postTokenBalances
  const mints = new Set();
  for (const bal of (meta.postTokenBalances || [])) {
    if (bal.mint && bal.mint !== SOL_MINT && bal.mint !== WSOL_MINT) {
      mints.add(bal.mint);
      // Track which account (child) had balance changes for this token
      const account = accountKeys[bal.accountIndex];
      if (!childTokenMap.has(account)) childTokenMap.set(account, new Set());
      childTokenMap.get(account).add(bal.mint);
    }
  }

  // Update clusters with token information
  for (const cluster of touchClusters) {
    // Add all detected tokens to cluster
    for (const mint of mints) {
      cluster.tokenMints.add(mint);
    }
    
    // Track which children interacted with which tokens
    for (const [child, tokens] of childTokenMap) {
      if (cluster.children.has(child)) {
        if (!cluster.childTokens) cluster.childTokens = new Map();
        if (!cluster.childTokens.has(child)) cluster.childTokens.set(child, new Set());
        for (const token of tokens) {
          cluster.childTokens.get(child).add(token);
        }
      }
    }
    
    if (mints.size > 0 && !cluster.buySlots.includes(slot)) {
      cluster.buySlots.push(slot);
    }
  }

  // Scan instructions for more token interactions
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
        if (mint && mint !== SOL_MINT && mint !== WSOL_MINT) {
          // Track which child created account for which token
          const account = info?.account;
          if (account) {
            for (const cluster of touchClusters) {
              if (cluster.children.has(account)) {
                cluster.tokenMints.add(mint);
                if (!cluster.childTokens) cluster.childTokens = new Map();
                if (!cluster.childTokens.has(account)) cluster.childTokens.set(account, new Set());
                cluster.childTokens.get(account).add(mint);
              }
            }
          }
        }
      } else if (programId === TOKEN_PROGRAM_ID && type?.startsWith('initializeAccount')) {
        const mint = info?.mint;
        if (mint && mint !== SOL_MINT && mint !== WSOL_MINT) {
          // Track account initialization for tokens
          const account = info?.account;
          if (account) {
            for (const cluster of touchClusters) {
              if (cluster.children.has(account)) {
                cluster.tokenMints.add(mint);
                if (!cluster.childTokens) cluster.childTokens = new Map();
                if (!cluster.childTokens.has(account)) cluster.childTokens.set(account, new Set());
                cluster.childTokens.get(account).add(mint);
              }
            }
          }
        }
      }
    }
  }

  // Recompute active status for all touched clusters to apply token filtering
  for (const cluster of touchClusters) {
    computeActiveStatus(cluster, now);
  }

  console.log(`Processed behavior for ${touchClusters.length} clusters at slot ${slot}`);
}

async function updateBalances(connection) {
  if (!state.isPollingStarted) return;
  console.log('🔄 Updating balances for all clusters...');
  const now = Date.now();
  
  // Remove old clusters first
  pruneOldClusters(now);

  const activeClusters = Array.from(clusters.values()).filter(c => 
    c.active || (c.validChildren && c.validChildren.length >= FORMING_MIN_CHILDREN)
  );
  console.log(`📊 Processing ${activeClusters.length} active/forming clusters for balance updates`);

  for (const cluster of activeClusters) {
    if (!state.isPollingStarted) return; // Early exit if stopped
    console.log(`💰 Updating balance for cluster ${cluster.parent.slice(0, 8)}... (${cluster.validChildren?.length || cluster.children.size} valid children)`);

    // Use only valid children for balance updates
    const childAddrs = cluster.validChildren && cluster.validChildren.length > 0 
      ? cluster.validChildren 
      : Array.from(cluster.children.keys());
      
    const balances = await getBalancesBatch(connection, childAddrs);

    let totalRemaining = 0;
    let validBalances = 0;

    childAddrs.forEach((addr, idx) => {
      if (!state.isPollingStarted) return; // Early exit if stopped
      let balLamports = balances[idx];
      const child = cluster.children.get(addr);
      if (!child) return; // Skip if child doesn't exist
      
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

    // Calculate spend rate with better logic - only for valid children
    const windowStart = now - SPEND_RATE_WINDOW_MS;
    let balNow = 0;
    let balThen = 0;
    let hasHistoryData = false;

    for (const addr of childAddrs) {
      if (!state.isPollingStarted) return; // Early exit if stopped
      const child = cluster.children.get(addr);
      if (!child || child.balanceHistory.length < 2) continue;
      
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
    
    console.log(`✅ Cluster ${cluster.parent.slice(0, 8)}... - Remaining: ${remainingSOL.toFixed(6)} SOL, Spend Rate: ${spendRateSOL.toFixed(6)} SOL/min, Time Left: ${cluster.cachedTimeRemainingSec || 'calculating...'} sec, Active Wallets: ${validBalances}/${childAddrs.length}, Token: ${cluster.dominantToken?.slice(0, 8) || 'detecting'}...`);
    
    cluster.lastUpdate = now;
  }
  
  console.log(`🏁 Balance update completed for ${activeClusters.length} clusters`);
}

async function getBalancesBatch(connection, addresses) {
  const results = new Array(addresses.length).fill(null);
  const chunkSize = 100;
  const retries = 2;

  for (let i = 0; i < addresses.length; i += chunkSize) {
    if (!state.isPollingStarted) return results; // Early exit if stopped
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
    // Use valid children count instead of total children
    const validChildrenCount = cluster.validChildren ? cluster.validChildren.length : cluster.children.size;
    if (validChildrenCount < FORMING_MIN_CHILDREN) continue;

    // Calculate stats only for valid children
    const validChildren = cluster.validChildren || Array.from(cluster.children.keys());
    const received = validChildren.map(addr => {
      const child = cluster.children.get(addr);
      return child ? child.receivedLamports : 0;
    }).filter(amount => amount > 0);
    
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

    // Show only the dominant token (the one the valid children are buying)
    const relevantTokens = cluster.dominantToken ? [cluster.dominantToken] : [];

    arr.push({
      funding_wallet: cluster.parent,
      recipients: validChildren, // Only valid children
      token_mints: relevantTokens, // Only the common token they're all buying
      dominant_token: cluster.dominantToken, // New: the main token being bought
      fan_out_slot: cluster.fanOutSlot,
      buy_slots: cluster.buySlots.sort((a, b) => a - b),
      common_patterns: {
        amounts: `~${lamportsToSOL(avgTransferAmount).toFixed(3)} SOL each (±${lamportsToSOL(std).toFixed(3)} SOL)`,
        wallet_age: `${clusterAgeSeconds} seconds old (fast funding detected)`,
        dex_programs: Array.from(cluster.dexPrograms),
        token_consistency: relevantTokens.length <= 1 ? 'consistent' : 'mixed', // New field
      },
      total_sol_funded: lamportsToSOL(cluster.totalFundedLamports), // This is now only for valid children
      total_sol_remaining: remainingSOL,
      spend_rate_sol_per_min: spendRatePerMin,
      time_remaining_sec: timeRemaining,
      last_update: cluster.lastUpdate,
      cluster_age_sec: clusterAgeSeconds,
      children_count: validChildrenCount, // Updated to show only valid children
      total_children_detected: cluster.children.size, // New: show total detected children
      created_at: cluster.createdAt, // Add creation timestamp for sorting
      status: cluster.active ? 'active' : 'forming',
    });
  }
  
  // Sort by creation time (most recent first) - this shows newest clusters at top!
  arr.sort((a, b) => (b.created_at - a.created_at));
  console.log(`📊 Serialized ${arr.length} active clusters with token filtering - sorted by newest first`);
  return arr;
}

function getClusterStats() {
  const totalClusters = clusters.size;
  const activeClusters = Array.from(clusters.values()).filter(c => c.active).length;
  return { totalClusters, activeClusters };
}

function clearClusters() {
  clusters.clear();
  console.log('🧹 Cleared all clusters for fresh start');
}

module.exports = {
  ingestTransfer,
  updateBalances,
  detectClusterBehavior,
  serializeClusters,
  getClusterStats,
  clearClusters
};