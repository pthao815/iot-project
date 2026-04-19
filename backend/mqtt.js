if (topic === 'esp32/led_status') {
  try {
    const payload = JSON.parse(message.toString());

    for (const [key, value] of Object.entries(payload)) {
      const match = key.match(/^led(\d+)$/i);
      if (!match) continue;

      const deviceId = parseInt(match[1]);
      const newStatus = value ? 'ON' : 'OFF';

      // ✅ update device khi confirm
      await pool.query(
        'UPDATE devices SET current_status = ? WHERE device_id = ?',
        [newStatus, deviceId]
      );

      await pool.query(
        `UPDATE device_actions SET status = 'SUCCESS'
         WHERE action_id = (
           SELECT action_id FROM (
             SELECT action_id FROM device_actions
             WHERE device_id = ? AND status = 'PENDING'
             ORDER BY action_time DESC
             LIMIT 1
           ) AS sub
         )`,
        [deviceId]
      );

      broadcast({ type: 'device_confirmed', device_id: deviceId });
    }
  } catch (err) {
    console.error(err);
  }
}