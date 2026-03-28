const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

// GET /api/sensors — list all sensor definitions
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT sensor_id, sensor_name, sensor_type, unit FROM sensors ORDER BY sensor_id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
