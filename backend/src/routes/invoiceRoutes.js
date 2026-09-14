const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/:id/void', requireRole('admin'), ctrl.voidInvoice);

module.exports = router;
