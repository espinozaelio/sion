const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired, requireRole('admin'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/reset-link', ctrl.generateResetLink);
router.delete('/:id', ctrl.remove);

module.exports = router;
