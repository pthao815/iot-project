const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// Active SSE client response objects
const clients = new Set();

// Poll DB every 5 seconds and push latest readings to all connected clients
setInterval(async () => {
  if (clients.size === 0) return;
  try {
    const [rows] = await pool.query(`
      SELECT sd.data_id, sd.sensor_id, sd.value, sd.recorded_at,
             s.sensor_name, s.sensor_type, s.unit
      FROM sensor_data sd
      JOIN sensors s ON sd.sensor_id = s.sensor_id
      WHERE sd.recorded_at = (
        SELECT MAX(sd2.recorded_at) FROM sensor_data sd2 WHERE sd2.sensor_id = sd.sensor_id
      )
    `);
    const payload = `data: ${JSON.stringify(rows)}\n\n`;
    clients.forEach(client => client.write(payload));
  } catch (err) {
    console.error('SSE poll error:', err.message);
  }
}, 5000);

// GET /api/events — open SSE stream
router.get('/', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // Send heartbeat immediately so the client knows we're connected
  res.write(': connected\n\n');

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

module.exports = router;
