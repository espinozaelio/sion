const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categoryController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
