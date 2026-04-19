const pool = require('../db/pool');

// GET /api/sensor-data/latest — most recent reading per sensor
async function getLatest(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT sd.data_id, sd.sensor_id, sd.value, sd.recorded_at,
             s.sensor_name, s.sensor_type, s.unit
      FROM sensor_data sd
      JOIN sensors s ON sd.sensor_id = s.sensor_id
      WHERE sd.recorded_at = (
        SELECT MAX(sd2.recorded_at)
        FROM sensor_data sd2
        WHERE sd2.sensor_id = sd.sensor_id
      )
      ORDER BY s.sensor_id
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/sensor-data/chart — last N readings (for area charts)
async function getChart(req, res, next) {
  try {
    const sensorId = req.query.sensor_id ? parseInt(req.query.sensor_id) : null;
    const limit    = Math.min(50, parseInt(req.query.limit) || 24);

    const params = [];
    let where = '1=1';
    if (sensorId) {
      where += ' AND sd.sensor_id = ?';
      params.push(sensorId);
    }

    const [rows] = await pool.query(
      `SELECT sd.recorded_at, sd.value, s.sensor_name, s.sensor_type, s.unit
       FROM sensor_data sd
       JOIN sensors s ON sd.sensor_id = s.sensor_id
       WHERE ${where}
       ORDER BY sd.recorded_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    // Return chronological order for charts
    res.json(rows.reverse());
  } catch (err) {
    next(err);
  }
}

// GET /api/sensor-data — paginated list with optional filters + sort
async function getAll(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 10);
    const offset   = (page - 1) * limit;
    const sensorId = req.query.sensor_id ? parseInt(req.query.sensor_id) : null;
    const search   = req.query.search ? `%${req.query.search}%` : null;

    // Sort — whitelist to prevent SQL injection
    const sortMap = {
      data_id:     'sd.data_id',
      value:       'sd.value',
      recorded_at: 'sd.recorded_at',
    };
    const sortCol = sortMap[req.query.sort_key] || 'sd.recorded_at';
    const sortDir = req.query.sort_dir === 'asc' ? 'ASC' : 'DESC';

    const params = [];
    let where = '1=1';

    if (sensorId) {
      where += ' AND sd.sensor_id = ?';
      params.push(sensorId);
    }
    if (search) {
      // Search sensor name/type/unit OR exact date-time in Vietnamese format (HH:mm:ss D/M/YYYY)
      where += ` AND (
        s.sensor_name LIKE ?
        OR s.sensor_type LIKE ?
        OR s.unit LIKE ?
        OR DATE_FORMAT(sd.recorded_at, '%H:%i:%s %e/%c/%Y') LIKE ?
      )`;
      params.push(search, search, search, search);
    }

    const [rows] = await pool.query(
      `SELECT sd.data_id, sd.sensor_id, sd.value, sd.recorded_at,
              s.sensor_name, s.sensor_type, s.unit
       FROM sensor_data sd
       JOIN sensors s ON sd.sensor_id = s.sensor_id
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM sensor_data sd
       JOIN sensors s ON sd.sensor_id = s.sensor_id
       WHERE ${where}`,
      params
    );

    res.json({
      data:       rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLatest, getChart, getAll };
