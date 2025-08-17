// index.js
const { Connection } = require('@solana/web3.js');
const { RPC_URL, POLL_INTERVAL_MS, SPEND_REFRESH_MS } = require('./config');
const { ingestTransfer, updateBalances, detectClusterBehavior } = require('./cluster');
const { startApi } = require('./api');

if (!RPC_URL) {
  console.error('Missing RPC_URL in .env');
  process.exit(1);
}

const connection = new Connection(RPC_URL, 'confirmed');
console.log('Connected to RPC:', RPC_URL);

let lastProcessedSlot = 0;

async function processSlot(slot) {
  let attempt = 0;
  const maxAttempts = 5;
  const baseDelay = 500;

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
      console.log(`Block ${slot} time: ${new Date(blockTime * 1000).toISOString()}`);

      for (const tx of block.transactions) {
        const ixns = tx.transaction.message.instructions || [];
        for (const ix of ixns) {
          if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
            const info = ix.parsed.info;
            const from = info.source;
            const to = info.destination;
            const lamports = Number(info.lamports) || 0;
            if (lamports > 0) {
              console.log(`SOL transfer: ${from} -> ${to}, ${lamports} lamports`);
              ingestTransfer({
                parent: from,
                child: to,
                lamports,
                ts: blockTime,
                slot: slot,
              });
            }
          } else if (ix.programId && (ix.programId.toString() === 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' || // Token Program
                     ix.programId.toString() === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' || // Raydium AMM
                     ix.programId.toString() === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')) { // pump.fun
            console.log(`Potential DEX/Token instruction detected in slot ${slot}`);
            detectClusterBehavior(tx, blockTime, slot);
          }
        }
      }
      return;
    } catch (e) {
      if (e.response?.status === 429 && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Server responded with 429 Too Many Requests for slot ${slot}. Retrying after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      } else {
        console.error(`Failed to process slot ${slot}:`, e?.message || e);
        return;
      }
    }
  }
}

async function poll() {
  try {
    console.log('Starting poll cycle...');
    const current = await connection.getSlot('confirmed');
    console.log(`Current slot: ${current}`);

    if (lastProcessedSlot === 0) {
      lastProcessedSlot = current - 2;
      console.log(`Initial lastProcessedSlot set to: ${lastProcessedSlot}`);
    }

    for (let s = lastProcessedSlot + 1; s <= current; s++) {
      await processSlot(s);
      lastProcessedSlot = s;
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between slots
    }
    console.log(`Poll cycle completed. Last processed slot: ${lastProcessedSlot}`);
  } catch (e) {
    console.error('poll error', e?.message || e);
  }
}

async function start() {
  console.log('Starting monitor…');
  startApi(3000);

  setInterval(poll, POLL_INTERVAL_MS);
  setInterval(() => {
    console.log('Starting balance update cycle...');
    updateBalances(connection).then(() => console.log('Balance update cycle completed.'));
  }, SPEND_REFRESH_MS);

  await poll();
  await updateBalances(connection);
}

start().catch(console.error);