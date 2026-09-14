const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.get('/summary', ctrl.summary);
router.get('/sales-by-day', ctrl.salesByDay);

module.exports = router;
