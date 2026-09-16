const express = require('express');
const requireModule = require('../middleware/requireModule');
const router = express.Router();
const ctrl = require('../controllers/supplierController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired, requireModule('proveedores'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
