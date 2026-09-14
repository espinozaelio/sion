const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son requeridos.' });
    }

    const { rows } = await pool.query(
      'SELECT id_usuario, nombre_completo, correo, contrasena_hash, rol, activo FROM usuarios WHERE correo = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || !user.activo) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const validPassword = await bcrypt.compare(password, user.contrasena_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const payload = {
      id: user.id_usuario,
      email: user.correo,
      full_name: user.nombre_completo,
      role: user.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({ token, user: payload });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

// Paso 1 de "olvidé mi contraseña": genera un token de un solo uso.
// No hay servicio de correo configurado, así que el token se devuelve
// directamente en la respuesta (en producción real se enviaría por email).
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'El correo es requerido.' });

    const { rows } = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1 AND activo = true',
      [email.toLowerCase().trim()]
    );

    // Respuesta genérica para no revelar si el correo existe o no.
    const generic = { message: 'Si el correo existe, se generó un enlace de restablecimiento.' };
    if (!rows[0]) return res.json(generic);

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutos

    await pool.query(
      `INSERT INTO restablecimientos_contrasena (id_usuario, token, expira_en)
       VALUES ($1, $2, $3)`,
      [rows[0].id_usuario, token, expiresAt]
    );

    // Como no hay envío de correo real configurado, devolvemos el token
    // para que el frontend pueda mostrarlo (o construir el link) directamente.
    res.json({ ...generic, reset_token: token, expires_at: expiresAt });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ message: 'Token y nueva contraseña son requeridos.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM restablecimientos_contrasena
       WHERE token = $1 AND usado = false AND expira_en > now()`,
      [token]
    );
    const reset = rows[0];
    if (!reset) {
      return res.status(400).json({ message: 'El enlace de restablecimiento es inválido o expiró.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE usuarios SET contrasena_hash = $1 WHERE id_usuario = $2', [hash, reset.id_usuario]);
    await pool.query('UPDATE restablecimientos_contrasena SET usado = true WHERE id_restablecimiento = $1', [reset.id_restablecimiento]);

    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, forgotPassword, resetPassword };
