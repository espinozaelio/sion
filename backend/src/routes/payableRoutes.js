const express = require('express');
const requireModule = require('../middleware/requireModule');
const router = express.Router();
const ctrl = require('../controllers/payableController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired, requireModule('cuentas_por_pagar'));

router.get('/', ctrl.list);
router.get('/summary', ctrl.summary);
router.get('/:id', ctrl.getOne);
router.get('/:id/payments', ctrl.getPayments);
router.post('/:id/payments', ctrl.registerPayment);

module.exports = router;
