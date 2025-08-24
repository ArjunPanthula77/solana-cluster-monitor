// // // index.js
// // const { Connection } = require('@solana/web3.js');
// // const { RPC_URL, POLL_INTERVAL_MS, SPEND_REFRESH_MS } = require('./config');
// // const { ingestTransfer, updateBalances, detectClusterBehavior } = require('./cluster');
// // const { startApi } = require('./api');

// // if (!RPC_URL) {
// //   console.error('Missing RPC_URL in .env');
// //   process.exit(1);
// // }

// // const connection = new Connection(RPC_URL, 'confirmed');
// // console.log('Connected to RPC:', RPC_URL);

// // let lastProcessedSlot = 0;

// // async function processSlot(slot) {
// //   let attempt = 0;
// //     const maxAttempts = 5;
// //     const baseDelay = 500;

// //     while (attempt < maxAttempts) {
// //     try {
// //       console.log(`Processing slot ${slot}...`);
// //       const block = await connection.getParsedBlock(slot, {
// //         maxSupportedTransactionVersion: 0,
// //         commitment: 'confirmed',
// //       });
// //       if (!block || !block.blockTime || !block.transactions) {
// //         console.log(`No data for slot ${slot}`);
// //         return;
// //       }

// //       const blockTime = block.blockTime;
// //       console.log(`Block ${slot} time: ${new Date(blockTime * 1000).toISOString()}`);

// //       for (const tx of block.transactions) {
// //         const ixns = tx.transaction.message.instructions || [];
// //         for (const ix of ixns) {
// //           if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
// //             const info = ix.parsed.info;
// //             const from = info.source;
// //             const to = info.destination;
// //             const lamports = Number(info.lamports) || 0;
// //             if (lamports > 0) {
// //               console.log(`SOL transfer: ${from} -> ${to}, ${lamports} lamports`);
// //               ingestTransfer({
// //                   parent: from,
// //                   child: to,
// //                 lamports,
// //                 ts: blockTime,
// //                 slot: slot,
// //               });
// //             }
// //           } else if (ix.programId && (ix.programId.toString() === 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' || // Token Program
// //                      ix.programId.toString() === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' || // Raydium AMM
// //                      ix.programId.toString() === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')) { // pump.fun
// //             console.log(`Potential DEX/Token instruction detected in slot ${slot}`);
// //             detectClusterBehavior(tx, blockTime, slot);
// //           }
// //         }
// //       }
// //       return;
// //     } catch (e) {
// //       if (e.response?.status === 429 && attempt < maxAttempts - 1) {
// //         const delay = baseDelay * Math.pow(2, attempt);
// //         console.log(`Server responded with 429 Too Many Requests for slot ${slot}. Retrying after ${delay}ms delay...`);
// //         await new Promise(resolve => setTimeout(resolve, delay));
// //         attempt++;
// //       } else {
// //         console.error(`Failed to process slot ${slot}:`, e?.message || e);
// //         return;
// //       }
// //     }
// //   }
// // }

// // async function poll() {
// //   try {
// //     console.log('Starting poll cycle...');
// //     const current = await connection.getSlot('confirmed');
// //     console.log(`Current slot: ${current}`);

// //     if (lastProcessedSlot === 0) {
// //       lastProcessedSlot = current - 2;
// //       console.log(`Initial lastProcessedSlot set to: ${lastProcessedSlot}`);
// //     }

// //     for (let s = lastProcessedSlot + 1; s <= current; s++) {
// //       await processSlot(s);
// //       lastProcessedSlot = s;
// //       await new Promise(resolve => setTimeout(resolve, 1000)); 
// //     }
// //     console.log(`Poll cycle completed. Last processed slot: ${lastProcessedSlot}`);
// //   } catch (e) {
// //     console.error('poll error', e?.message || e);
// //   }
// // }

// // async function start() {
// //   console.log('Starting monitor…');
// //   startApi(3000);

// //   setInterval(poll, POLL_INTERVAL_MS);
// //   setInterval(() => {
// //     console.log('Starting balance update cycle...');
// //     updateBalances(connection).then(() => console.log('Balance update cycle completed.'));
// //   }, SPEND_REFRESH_MS);

// //   await poll();
// //   await updateBalances(connection);
// // }

// // start().catch(console.error);

// // index.js
// const { Connection } = require('@solana/web3.js');
// const { RPC_URL, POLL_INTERVAL_MS, SPEND_REFRESH_MS } = require('./config');
// const { ingestTransfer, updateBalances, getClusterStats } = require('./cluster');
// const { startApi } = require('./api');

// if (!RPC_URL) {
//   console.error('Missing RPC_URL in .env - using mainnet default');
// }

// // Use mainnet-beta for production
// const connection = new Connection(RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
// console.log('Connected to Solana Mainnet RPC:', RPC_URL || 'https://api.mainnet-beta.solana.com');

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

//         const ixns = tx.transaction.message.instructions || [];
        
//         for (const ix of ixns) {
//           // Only process SOL transfers via system program
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
//               });
//             }
//           }
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
//     const current = await connection.getSlot('confirmed');
//     console.log(`Current slot: ${current}`);

//     if (lastProcessedSlot === 0) {
//       // Start from 5 slots back to catch recent activity
//       lastProcessedSlot = current - 5;
//       console.log(`Initial lastProcessedSlot set to: ${lastProcessedSlot}`);
//     }

//     // Process missed slots (but limit to prevent overwhelming)
//     const maxSlotsToProcess = 10;
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
  
//   // Start API server
//   startApi(3001);
  
//   // Set up intervals
//   console.log(`⏱️  Polling every ${POLL_INTERVAL_MS}ms, Balance updates every ${SPEND_REFRESH_MS}ms`);
  
//   const pollInterval = setInterval(poll, POLL_INTERVAL_MS);
//   const balanceInterval = setInterval(() => {
//     console.log('🔄 Starting balance update cycle...');
//     updateBalances(connection)
//       .then(() => {
//         const stats = getClusterStats();
//         console.log(`✅ Balance update completed. Active clusters: ${stats.activeClusters}`);
//       })
//       .catch(err => console.error('❌ Balance update failed:', err.message));
//   }, SPEND_REFRESH_MS);

//   // Initial run
//   await poll();
//   await updateBalances(connection);
  
//   console.log('✅ Monitor started successfully!');
  
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

// // index.js
// const { Connection } = require('@solana/web3.js');
// const { RPC_URL, POLL_INTERVAL_MS, SPEND_REFRESH_MS } = require('./config');
// const { ingestTransfer, updateBalances, getClusterStats } = require('./cluster');
// const { startApi } = require('./api');

// if (!RPC_URL) {
//   console.error('Missing RPC_URL in .env - using mainnet default');
// }

// // Use mainnet-beta for production
// const connection = new Connection(RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
// console.log('Connected to Solana Mainnet RPC:', RPC_URL || 'https://api.mainnet-beta.solana.com');

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

//         const ixns = tx.transaction.message.instructions || [];
        
//         for (const ix of ixns) {
//           // Only process SOL transfers via system program
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
//               });
//             }
//           }
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
//     const current = await connection.getSlot('confirmed');
//     console.log(`Current slot: ${current}`);

//     if (lastProcessedSlot === 0) {
//       // Start from 5 slots back to catch recent activity
//       lastProcessedSlot = current - 5;
//       console.log(`Initial lastProcessedSlot set to: ${lastProcessedSlot}`);
//     }

//     // Process missed slots (but limit to prevent overwhelming)
//     const maxSlotsToProcess = 10;
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
//   startApi(3001);
  
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

const { Connection } = require('@solana/web3.js');
const { RPC_URL, POLL_INTERVAL_MS } = require('./config');
const { ingestTransfer, updateBalances, getClusterStats, detectDexActivity } = require('./cluster');
const { startApi } = require('./api');

if (!RPC_URL) {
  console.error('Missing RPC_URL in .env - using mainnet default');
}

// Use mainnet-beta for production
const connection = new Connection(RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
console.log('🌐 Connected to Solana Mainnet RPC:', RPC_URL || 'https://api.mainnet-beta.solana.com');

let lastProcessedSlot = 0;
let totalTransactionsProcessed = 0;
let totalClustersDetected = 0;

async function processSlot(slot) {
  let attempt = 0;
  const maxAttempts = 3;
  const baseDelay = 500; // Reduced base delay for faster processing

  while (attempt < maxAttempts) {
    try {
      const block = await connection.getParsedBlock(slot, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
        rewards: false, // Skip rewards to reduce data
        transactionDetails: 'full'
      });

      if (!block || !block.blockTime || !block.transactions) {
        return;
      }

      const blockTime = block.blockTime;
      const prevStats = getClusterStats();
      
      console.log(`⚡ Processing slot ${slot} (${new Date(blockTime * 1000).toISOString()}) - ${block.transactions.length} txs`);

      // Process all transactions for both SOL transfers AND DEX activity
      for (const tx of block.transactions) {
        // Skip failed transactions
        if (tx.meta?.err) {
          continue;
        }

        totalTransactionsProcessed++;

        // STEP 1: Detect SOL transfers (funding phase)
        const ixns = tx.transaction.message.instructions || [];
        
        for (const ix of ixns) {
          // Process SOL transfers via system program
          if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
            const info = ix.parsed.info;
            const from = info.source;
            const to = info.destination;
            const lamports = Number(info.lamports) || 0;

            if (lamports > 0) {
              console.log(`💸 SOL transfer: ${from.slice(0, 6)}...${from.slice(-4)} → ${to.slice(0, 6)}...${to.slice(-4)}, ${(lamports / 1_000_000_000).toFixed(6)} SOL`);
              
              ingestTransfer({
                parent: from,
                child: to,
                lamports,
                ts: blockTime,
                slot: slot,
              });
            }
          }
        }

        // STEP 2: Detect DEX activity (trading phase) - CRITICAL FOR EARLY DETECTION!
        detectDexActivity(tx, blockTime, slot);
      }

      // Check if new clusters were detected
      const newStats = getClusterStats();
      if (newStats.activeClusters > prevStats.activeClusters) {
        const newClusters = newStats.activeClusters - prevStats.activeClusters;
        totalClustersDetected += newClusters;
        console.log(`🚀 ${newClusters} NEW CLUSTER(S) DETECTED! Total active: ${newStats.activeClusters} (${newStats.tradingClusters} trading, ${newStats.fundingClusters} funding)`);
      }

      return; // Success, exit retry loop
    } catch (e) {
      if ((e.response?.status === 429 || e.message?.includes('429') || e.message?.includes('Too Many Requests')) && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(1.5, attempt); // Gentler exponential backoff
        console.log(`⏳ Rate limit hit for slot ${slot}. Retrying after ${delay}ms... (${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        console.error(`❌ Failed to process slot ${slot} after ${attempt + 1} attempts:`, e?.message || e);
        return;
      }
    }
  }
}

async function poll() {
  try {
    const current = await connection.getSlot('confirmed');

    if (lastProcessedSlot === 0) {
      // Start from just 2 slots back for maximum real-time detection
      lastProcessedSlot = current - 2;
      console.log(`🎯 Initial lastProcessedSlot set to: ${lastProcessedSlot} (real-time mode)`);
    }

    // Process missed slots with aggressive real-time approach
    const maxSlotsToProcess = 5; // Reduced to stay current
    const startSlot = Math.max(lastProcessedSlot + 1, current - maxSlotsToProcess);
    
    for (let s = startSlot; s <= current; s++) {
      await processSlot(s);
      lastProcessedSlot = s;
      
      // Minimal delay to maintain real-time processing
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const stats = getClusterStats();
    if (stats.activeClusters > 0) {
      console.log(`✅ Slot ${lastProcessedSlot} processed | Active: ${stats.activeClusters} (${stats.tradingClusters} trading, ${stats.fundingClusters} funding) | Total detected: ${totalClustersDetected}`);
    }
  } catch (e) {
    console.error('❌ Poll error:', e?.message || e);
  }
}

async function start() {
  console.log('🚀 Starting ENHANCED Solana Cluster Monitor for MAINNET...');
  console.log('📊 Requirements: ≥5 children, ≥20 SOL total, ≥1 SOL per transfer, 10s detection window');
  console.log('⚡ REAL-TIME MODE: Clusters detected within seconds of funding!');
  console.log('🔥 DEX TRACKING: Raydium, Pump.fun, Jupiter, Orca, Serum integration');
  console.log('🎯 EARLY DETECTION: Catch clusters during funding phase, before trading starts');
  
  // Start API server
  startApi(3001);
  
  // Ultra-fast polling for real-time detection
  console.log(`⏱️  Ultra-fast polling every ${POLL_INTERVAL_MS}ms for immediate cluster detection`);
  
  const pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  
  // Faster balance updates for real-time data (every 10 seconds)
  const balanceInterval = setInterval(() => {
    console.log('🔄 Real-time balance & DEX activity update...');
    updateBalances(connection)
      .then(() => {
        const stats = getClusterStats();
        console.log(`✅ Update completed | Active: ${stats.activeClusters} | Trading: ${stats.tradingClusters} | Funding: ${stats.fundingClusters}`);
      })
      .catch(err => console.error('❌ Balance update failed:', err.message));
  }, 10000); // 10 seconds for ultra-fast updates

  // Initial run
  await poll();
  
  // Initial balance update after 3 seconds
  setTimeout(async () => {
    console.log('🎯 Running initial balance update...');
    await updateBalances(connection);
  }, 3000);
  
  console.log('✅ Enhanced real-time monitor started successfully!');
  console.log('🎨 Dashboard available at http://localhost:3001/clusters');
  
  // Enhanced stats logging every 30 seconds
  const statsInterval = setInterval(() => {
    const stats = getClusterStats();
    console.log(`📈 STATS | Processed: ${totalTransactionsProcessed} txs | Detected: ${totalClustersDetected} clusters | Active: ${stats.activeClusters} | Trading: ${stats.tradingClusters}`);
  }, 30000);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    clearInterval(pollInterval);
    clearInterval(balanceInterval);
    clearInterval(statsInterval);
    process.exit(0);
  });
}

start().catch(error => {
  console.error('❌ Failed to start enhanced monitor:', error);
  process.exit(1);
});