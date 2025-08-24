// const express = require('express');
// const { serializeClusters } = require('./cluster');
// const cors = require('cors');

// function startApi(port = 3001) { // Changed to 3001 to avoid conflict with React
//   const app = express();

//   // Enable CORS for requests from localhost:3000
//   app.use(cors());

//   app.get('/health', (_req, res) => res.json({ ok: true }));

//   app.get('/clusters', (_req, res) => {
//     const clusters = serializeClusters();
//     console.log(`API /clusters request served with ${clusters.length} clusters`);
//     res.json(clusters);
//   });

//   app.listen(port, () => {
//     console.log(`API listening on http://localhost:${port}`);
//   });
// }

// module.exports = { startApi };

// const express = require('express');
// const { serializeClusters, getClusterStats } = require('./cluster');
// const cors = require('cors');

// function startApi(port = 3001) {
//   const app = express();
  
//   // Enable CORS for all origins (adjust in production)
//   app.use(cors());

//   // Add JSON parsing middleware
//   app.use(express.json());

//   // Health check endpoint
//   app.get('/health', (_req, res) => {
//     const stats = getClusterStats();
//     res.json({ 
//       ok: true, 
//       timestamp: new Date().toISOString(),
//       clusters: stats,
//       uptime: process.uptime(),
//       network: 'mainnet-beta'
//     });
//   });

//   // Main clusters endpoint with enhanced logging
//   app.get('/clusters', (_req, res) => {
//     try {
//       const clusters = serializeClusters();
//       const stats = getClusterStats();
      
//       console.log(`📡 API /clusters request served - Active: ${clusters.length}, Total tracked: ${stats.totalClusters}`);
      
//       // Add metadata to response
//       const response = {
//         clusters: clusters,
//         metadata: {
//           total_active: clusters.length,
//           total_tracked: stats.totalClusters,
//           timestamp: new Date().toISOString(),
//           requirements: {
//             min_children: 5,
//             min_total_sol: 20,
//             min_transfer_sol: 1,
//             detection_window_sec: 10,
//             data_retention_min: 30
//           }
//         }
//       };
      
//       res.json(response);
//     } catch (error) {
//       console.error('❌ Error serving /clusters:', error.message);
//       res.status(500).json({ 
//         error: 'Internal server error', 
//         message: error.message 
//       });
//     }
//   });

//   // Stats endpoint for monitoring
//   app.get('/stats', (_req, res) => {
//     const stats = getClusterStats();
//     res.json({
//       ...stats,
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       memory: process.memoryUsage(),
//       network: 'mainnet-beta'
//     });
//   });

//   // Start server
//   const server = app.listen(port, () => {
//     console.log(`🌐 API server listening on http://localhost:${port}`);
//     console.log(`📋 Endpoints available:`);
//     console.log(`   GET /health    - Health check`);
//     console.log(`   GET /clusters  - Active clusters data`);
//     console.log(`   GET /stats     - System statistics`);
//   });

//   // Handle server errors
//   server.on('error', (error) => {
//     console.error('❌ API server error:', error.message);
//   });

//   return server;
// }

// module.exports = { startApi };

const express = require('express');
const { serializeClusters, getClusterStats } = require('./cluster');
const cors = require('cors');

function startApi(port = 3001) {
  const app = express();
  
  // Enable CORS for all origins (adjust in production)
  app.use(cors());
  
  // Add JSON parsing middleware
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (_req, res) => {
    const stats = getClusterStats();
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      clusters: stats,
      uptime: process.uptime(),
      network: 'mainnet-beta',
      version: '2.0-enhanced'
    });
  });
  
  // Enhanced clusters endpoint with DEX tracking
  app.get('/clusters', (_req, res) => {
    try {
      const clusters = serializeClusters();
      const stats = getClusterStats();
      
      console.log(`📡 API /clusters request served - Active: ${clusters.length} (${stats.tradingClusters} trading, ${stats.fundingClusters} funding), Total tracked: ${stats.totalClusters}`);
      
      // Enhanced metadata with DEX tracking
      const response = {
        clusters: clusters,
        metadata: {
          total_active: clusters.length,
          total_tracked: stats.totalClusters,
          trading_clusters: stats.tradingClusters,
          funding_clusters: stats.fundingClusters,
          timestamp: new Date().toISOString(),
          requirements: {
            min_children: 5,
            min_total_sol: 20,
            min_transfer_sol: 1,
            detection_window_sec: 10,
            data_retention_min: 30
          },
          dex_tracking: {
            supported_dexes: [
              'Raydium AMM V4', 'Raydium AMM V3', 'Raydium CLMM',
              'Pump.fun', 'Jupiter V6', 'Jupiter V4',
              'Orca Whirlpool', 'Orca V1', 'Serum V3', 'OpenBook V2'
            ],
            real_time_detection: true,
            phase_tracking: true
          },
          performance: {
            detection_speed_sec: '<5',
            update_frequency_sec: 3,
            balance_refresh_sec: 10
          }
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Error serving /clusters:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Enhanced stats endpoint with DEX metrics
  app.get('/stats', (_req, res) => {
    const stats = getClusterStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      network: 'mainnet-beta',
      version: '2.0-enhanced',
      features: {
        real_time_detection: true,
        dex_tracking: true,
        phase_detection: true,
        early_warning: true
      }
    });
  });
  
  // New endpoint for real-time cluster summary
  app.get('/summary', (_req, res) => {
    try {
      const clusters = serializeClusters();
      const stats = getClusterStats();
      
      const summary = {
        timestamp: new Date().toISOString(),
        totals: {
          active_clusters: clusters.length,
          funding_phase: stats.fundingClusters,
          trading_active: stats.tradingClusters,
          total_tracked: stats.totalClusters
        },
        recent_activity: clusters.slice(0, 5).map(cluster => ({
          wallet: cluster.funding_wallet.slice(0, 8) + '...',
          age_seconds: cluster.cluster_age_sec,
          children: cluster.children_count,
          sol_funded: cluster.total_sol_funded.toFixed(2),
          phase: cluster.trading_started ? 'TRADING' : 'FUNDING',
          dex_programs: cluster.dex_activity.programs_used.length
        })),
        dex_activity: {
          active_dexes: [...new Set(clusters.flatMap(c => c.dex_activity.programs_used))],
          total_interactions: clusters.reduce((sum, c) => sum + c.dex_activity.total_interactions, 0),
          trading_wallets: clusters.reduce((sum, c) => sum + c.dex_activity.trading_wallets, 0)
        }
      };
      
      res.json(summary);
    } catch (error) {
      console.error('❌ Error serving /summary:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  // Start server
  const server = app.listen(port, () => {
    console.log(`🌐 Enhanced API server listening on http://localhost:${port}`);
    console.log(`📋 Enhanced endpoints available:`);
    console.log(`   GET /health - Health check with DEX support`);
    console.log(`   GET /clusters - Enhanced clusters with DEX tracking`);
    console.log(`   GET /stats - System statistics with performance metrics`);
    console.log(`   GET /summary - Real-time cluster summary`);
    console.log(`🔥 Features: Real-time detection, DEX tracking, Phase detection`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ API server error:', error.message);
  });
  
  return server;
}

module.exports = { startApi };