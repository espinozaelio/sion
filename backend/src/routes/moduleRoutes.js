const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/moduleController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.list);
router.put('/:clave', requireRole('admin'), ctrl.update);

module.exports = router;
