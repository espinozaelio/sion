const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/receivableController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.list);
router.get('/summary', ctrl.summary);
router.get('/:id', ctrl.getOne);
router.get('/:id/payments', ctrl.getPayments);
router.post('/:id/payments', ctrl.registerPayment);

module.exports = router;
