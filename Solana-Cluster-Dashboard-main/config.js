// require('dotenv').config();

// module.exports = {
//   RPC_URL: process.env.RPC_URL,
//   POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '300000', 10),
//   WINDOW_MS: parseInt(process.env.WINDOW_MS || '180000', 10), // 3 minutes
//   MIN_CHILDREN: parseInt(process.env.MIN_CHILDREN || '5', 10),
//   SPEND_REFRESH_MS: parseInt(process.env.SPEND_REFRESH_MS || '300000', 10),
//   SPEND_RATE_WINDOW_MS: parseInt(process.env.SPEND_RATE_WINDOW_MS || '60000', 10),
// };

require('dotenv').config();

module.exports = {
  // Use mainnet RPC URL
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Poll every 2 seconds for faster detection
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '2000', 10),
  
  // 10 second window to catch fast funding clusters
  WINDOW_MS: parseInt(process.env.WINDOW_MS || '10000', 10),
  
  // Minimum 5 children for a cluster
  MIN_CHILDREN: parseInt(process.env.MIN_CHILDREN || '5', 10),
  
  // Update balances every 30 seconds
  SPEND_REFRESH_MS: parseInt(process.env.SPEND_REFRESH_MS || '30000', 10),
  
  // 5 minute window for spend rate calculation
  SPEND_RATE_WINDOW_MS: parseInt(process.env.SPEND_RATE_WINDOW_MS || '300000', 10),
  
  // Minimum SOL per transfer (1 SOL = 1,000,000,000 lamports)
  MIN_TRANSFER_LAMPORTS: parseInt(process.env.MIN_TRANSFER_LAMPORTS || '1000000000', 10), // 1 SOL
  
  // Minimum total cluster funding (20 SOL)
  MIN_CLUSTER_FUNDING_LAMPORTS: parseInt(process.env.MIN_CLUSTER_FUNDING_LAMPORTS || '20000000000', 10), // 20 SOL
  
  // Data retention window (30 minutes)
  DATA_RETENTION_MS: parseInt(process.env.DATA_RETENTION_MS || '1800000', 10), // 30 minutes
};