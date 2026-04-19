const pool = require('../db/pool');
const { publishDeviceCommand } = require('../mqtt');

async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT d.device_id, d.device_name, d.current_status, d.created_at,
         (SELECT da.action_id FROM device_actions da
          WHERE da.device_id = d.device_id AND da.status = 'PENDING'
          ORDER BY da.action_time DESC LIMIT 1) AS pending_action_id
       FROM devices d ORDER BY d.device_id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function postAction(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id);
    const { action } = req.body;

    if (!['ON', 'OFF'].includes(action)) {
      return res.status(400).json({ error: 'action must be ON or OFF' });
    }

    let actionId;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // ❗ CHỈ insert PENDING — KHÔNG update device
      const [result] = await conn.query(
        'INSERT INTO device_actions (device_id, action, status, action_time) VALUES (?, ?, ?, NOW())',
        [deviceId, action, 'PENDING']
      );

      actionId = result.insertId;

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const mqtt_published = publishDeviceCommand(deviceId, action);

    res.json({ action_id: actionId, mqtt_published });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, postAction };