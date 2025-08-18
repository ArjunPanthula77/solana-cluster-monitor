const express = require('express');
const { serializeClusters } = require('./cluster');
const cors = require('cors');

function startApi(port = 3001) { // Changed to 3001 to avoid conflict with React
  const app = express();

  // Enable CORS for requests from localhost:3000
  app.use(cors());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/clusters', (_req, res) => {
    const clusters = serializeClusters();
    console.log(`API /clusters request served with ${clusters.length} clusters`);
    res.json(clusters);
  });

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

module.exports = { startApi };