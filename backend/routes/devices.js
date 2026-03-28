const express = require('express');
const router  = express.Router();
const { getAll, postAction } = require('../controllers/devicesController');

router.get('/',              getAll);
router.post('/:id/action',   postAction);

module.exports = router;
