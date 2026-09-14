const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.post('/:id/stock-adjustment', ctrl.adjustStock);
router.get('/:id/movements', ctrl.movements);

module.exports = router;
