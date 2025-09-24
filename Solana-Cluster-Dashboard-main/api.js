
// // const express = require('express');
// // const { serializeClusters, getClusterStats } = require('./cluster');
// // const cors = require('cors');

// // let cachedStats = null;
// // let lastStatsUpdate = 0;
// // const STATS_CACHE_MS = 1000; // Cache stats for 1 second

// // function startApi(port = 3001, startPolling, stopPolling) {
// //   const app = express();
  
// //   app.use(cors());
// //   app.use(express.json());

// //   app.get('/health', (_req, res) => {
// //     const now = Date.now();
// //     if (!cachedStats || now - lastStatsUpdate > STATS_CACHE_MS) {
// //       cachedStats = getClusterStats();
// //       lastStatsUpdate = now;
// //     }
// //     res.json({ 
// //       ok: true, 
// //       timestamp: new Date().toISOString(),
// //       clusters: cachedStats,
// //       uptime: process.uptime(),
// //       network: 'mainnet-beta'
// //     });
// //   });

// //   app.get('/clusters', async (_req, res) => {
// //     try {
// //       await startPolling();
      
// //       const clusters = serializeClusters();
// //       cachedStats = getClusterStats();
// //       lastStatsUpdate = Date.now();
      
// //       console.log(`📡 API /clusters request served - Active: ${clusters.length}, Total tracked: ${cachedStats.totalClusters}`);
      
// //       const response = {
// //         clusters: clusters,
// //         metadata: {
// //           total_active: clusters.length,
// //           total_tracked: cachedStats.totalClusters,
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

// //   app.post('/stop-polling', async (_req, res) => {
// //     try {
// //       stopPolling();
// //       console.log('📡 API /stop-polling request served - Polling stopped');
// //       res.json({ message: 'Polling stopped successfully' });
// //     } catch (error) {
// //       console.error('❌ Error stopping polling:', error.message);
// //       res.status(500).json({ 
// //         error: 'Internal server error', 
// //         message: error.message 
// //       });
// //     }
// //   });

// //   app.get('/stats', (_req, res) => {
// //     const now = Date.now();
// //     if (!cachedStats || now - lastStatsUpdate > STATS_CACHE_MS) {
// //       cachedStats = getClusterStats();
// //       lastStatsUpdate = now;
// //     }
// //     res.json({
// //       ...cachedStats,
// //       timestamp: new Date().toISOString(),
// //       uptime: process.uptime(),
// //       memory: process.memoryUsage(),
// //       network: 'mainnet-beta',
// //       isPolling: !!pollInterval
// //     });
// //   });

// //   const server = app.listen(port, () => {
// //     console.log(`🌐 API server listening on port ${port}`);
// //     console.log(`📋 Endpoints available:`);
// //     console.log(`   GET /health    - Health check`);
// //     console.log(`   GET /clusters  - Active clusters data`);
// //     console.log(`   POST /stop-polling - Stop backend polling`);
// //     console.log(`   GET /stats     - System statistics`);
// //   });

// //   server.on('error', (error) => {
// //     console.error('❌ API server error:', error.message);
// //   });

// //   return server;
// // }

// // module.exports = { startApi };


// // const express = require('express');
// // const cors = require('cors');
// // const compression = require('compression');
// // const { serializeClustersCached, getClusterStats } = require('./cluster');

// // const app = express();
// // app.use(cors());
// // app.use(express.json());
// // app.use(compression());

// // app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// // app.get('/clusters', (req, res) => {
// //   try {
// //     const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
// //     const mode = String(req.query.fields || 'summary');
// //     const all = serializeClustersCached();
// //     const sliced = all.slice(0, limit);
// //     let clusters = sliced;
// //     if (mode === 'summary') {
// //       clusters = sliced.map(c => ({
// //         funding_wallet: c.funding_wallet,
// //         total_sol_funded: c.total_sol_funded,
// //         total_sol_remaining: c.total_sol_remaining,
// //         children: c.children_count,
// //         created_at: c.created_at,
// //         updated_at: c.last_update,
// //         status: c.status,
// //         spend_rate_sol_per_min: c.spend_rate_sol_per_min,
// //       }));
// //     }
// //     const stats = getClusterStats();
// //     res.set('Cache-Control', 'no-store');
// //     res.json({
// //       clusters,
// //       metadata: {
// //         total_active: clusters.length,
// //         total_tracked: stats.totalClusters,
// //         timestamp: new Date().toISOString(),
// //         requirements: {
// //           min_children: 5,
// //           min_total_sol: 20,
// //           min_transfer_sol: 1,
// //           detection_window_sec: 10,
// //           data_retention_min: 30
// //         }
// //       }
// //     });
// //   } catch (error) {
// //     console.error('❌ Error serving /clusters:', error.message);
// //     res.status(500).json({ error: 'Internal server error', message: error.message });
// //   }
// // });

// // app.get('/stats', (_req, res) => res.json(getClusterStats()));

// // function start(port) {
// //   if (!process.env.SERVERLESS) {
// //     app.listen(port, () => console.log(`API listening on :${port}`));
// //   }
// // }

// // module.exports = { start };

// const express = require('express');
// const cors = require('cors');
// const compression = require('compression');
// const { serializeClustersCached, getClusterStats } = require('./cluster');
// const { startPolling } = require('./index');

// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use(compression());

// app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// app.get('/clusters', async (req, res) => {
//   try {
//     await startPolling();
//     const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
//     const mode = String(req.query.fields || 'summary');
//     const all = serializeClustersCached();
//     const sliced = all.slice(0, limit);
//     let clusters = sliced;
//     if (mode === 'summary') {
//       clusters = sliced.map(c => ({
//         funding_wallet: c.funding_wallet,
//         total_sol_funded: c.total_sol_funded,
//         total_sol_remaining: c.total_sol_remaining,
//         children: c.children_count,
//         created_at: c.created_at,
//         updated_at: c.last_update,
//         status: c.status,
//         spend_rate_sol_per_min: c.spend_rate_sol_per_min,
//       }));
//     }
//     const stats = getClusterStats();
//     res.set('Cache-Control', 'no-store');
//     res.json({
//       clusters,
//       metadata: {
//         total_active: clusters.length,
//         total_tracked: stats.totalClusters,
//         timestamp: new Date().toISOString(),
//         requirements: {
//           min_children: 5,
//           min_total_sol: 20,
//           min_transfer_sol: 1,
//           detection_window_sec: 10,
//           data_retention_min: 30
//         }
//       }
//     });
//   } catch (error) {
//     console.error('❌ Error serving /clusters:', error.message);
//     res.status(500).json({ error: 'Internal server error', message: error.message });
//   }
// });

// app.get('/stats', (_req, res) => res.json(getClusterStats()));

// function start(port) {
//   if (!process.env.SERVERLESS) {
//     app.listen(port, () => console.log(`API listening on :${port}`));
//   }
// }

// module.exports = { start };


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

// const express = require('express');
// const { serializeClusters, getClusterStats } = require('./cluster');
// const cors = require('cors');
// const { Pool } = require('pg');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');

// const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// const pool = new Pool({
//   connectionString: "postgresql://cluster_folks:solana-cluster@localhost:5432/people",
// });

// function startApi(port = 3001, startPolling, stopPolling) {
//   const app = express();
  
//   app.use(cors({ origin: "http://localhost:3000", credentials: true }));
//   app.use(express.json());
//   app.use(cookieParser());

//   // 🔹 Utility: auth middleware
//   function authMiddleware(req, res, next) {
//     const token = req.cookies['auth-token'];
//     if (!token) return res.status(401).json({ error: "Not authenticated" });
//     try {
//       const decoded = jwt.verify(token, JWT_SECRET);
//       req.user = decoded;
//       next();
//     } catch {
//       return res.status(401).json({ error: "Invalid token" });
//     }
//   }

//   // 🔹 Signup
//   app.post('/signup', async (req, res) => {
//     const { email, password, solanaAddress } = req.body;
//     if (!email && !solanaAddress) {
//       return res.status(400).json({ error: "Email or Solana address required" });
//     }

//     try {
//       let passwordHash = null;
//       if (password) {
//         passwordHash = await bcrypt.hash(password, 10);
//       }

//       const result = await pool.query(
//         `INSERT INTO users (email, password_hash, solana_address) 
//          VALUES ($1, $2, $3) RETURNING id, email, solana_address`,
//         [email || null, passwordHash, solanaAddress || null]
//       );

//       const user = result.rows[0];
//       const token = jwt.sign({ id: user.id, email: user.email, solanaAddress: user.solana_address }, JWT_SECRET, { expiresIn: "7d" });
//       res.cookie("auth-token", token, { httpOnly: true, sameSite: "lax" });
//       res.json({ user });
//     } catch (err) {
//       console.error("❌ Signup error:", err.message);
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // 🔹 Login
//   app.post('/login', async (req, res) => {
//     const { email, password, solanaAddress } = req.body;

//     try {
//       let user;
//       if (email) {
//         const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
//         user = result.rows[0];
//         if (!user) return res.status(400).json({ error: "User not found" });
//         const match = await bcrypt.compare(password, user.password_hash);
//         if (!match) return res.status(400).json({ error: "Invalid password" });
//       } else if (solanaAddress) {
//         const result = await pool.query("SELECT * FROM users WHERE solana_address = $1", [solanaAddress]);
//         user = result.rows[0];
//         if (!user) return res.status(400).json({ error: "User not found" });
//       } else {
//         return res.status(400).json({ error: "Email+password or Solana address required" });
//       }

//       const token = jwt.sign({ id: user.id, email: user.email, solanaAddress: user.solana_address }, JWT_SECRET, { expiresIn: "7d" });
//       res.cookie("auth-token", token, { httpOnly: true, sameSite: "lax" });
//       res.json({ user });
//     } catch (err) {
//       console.error("❌ Login error:", err.message);
//       res.status(500).json({ error: err.message });
//     }
//   });

//   // 🔹 Logout
//   app.post('/logout', (req, res) => {
//     res.clearCookie("auth-token");
//     res.json({ message: "Logged out successfully" });
//   });

//   // 🔹 Me
//   app.get('/me', authMiddleware, (req, res) => {
//     res.json({ user: req.user });
//   });

//   // ============ YOUR EXISTING ROUTES ============
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
//       network: 'mainnet-beta'
//     });
//   });

//   const server = app.listen(port, () => {
//     console.log(`🌐 API server listening on port ${port}`);
//     console.log(`📋 Endpoints available:`);
//     console.log(`   POST /signup    - Register user`);
//     console.log(`   POST /login     - Login user`);
//     console.log(`   POST /logout    - Logout user`);
//     console.log(`   GET  /me        - Current session user`);
//     console.log(`   GET  /health    - Health check`);
//     console.log(`   GET  /clusters  - Active clusters data`);
//     console.log(`   POST /stop-polling - Stop backend polling`);
//     console.log(`   GET  /stats     - System statistics`);
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
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

const pool = new Pool({
  connectionString: "postgresql://just_for_example_user:Mp5tmt8AeI3n9Ab37IMvUEQKtTrwjiq8@dpg-d396r90dl3ps73almb80-a/just_for_example",
});

// 🔹 Initialize DB tables if not exist
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        solana_address TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created or already exists');
  } catch (err) {
    console.error('❌ Error initializing DB:', err.message);
  }
}

function startApi(port = 3001, startPolling, stopPolling) {
  initDB(); // Call on startup

  const app = express();
  
  // app.use(cors());


  const allowedOrigin = "https://cluster-dashboard-nine.vercel.app"; // your frontend URL

app.use(cors({
  origin: allowedOrigin, // cannot be '*'
  credentials: true,     // allows cookies to be sent
}));

  
  app.use(express.json());
  app.use(cookieParser());

  // 🔹 Utility: auth middleware
  function authMiddleware(req, res, next) {
    const token = req.cookies['auth-token'];
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // 🔹 Signup
  app.post('/signup', async (req, res) => {
    const { email, password, solanaAddress } = req.body;
    if (!email && !solanaAddress) {
      return res.status(400).json({ error: "Email or Solana address required" });
    }
    if (email && !password) {
      return res.status(400).json({ error: "Password required for email signup" });
    }

    try {
      // Check for existing email or solana address
      if (email) {
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: "Email already registered" });
        }
      }
      if (solanaAddress) {
        const existing = await pool.query("SELECT id FROM users WHERE solana_address = $1", [solanaAddress]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: "Solana address already registered" });
        }
      }

      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, solana_address) 
         VALUES ($1, $2, $3) RETURNING id, email, solana_address`,
        [email || null, passwordHash, solanaAddress || null]
      );

      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, solana_address: user.solana_address }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth-token", token, { httpOnly: true, sameSite: "lax" });
      res.json({ user });
    } catch (err) {
      console.error("❌ Signup error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 🔹 Login
  app.post('/login', async (req, res) => {
    const { email, password, solanaAddress } = req.body;
    if (!email && !solanaAddress) {
      return res.status(400).json({ error: "Email+password or Solana address required" });
    }
    if (email && !password) {
      return res.status(400).json({ error: "Password required for email login" });
    }

    try {
      let user;
      if (email) {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        user = result.rows[0];
        if (!user) return res.status(400).json({ error: "User not found" });
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(400).json({ error: "Invalid password" });
      } else if (solanaAddress) {
        const result = await pool.query("SELECT * FROM users WHERE solana_address = $1", [solanaAddress]);
        user = result.rows[0];
        if (!user) return res.status(400).json({ error: "User not found" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, solana_address: user.solana_address }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth-token", token, { httpOnly: true, sameSite: "lax" });
      res.json({ user });
    } catch (err) {
      console.error("❌ Login error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 🔹 Logout
  app.post('/logout', (req, res) => {
    res.clearCookie("auth-token");
    res.json({ message: "Logged out successfully" });
  });

  // 🔹 Me
  app.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });

  // ============ YOUR EXISTING ROUTES ============
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
      network: 'mainnet-beta'
    });
  });

  const server = app.listen(port, () => {
    console.log(`🌐 API server listening on port ${port}`);
    console.log(`📋 Endpoints available:`);
    console.log(`   POST /signup    - Register user`);
    console.log(`   POST /login     - Login user`);
    console.log(`   POST /logout    - Logout user`);
    console.log(`   GET  /me        - Current session user`);
    console.log(`   GET  /health    - Health check`);
    console.log(`   GET  /clusters  - Active clusters data`);
    console.log(`   POST /stop-polling - Stop backend polling`);
    console.log(`   GET  /stats     - System statistics`);
  });

  server.on('error', (error) => {
    console.error('❌ API server error:', error.message);
  });

  return server;
}

module.exports = { startApi };
