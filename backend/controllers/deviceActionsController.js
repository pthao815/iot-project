const pool = require('../db/pool');

// GET /api/device-actions — paginated, filterable by device/action/status + sort
async function getAll(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 10);
    const offset   = (page - 1) * limit;
    const deviceId = req.query.device_id ? parseInt(req.query.device_id) : null;
    const action   = req.query.action  || null;
    const status   = req.query.status  || null;
    const search   = req.query.search  ? `%${req.query.search}%` : null;

    // Sort — whitelist to prevent SQL injection
    const sortMap = {
      action_id:   'da.action_id',
      action_time: 'da.action_time',
    };
    const sortCol = sortMap[req.query.sort_key] || 'da.action_time';
    const sortDir = req.query.sort_dir === 'asc' ? 'ASC' : 'DESC';

    const params = [];
    let where = '1=1';

    if (deviceId) { where += ' AND da.device_id = ?'; params.push(deviceId); }
    if (action)   { where += ' AND da.action = ?';    params.push(action); }
    if (status)   { where += ' AND da.status = UPPER(?)'; params.push(status); }
    if (search) {
      where += ` AND (
        d.device_name LIKE ?
        OR DATE_FORMAT(da.action_time, '%H:%i:%s %e/%c/%Y') LIKE ?
      )`;
      params.push(search, search);
    }

    const [rows] = await pool.query(
      `SELECT da.action_id, da.device_id, da.action, da.status, da.action_time,
              d.device_name
       FROM device_actions da
       JOIN devices d ON da.device_id = d.device_id
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir}
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

// PATCH /api/device-actions/:id — resolve a PENDING action
// status 'success': action confirmed by hardware — device stays at target
// status 'failed':  no confirmation — device reverts to opposite of attempted action
// If action is already resolved (not PENDING), returns early with no changes
async function patchStatus(req, res, next) {
  try {
    const actionId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['success', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'status must be success or failed' });
    }

    const [[action]] = await pool.query(
      'SELECT * FROM device_actions WHERE action_id = ?',
      [actionId]
    );
    if (!action) return res.status(404).json({ error: 'Action not found' });

    // Already resolved by MQTT or another call — do nothing
    if (action.status !== 'PENDING') {
      return res.json({ action_id: actionId, status: action.status, changed: false });
    }

    if (status === 'failed') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const revertStatus = action.action === 'ON' ? 'OFF' : 'ON';
        await conn.query(
          'UPDATE devices SET current_status = ? WHERE device_id = ?',
          [revertStatus, action.device_id]
        );
        await conn.query(
          "UPDATE device_actions SET status = 'FAILED' WHERE action_id = ?",
          [actionId]
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      await pool.query(
        "UPDATE device_actions SET status = 'SUCCESS' WHERE action_id = ?",
        [actionId]
      );
    }

    res.json({ action_id: actionId, status, changed: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/device-actions/:id — single action (used by frontend to poll pending status)
async function getOne(req, res, next) {
  try {
    const actionId = parseInt(req.params.id);
    const [[action]] = await pool.query(
      `SELECT da.action_id, da.device_id, da.action, da.status, da.action_time, d.device_name
       FROM device_actions da
       JOIN devices d ON da.device_id = d.device_id
       WHERE da.action_id = ?`,
      [actionId]
    );
    if (!action) return res.status(404).json({ error: 'Action not found' });
    res.json(action);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getOne, patchStatus };
