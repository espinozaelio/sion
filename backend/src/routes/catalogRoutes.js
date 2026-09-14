const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/catalogController');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.get('/tipos-documento', ctrl.tiposDocumento);
router.get('/codigos-telefonicos', ctrl.codigosTelefonicos);

module.exports = router;
