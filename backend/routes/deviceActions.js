const express = require('express');
const router  = express.Router();
const { getAll } = require('../controllers/deviceActionsController');

router.get('/', getAll);

module.exports = router;
