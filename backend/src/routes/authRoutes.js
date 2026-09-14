const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, me, forgotPassword, resetPassword } = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// Limita intentos de recuperación de contraseña: evita que alguien pruebe
// muchos correos (enumeración de cuentas) o muchos tokens (fuerza bruta).
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' },
});

router.post('/login', login);
router.get('/me', authRequired, me);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

module.exports = router;
