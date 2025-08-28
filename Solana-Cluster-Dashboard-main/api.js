
// // // api.js
// // const express = require('express');
// // const { serializeClusters, getClusterStats } = require('./cluster');
// // const cors = require('cors');

// // function startApi(port = 3001) {
// //   const app = express();
  
// //   // Enable CORS for all origins (adjust in production)
// //   app.use(cors());

// //   // Add JSON parsing middleware
// //   app.use(express.json());

// //   // Health check endpoint
// //   app.get('/health', (_req, res) => {
// //     const stats = getClusterStats();
// //     res.json({ 
// //       ok: true, 
// //       timestamp: new Date().toISOString(),
// //       clusters: stats,
// //       uptime: process.uptime(),
// //       network: 'mainnet-beta'
// //     });
// //   });

// //   // Main clusters endpoint with enhanced logging
// //   app.get('/clusters', (_req, res) => {
// //     try {
// //       const clusters = serializeClusters();
// //       const stats = getClusterStats();
      
// //       console.log(`📡 API /clusters request served - Active: ${clusters.length}, Total tracked: ${stats.totalClusters}`);
      
// //       // Add metadata to response
// //       const response = {
// //         clusters: clusters,
// //         metadata: {
// //           total_active: clusters.length,
// //           total_tracked: stats.totalClusters,
// //           timestamp: new Date().toISOString(),
// //           requirements: {
// //             min_children: 5,
// //             min_total_sol: 20,
// //             min_transfer_sol: 1,
// //             detection_window_sec: 10,
// //             data_retention_min: 30
// //           }
// //         }
// //       };
      
// //       res.json(response);
// //     } catch (error) {
// //       console.error('❌ Error serving /clusters:', error.message);
// //       res.status(500).json({ 
// //         error: 'Internal server error', 
// //         message: error.message 
// //       });
// //     }
// //   });

// //   // Stats endpoint for monitoring
// //   app.get('/stats', (_req, res) => {
// //     const stats = getClusterStats();
// //     res.json({
// //       ...stats,
// //       timestamp: new Date().toISOString(),
// //       uptime: process.uptime(),
// //       memory: process.memoryUsage(),
// //       network: 'mainnet-beta'
// //     });
// //   });

// //   // Start server


// //   const server = app.listen(port, () => {
// //     console.log(`🌐 API server listening on port ${port}`);
// //     console.log(`📋 Endpoints available:`);
// //     console.log(`   GET /health    - Health check`);
// //     console.log(`   GET /clusters  - Active clusters data`);
// //     console.log(`   GET /stats     - System statistics`);
// //   });

// //   // Handle server errors
// //   server.on('error', (error) => {
// //     console.error('❌ API server error:', error.message);
// //   });

// //   return server;
// // }

// // module.exports = { startApi };

// // api.js
// const express = require('express');
// const { serializeClusters, getClusterStats } = require('./cluster');
// const cors = require('cors');

// function startApi(port = 3001, startPolling) {
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

//   // Main clusters endpoint with enhanced logging and polling trigger
//   app.get('/clusters', async (_req, res) => {
//     try {
//       // Start polling if not already started
//       await startPolling(); // Fixed: Changed 'start polling' to 'startPolling'
      
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
//     console.log(`🌐 API server listening on port ${port}`);
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

// const express = require('express');
// const { serializeClusters, getClusterStats } = require('./cluster');
// const cors = require('cors');

// function startApi(port = 3001, startPolling, stopPolling, getLastRequestTime, setLastRequestTime) {
//   const app = express();
  
//   app.use(cors());
//   app.use(express.json());

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

//   app.get('/clusters', async (_req, res) => {
//     try {
//       await startPolling();
//       setLastRequestTime(Date.now()); // Update last request time
      
//       const clusters = serializeClusters();
//       const stats = getClusterStats();
      
//       console.log(`📡 API /clusters request served - Active: ${clusters.length}, Total tracked: ${stats.totalClusters}`);
      
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

//   app.get('/stats', (_req, res) => {
//     const stats = getClusterStats();
//     res.json({
//       ...stats,
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       memory: process.memoryUsage(),
//       network: 'mainnet-beta',
//       last_request: getLastRequestTime() ? new Date(getLastRequestTime()).toISOString() : null
//     });
//   });

//   const server = app.listen(port, () => {
//     console.log(`🌐 API server listening on port ${port}`);
//     console.log(`📋 Endpoints available:`);
//     console.log(`   GET /health    - Health check`);
//     console.log(`   GET /clusters  - Active clusters data`);
//     console.log(`   GET /stats     - System statistics`);
//   });

//   server.on('error', (error) => {
//     console.error('❌ API server error:', error.message);
//   });

//   return server;
// }

// module.exports = { startApi };

// const express = require('express');
// const { serializeClusters, getClusterStats } = require('./cluster');
// const cors = require('cors');

// function startApi(port = 3001, startPolling, stopPolling) {
//   const app = express();
  
//   app.use(cors());
//   app.use(express.json());

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

//   app.get('/clusters', async (_req, res) => {
//     try {
//       await startPolling();
      
//       const clusters = serializeClusters();
//       const stats = getClusterStats();
      
//       console.log(`📡 API /clusters request served - Active: ${clusters.length}, Total tracked: ${stats.totalClusters}`);
      
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

//   app.post('/stop-polling', async (_req, res) => {
//     try {
//       stopPolling();
//       console.log('📡 API /stop-polling request served - Polling stopped');
//       res.json({ message: 'Polling stopped successfully' });
//     } catch (error) {
//       console.error('❌ Error stopping polling:', error.message);
//       res.status(500).json({ 
//         error: 'Internal server error', 
//         message: error.message 
//       });
//     }
//   });

//   app.get('/stats', (_req, res) => {
//     const stats = getClusterStats();
//     res.json({
//       ...stats,
//       timestamp: new Date().toISOString(),
//       uptime: process.uptime(),
//       memory: process.memoryUsage(),
//       network: 'mainnet-beta',
//       isPolling: !!pollInterval // Indicate if backend is polling
//     });
//   });

//   const server = app.listen(port, () => {
//     console.log(`🌐 API server listening on port ${port}`);
//     console.log(`📋 Endpoints available:`);
//     console.log(`   GET /health    - Health check`);
//     console.log(`   GET /clusters  - Active clusters data`);
//     console.log(`   POST /stop-polling - Stop backend polling`);
//     console.log(`   GET /stats     - System statistics`);
//   });

//   server.on('error', (error) => {
//     console.error('❌ API server error:', error.message);
//   });

//   return server;
// }

// module.exports = { startApi };

const express = require('express');
const { serializeClusters, getClusterStats } = require('./cluster');
const cors = require('cors');

function startApi(port = 3001, startPolling, stopPolling) {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const stats = getClusterStats();
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      clusters: stats,
      uptime: process.uptime(),
      network: 'mainnet-beta'
    });
  });

  app.get('/clusters', async (_req, res) => {
    try {
      await startPolling();
      
      const clusters = serializeClusters();
      const stats = getClusterStats();
      
      console.log(`📡 API /clusters request served - Active: ${clusters.length}, Total tracked: ${stats.totalClusters}`);
      
      const response = {
        clusters: clusters,
        metadata: {
          total_active: clusters.length,
          total_tracked: stats.totalClusters,
          timestamp: new Date().toISOString(),
          requirements: {
            min_children: 5,
            min_total_sol: 20,
            min_transfer_sol: 1,
            detection_window_sec: 10,
            data_retention_min: 30
          }
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Error serving /clusters:', error.message);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  });

  app.post('/stop-polling', async (_req, res) => {
    try {
      stopPolling();
      console.log('📡 API /stop-polling request served - Polling stopped');
      res.json({ message: 'Polling stopped successfully' });
    } catch (error) {
      console.error('❌ Error stopping polling:', error.message);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  });

  app.get('/stats', (_req, res) => {
    const stats = getClusterStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      network: 'mainnet-beta',
      isPolling: !!pollInterval // Indicate if backend is polling
    });
  });

  const server = app.listen(port, () => {
    console.log(`🌐 API server listening on port ${port}`);
    console.log(`📋 Endpoints available:`);
    console.log(`   GET /health    - Health check`);
    console.log(`   GET /clusters  - Active clusters data`);
    console.log(`   POST /stop-polling - Stop backend polling`);
    console.log(`   GET /stats     - System statistics`);
  });

  server.on('error', (error) => {
    console.error('❌ API server error:', error.message);
  });

  return server;
}

module.exports = { startApi };