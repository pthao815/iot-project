const pool = require('../db/pool');

// GET /api/device-actions — paginated, filterable by device/action/status
async function getAll(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 10);
    const offset   = (page - 1) * limit;
    const deviceId = req.query.device_id ? parseInt(req.query.device_id) : null;
    const action   = req.query.action  || null;
    const status   = req.query.status  || null;
    const search   = req.query.search  ? `%${req.query.search}%` : null;

    const params = [];
    let where = '1=1';

    if (deviceId) { where += ' AND da.device_id = ?'; params.push(deviceId); }
    if (action)   { where += ' AND da.action = ?';    params.push(action); }
    if (status)   { where += ' AND da.status = ?';    params.push(status); }
    if (search)   { where += ' AND d.device_name LIKE ?'; params.push(search); }

    const [rows] = await pool.query(
      `SELECT da.action_id, da.device_id, da.action, da.status, da.action_time,
              d.device_name
       FROM device_actions da
       JOIN devices d ON da.device_id = d.device_id
       WHERE ${where}
       ORDER BY da.action_time DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM device_actions da
       JOIN devices d ON da.device_id = d.device_id
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

module.exports = { getAll };
