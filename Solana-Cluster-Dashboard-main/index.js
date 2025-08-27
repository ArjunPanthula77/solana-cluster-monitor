
// // index.js
// const { Connection } = require('@solana/web3.js');
// const { RPC_URL, POLL_INTERVAL_MS, SPEND_REFRESH_MS } = require('./config');
// const { ingestTransfer, updateBalances, getClusterStats, detectClusterBehavior } = require('./cluster');
// const { startApi } = require('./api');

// if (!RPC_URL) {
//   console.error('Missing RPC_URL in .env - using mainnet default');
// }

// // Use 'processed' for faster ingestion
// const connection = new Connection(RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=11fc101f-2e6f-4c67-aa2b-073eaf946b8c', 'processed');
// console.log('Connected to Solana Mainnet RPC:', RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=11fc101f-2e6f-4c67-aa2b-073eaf946b8c');

// let lastProcessedSlot = 0;

// async function processSlot(slot) {
//   let attempt = 0;
//   const maxAttempts = 3;
//   const baseDelay = 1000; 
  
//   while (attempt < maxAttempts) {
//     try {
//       console.log(`Processing slot ${slot}...`);
//       const block = await connection.getParsedBlock(slot, {
//         maxSupportedTransactionVersion: 0,
//         commitment: 'confirmed',
//       });

//       if (!block || !block.blockTime || !block.transactions) {
//         console.log(`No data for slot ${slot}`);
//         return;
//       }

//       const blockTime = block.blockTime;
//       console.log(`Block ${slot} time: ${new Date(blockTime * 1000).toISOString()}, transactions: ${block.transactions.length}`);

//       // Process all transactions in the block
//       for (const tx of block.transactions) {
//         // Skip failed transactions
//         if (tx.meta?.err) {
//           continue;
//         }

//         detectClusterBehavior(tx, blockTime, slot);

//         const messageInstructions = tx.transaction.message.instructions || [];
//         const innerInstructions = tx.meta?.innerInstructions || [];

//         const allInstructions = [...messageInstructions];
//         for (const inner of innerInstructions) {
//           allInstructions.push(...inner.instructions);
//         }

//         let ixIdx = 0;
//         for (const ix of messageInstructions) {  // Dedupe only on top-level for simplicity
//           if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
//             const info = ix.parsed.info;
//             const from = info.source;
//             const to = info.destination;
//             const lamports = Number(info.lamports) || 0;

//             if (lamports > 0) {
//               console.log(`SOL transfer detected: ${from.slice(0, 6)}...${from.slice(-4)} -> ${to.slice(0, 6)}...${to.slice(-4)}, ${(lamports / 1_000_000_000).toFixed(6)} SOL`);
              
//               ingestTransfer({
//                 parent: from,
//                 child: to,
//                 lamports,
//                 ts: blockTime,
//                 slot: slot,
//                 signature: tx.transaction.signatures[0],
//                 ixIdx
//               });
//             }
//           }
//           ixIdx++;
//         }
//       }

//       return; // Success, exit retry loop
//     } catch (e) {
//       if ((e.response?.status === 429 || e.message?.includes('429') || e.message?.includes('Too Many Requests')) && attempt < maxAttempts - 1) {
//         const delay = baseDelay * Math.pow(2, attempt);
//         console.log(`Rate limit hit for slot ${slot}. Retrying after ${delay}ms delay... (attempt ${attempt + 1}/${maxAttempts})`);
//         await new Promise(resolve => setTimeout(resolve, delay));
//         attempt++;
//       } else {
//         console.error(`Failed to process slot ${slot} after ${attempt + 1} attempts:`, e?.message || e);
//         return;
//       }
//     }
//   }
// }

// async function poll() {
//   try {
//     console.log('Starting poll cycle...');
//     const current = await connection.getSlot('processed');
//     console.log(`Current slot: ${current}`);

//     if (lastProcessedSlot === 0) {
//       // Start from 5 slots back to catch recent activity
//       lastProcessedSlot = current - 5;
//       console.log(`Initial lastProcessedSlot set to: ${lastProcessedSlot}`);
//     }

//     // Process missed slots (but limit to prevent overwhelming)
//     const maxSlotsToProcess = 20;
//     const startSlot = Math.max(lastProcessedSlot + 1, current - maxSlotsToProcess);
    
//     for (let s = startSlot; s <= current; s++) {
//       await processSlot(s);
//       lastProcessedSlot = s;
      
//       // Small delay between slots to avoid rate limits
//       await new Promise(resolve => setTimeout(resolve, 200));
//     }

//     const stats = getClusterStats();
//     console.log(`Poll cycle completed. Last processed slot: ${lastProcessedSlot}, Active clusters: ${stats.activeClusters}/${stats.totalClusters}`);
//   } catch (e) {
//     console.error('Poll error:', e?.message || e);
//   }
// }

// async function start() {
//   console.log('🚀 Starting Solana Cluster Monitor for MAINNET...');
//   console.log('📊 Requirements: ≥5 children, ≥20 SOL total, ≥1 SOL per transfer, 10s detection window');
//   console.log('⚡ REAL-TIME MODE: New clusters appear immediately!');
  
//   // Start API server

//   const port = process.env.port || 3001
//   startApi(port);
  
//   // Set up intervals with faster balance updates for real-time data
//   console.log(`⏱️  Polling every ${POLL_INTERVAL_MS}ms, Balance updates every 15s for real-time data`);
  
//   const pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  
//   // Update balances every 15 seconds for faster real-time data
//   const balanceInterval = setInterval(() => {
//     console.log('🔄 Starting real-time balance update...');
//     updateBalances(connection)
//       .then(() => {
//         const stats = getClusterStats();
//         console.log(`✅ Real-time update completed. Active clusters: ${stats.activeClusters} (sorted by newest first)`);
//       })
//       .catch(err => console.error('❌ Balance update failed:', err.message));
//   }, 15000); // 15 seconds for faster updates

//   // Initial run
//   await poll();
  
//   // Initial balance update after 5 seconds to let some data accumulate
//   setTimeout(async () => {
//     console.log('🎯 Running initial balance update...');
//     await updateBalances(connection);
//   }, 5000);
  
//   console.log('✅ Real-time monitor started successfully!');
  
//   // Graceful shutdown
//   process.on('SIGINT', () => {
//     console.log('🛑 Shutting down gracefully...');
//     clearInterval(pollInterval);
//     clearInterval(balanceInterval);
//     process.exit(0);
//   });
// }

// start().catch(error => {
//   console.error('❌ Failed to start monitor:', error);
//   process.exit(1);
// });

// index.js
const { Connection } = require('@solana/web3.js');
const { RPC_URL, POLL_INTERVAL_MS, SPEND_REFRESH_MS } = require('./config');
const { ingestTransfer, updateBalances, getClusterStats, detectClusterBehavior } = require('./cluster');
const { startApi } = require('./api');

if (!RPC_URL) {
  console.error('Missing RPC_URL in .env - using mainnet default');
}

// Use 'processed' for faster ingestion
const connection = new Connection(RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=11fc101f-2e6f-4c67-aa2b-073eaf946b8c', 'processed');
console.log('Connected to Solana Mainnet RPC:', RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=11fc101f-2e6f-4c67-aa2b-073eaf946b8c');

let lastProcessedSlot = 0;
let pollInterval = null;
let balanceInterval = null;
let isPollingStarted = false;

async function processSlot(slot) {
  let attempt = 0;
  const maxAttempts = 3;
  const baseDelay = 1000; 
  
  while (attempt < maxAttempts) {
    try {
      console.log(`Processing slot ${slot}...`);
      const block = await connection.getParsedBlock(slot, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!block || !block.blockTime || !block.transactions) {
        console.log(`No data for slot ${slot}`);
        return;
      }

      const blockTime = block.blockTime;
      console.log(`Block ${slot} time: ${new Date(blockTime * 1000).toISOString()}, transactions: ${block.transactions.length}`);

      // Process all transactions in the block
      for (const tx of block.transactions) {
        // Skip failed transactions
        if (tx.meta?.err) {
          continue;
        }

        detectClusterBehavior(tx, blockTime, slot);

        const messageInstructions = tx.transaction.message.instructions || [];
        const innerInstructions = tx.meta?.innerInstructions || [];

        const allInstructions = [...messageInstructions];
        for (const inner of innerInstructions) {
          allInstructions.push(...inner.instructions);
        }

        let ixIdx = 0;
        for (const ix of messageInstructions) {  // Dedupe only on top-level for simplicity
          if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
            const info = ix.parsed.info;
            const from = info.source;
            const to = info.destination;
            const lamports = Number(info.lamports) || 0;

            if (lamports > 0) {
              console.log(`SOL transfer detected: ${from.slice(0, 6)}...${from.slice(-4)} -> ${to.slice(0, 6)}...${to.slice(-4)}, ${(lamports / 1_000_000_000).toFixed(6)} SOL`);
              
              ingestTransfer({
                parent: from,
                child: to,
                lamports,
                ts: blockTime,
                slot: slot,
                signature: tx.transaction.signatures[0],
                ixIdx
              });
            }
          }
          ixIdx++;
        }
      }

      return; // Success, exit retry loop
    } catch (e) {
      if ((e.response?.status === 429 || e.message?.includes('429') || e.message?.includes('Too Many Requests')) && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limit hit for slot ${slot}. Retrying after ${delay}ms delay... (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        console.error(`Failed to process slot ${slot} after ${attempt + 1} attempts:`, e?.message || e);
        return;
      }
    }
  }
}

async function poll() {
  try {
    console.log('Starting poll cycle...');
    const current = await connection.getSlot('processed');
    console.log(`Current slot: ${current}`);

    if (lastProcessedSlot === 0) {
      // Start from 5 slots back to catch recent activity
      lastProcessedSlot = current - 5;
      console.log(`Initial lastProcessedSlot set to: ${lastProcessedSlot}`);
    }

    // Process missed slots (but limit to prevent overwhelming)
    const maxSlotsToProcess = 20;
    const startSlot = Math.max(lastProcessedSlot + 1, current - maxSlotsToProcess);
    
    for (let s = startSlot; s <= current; s++) {
      await processSlot(s);
      lastProcessedSlot = s;
      
      // Small delay between slots to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const stats = getClusterStats();
    console.log(`Poll cycle completed. Last processed slot: ${lastProcessedSlot}, Active clusters: ${stats.activeClusters}/${stats.totalClusters}`);
  } catch (e) {
    console.error('Poll error:', e?.message || e);
  }
}

async function startPolling() {
  if (isPollingStarted) {
    console.log('Polling already started, skipping initialization.');
    return;
  }

  console.log('🚀 Starting Solana Cluster Monitor for MAINNET...');
  console.log('📊 Requirements: ≥5 children, ≥20 SOL total, ≥1 SOL per transfer, 10s detection window');
  console.log('⚡ REAL-TIME MODE: New clusters appear immediately!');
  
  isPollingStarted = true;

  // Initial poll run
  await poll();
  
  // Set up polling interval
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  
  // Initial balance update after 5 seconds to let some data accumulate
  setTimeout(async () => {
    console.log('🎯 Running initial balance update...');
    await updateBalances(connection);
  }, 5000);

  // Set up balance update interval
  console.log(`⏱️ Polling every ${POLL_INTERVAL_MS}ms, Balance updates every 15s for real-time data`);
  balanceInterval = setInterval(() => {
    console.log('🔄 Starting real-time balance update...');
    updateBalances(connection)
      .then(() => {
        const stats = getClusterStats();
        console.log(`✅ Real-time update completed. Active clusters: ${stats.activeClusters} (sorted by newest first)`);
      })
      .catch(err => console.error('❌ Balance update failed:', err.message));
  }, 15000); // 15 seconds for faster updates
}

async function start() {
  const port = process.env.PORT || 3001;
  
  // Pass the startPolling function to the API so it can be triggered on /clusters request
  startApi(port, startPolling);
  
  console.log('✅ API server started, waiting for /clusters request to begin polling.');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    if (pollInterval) clearInterval(pollInterval);
    if (balanceInterval) clearInterval(balanceInterval);
    process.exit(0);
  });
}

start().catch(error => {
  console.error('❌ Failed to start monitor:', error);
  process.exit(1);
});