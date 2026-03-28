const express = require('express');
const router  = express.Router();
const { getLatest, getChart, getAll } = require('../controllers/sensorDataController');

router.get('/latest', getLatest);  // must be before /:id to avoid conflict
router.get('/chart',  getChart);
router.get('/',       getAll);

module.exports = router;
