require('dotenv').config();
const mqtt = require('mqtt');
const pool = require('./db/pool');
const { broadcast } = require('./wsServer');

const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1884';
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

const client = mqtt.connect(BROKER, {
  username: MQTT_USER,
  password: MQTT_PASS,
});

client.on('connect', () => {
  console.log('MQTT connected to', BROKER);
  // Arduino publishes sensor readings here
  client.subscribe('esp32/sensor_data');
  // Arduino publishes LED feedback here
  client.subscribe('esp32/led_status');
});

client.on('error', (err) => {
  console.error('MQTT error:', err.message);
});

// Map Arduino JSON keys → sensor_type keyword to look up sensor_id in DB
const SENSOR_MAP = {
  temperature: 'temp',
  humidity:    'hum',
  lux:         'light',
};

// Cache sensor_id lookup so we don't query sensors table on every MQTT message
let sensorCache = null;
async function getSensorCache() {
  if (sensorCache) return sensorCache;
  const [rows] = await pool.query('SELECT sensor_id, sensor_type FROM sensors');
  sensorCache = {};
  for (const row of rows) {
    for (const [, typeKeyword] of Object.entries(SENSOR_MAP)) {
      if (row.sensor_type.toLowerCase().includes(typeKeyword)) {
        sensorCache[typeKeyword] = row.sensor_id;
      }
    }
  }
  return sensorCache;
}

client.on('message', async (topic, message) => {
  if (topic === 'esp32/sensor_data') {
    try {
      const payload = JSON.parse(message.toString());
      // payload: { temperature, humidity, lux, led1, led2, led3 }

      const cache = await getSensorCache();

      // Build all inserts in one query instead of 3 sequential round-trips
      const inserts = [];
      for (const [key, typeKeyword] of Object.entries(SENSOR_MAP)) {
        const value = payload[key];
        if (value === undefined || value === null) continue;
        const sensorId = cache[typeKeyword];
        if (!sensorId) { console.warn(`No sensor cached for: ${typeKeyword}`); continue; }
        inserts.push([sensorId, value]);
      }

      if (inserts.length > 0) {
        await pool.query(
          'INSERT INTO sensor_data (sensor_id, value, recorded_at) VALUES ?',
          [inserts.map(([sensorId, value]) => [sensorId, value, new Date()])]
        );
      }

      console.log(`Sensor data saved: temp=${payload.temperature} hum=${payload.humidity} lux=${payload.lux}`);

      // Broadcast latest readings — use per-sensor MAX via JOIN instead of correlated subquery
      const [latest] = await pool.query(`
        SELECT sd.data_id, sd.sensor_id, sd.value, sd.recorded_at,
               s.sensor_name, s.sensor_type, s.unit
        FROM sensor_data sd
        JOIN sensors s ON sd.sensor_id = s.sensor_id
        JOIN (
          SELECT sensor_id, MAX(data_id) AS max_id FROM sensor_data GROUP BY sensor_id
        ) mx ON sd.sensor_id = mx.sensor_id AND sd.data_id = mx.max_id
      `);
      broadcast({ type: 'sensor_data', data: latest });
    } catch (err) {
      console.error('MQTT sensor_data error:', err.message);
    }
  }

  if (topic === 'esp32/led_status') {
    // ESP32 sends { led1: true/false, led2: true/false, ... } confirming the command was applied
    try {
      const payload = JSON.parse(message.toString());
      for (const [key] of Object.entries(payload)) {
        const match = key.match(/^led(\d+)$/i);
        if (!match) continue;
        const deviceId = parseInt(match[1]);

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
        console.log(`LED ${key} confirmed by hardware → action marked SUCCESS`);
        broadcast({ type: 'device_confirmed', device_id: deviceId });
      }
    } catch (err) {
      console.error('LED status handler error:', err.message);
      console.log('LED feedback (raw):', message.toString());
    }
  }
});

// Map device_id (DB) → Arduino JSON key
// device_id 1 → led1, device_id 2 → led2, device_id 3 → led3
// Returns true if broker is connected and command was published, false otherwise
function publishDeviceCommand(deviceId, action) {
  if (!client.connected) {
    console.warn(`MQTT not connected — skipping command for device ${deviceId}`);
    return false;
  }
  const ledKey = `led${deviceId}`;
  const payload = JSON.stringify({ [ledKey]: action === 'ON' });
  client.publish('esp32/led_cmd', payload);
  console.log(`MQTT publish esp32/led_cmd → ${payload}`);
  return true;
}

module.exports = { publishDeviceCommand };
