require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const sensorsRouter      = require('./routes/sensors');
const sensorDataRouter   = require('./routes/sensorData');
const devicesRouter      = require('./routes/devices');
const deviceActionsRouter = require('./routes/deviceActions');
const eventsRouter       = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/sensors',        sensorsRouter);
app.use('/api/sensor-data',    sensorDataRouter);
app.use('/api/devices',        devicesRouter);
app.use('/api/device-actions', deviceActionsRouter);
app.use('/api/events',         eventsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`IoT API running on http://localhost:${PORT}`);
});
