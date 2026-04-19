const express = require('express');
const router  = express.Router();
const { getAll, getOne, patchStatus } = require('../controllers/deviceActionsController');

router.get('/',    getAll);
router.get('/:id', getOne);
router.patch('/:id', patchStatus);

module.exports = router;
