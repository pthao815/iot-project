require('dotenv').config();
require('./mqtt');
const http    = require('http');
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const pool = require('./db/pool');
const { attachWS } = require('./wsServer');

// On startup, revert any leftover PENDING actions (server killed before 5s timer fired).
pool.query(`
  UPDATE device_actions da
  JOIN devices d ON da.device_id = d.device_id
  SET da.status        = 'FAILED',
      d.current_status = CASE WHEN da.action = 'ON' THEN 'OFF' ELSE 'ON' END
  WHERE UPPER(da.status) = 'PENDING'
`)
  .then(([r]) => { if (r.affectedRows > 0) console.log(`Startup: reverted ${r.affectedRows} stale PENDING action(s)`); })
  .catch(err  => console.error('Startup PENDING cleanup failed:', err.message));

const sensorsRouter       = require('./routes/sensors');
const sensorDataRouter    = require('./routes/sensorData');
const devicesRouter       = require('./routes/devices');
const deviceActionsRouter = require('./routes/deviceActions');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/sensors',        sensorsRouter);
app.use('/api/sensor-data',    sensorDataRouter);
app.use('/api/devices',        devicesRouter);
app.use('/api/device-actions', deviceActionsRouter);

app.use(errorHandler);

const server = http.createServer(app);
attachWS(server);
server.listen(PORT, () => {
  console.log(`IoT API running on http://localhost:${PORT}`);
});
