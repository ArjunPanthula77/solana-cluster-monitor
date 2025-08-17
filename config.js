require('dotenv').config();

module.exports = {
  RPC_URL: process.env.RPC_URL,
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '300000', 10),
  WINDOW_MS: parseInt(process.env.WINDOW_MS || '180000', 10), // 3 minutes
  MIN_CHILDREN: parseInt(process.env.MIN_CHILDREN || '5', 10),
  SPEND_REFRESH_MS: parseInt(process.env.SPEND_REFRESH_MS || '300000', 10),
  SPEND_RATE_WINDOW_MS: parseInt(process.env.SPEND_RATE_WINDOW_MS || '60000', 10),
};