const pool = require('../db/pool');
const { publishDeviceCommand } = require('../mqtt');

// GET /api/devices — all devices with current status + pending_action_id (null if none)
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

// POST /api/devices/:id/action — toggle device, insert PENDING record, publish MQTT
async function postAction(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id);
    const { action } = req.body;

    if (!['ON', 'OFF'].includes(action)) {
      return res.status(400).json({ error: 'action must be ON or OFF' });
    }

    const [[device]] = await pool.query(
      'SELECT device_id FROM devices WHERE device_id = ?',
      [deviceId]
    );
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    let actionId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE devices SET current_status = ? WHERE device_id = ?',
        [action, deviceId]
      );

      // Resolved to 'SUCCESS' when ESP32 confirms via esp32/led_status (5s timeout on frontend).
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

    // Fire MQTT outside the transaction — returns false if broker is not connected
    const mqtt_published = publishDeviceCommand(deviceId, action);

    if (!mqtt_published) {
      // MQTT broker offline — immediately revert device status and mark action FAILED
      // so the frontend receives a clean "already resolved" state without waiting for timeout
      const conn2 = await pool.getConnection();
      try {
        await conn2.beginTransaction();
        const revertStatus = action === 'ON' ? 'OFF' : 'ON';
        await conn2.query(
          'UPDATE devices SET current_status = ? WHERE device_id = ?',
          [revertStatus, deviceId]
        );
        await conn2.query(
          "UPDATE device_actions SET status = 'FAILED' WHERE action_id = ?",
          [actionId]
        );
        await conn2.commit();
        console.warn(`MQTT offline — action ${actionId} marked FAILED, device ${deviceId} reverted to ${revertStatus}`);
      } catch (err2) {
        await conn2.rollback();
        console.error('MQTT offline compensation failed:', err2.message);
      } finally {
        conn2.release();
      }
    }

    const [[updated]] = await pool.query(
      'SELECT device_id, device_name, current_status FROM devices WHERE device_id = ?',
      [deviceId]
    );

    res.json({ action_id: actionId, device: updated, mqtt_published });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, postAction };
