const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/purchaseOrderController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/approve', requireRole('admin'), ctrl.approve);
router.post('/:id/receive', ctrl.receive);
router.post('/:id/cancel', ctrl.cancel);

module.exports = router;
