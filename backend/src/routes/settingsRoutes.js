const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/settingsController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.get);
router.put('/', requireRole('admin'), ctrl.update);
router.post('/refresh-bcv-rate', ctrl.refreshBcvRate);

module.exports = router;
