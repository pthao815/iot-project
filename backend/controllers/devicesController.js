const pool = require('../db/pool');

// GET /api/devices — all devices with current status
async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT device_id, device_name, current_status, created_at FROM devices ORDER BY device_id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/devices/:id/action — toggle device and log to device_actions
async function postAction(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id);
    const { action } = req.body;

    if (!['ON', 'OFF'].includes(action)) {
      return res.status(400).json({ error: 'action must be ON or OFF' });
    }

    // Check device exists
    const [[device]] = await pool.query(
      'SELECT device_id FROM devices WHERE device_id = ?',
      [deviceId]
    );
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE devices SET current_status = ? WHERE device_id = ?',
        [action, deviceId]
      );

      const [result] = await conn.query(
        'INSERT INTO device_actions (device_id, action, status, action_time) VALUES (?, ?, ?, NOW())',
        [deviceId, action, action]
      );

      await conn.commit();

      const [[updated]] = await conn.query(
        'SELECT device_id, device_name, current_status FROM devices WHERE device_id = ?',
        [deviceId]
      );

      res.json({ action_id: result.insertId, device: updated });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, postAction };
