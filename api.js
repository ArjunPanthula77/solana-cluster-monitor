// api.js
const express = require('express');
const { serializeClusters } = require('./cluster');

function startApi(port = 3000) {
  const app = express();

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