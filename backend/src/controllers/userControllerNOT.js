const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

async function list(req, res, next) {
  try {
    const { search } = req.query;
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = ['1=1'];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nombre_completo ILIKE $${params.length} OR correo ILIKE $${params.length})`);
    }
    const where = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS total FROM usuarios WHERE ${where}`, params);
    const { rows } = await pool.query(
      `SELECT id_usuario, nombre_completo, correo, rol, activo, creado_en
       FROM usuarios WHERE ${where} ORDER BY creado_en DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    res.json(buildPaginatedResponse(rows, countRows[0].total, page, pageSize));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id_usuario, nombre_completo, correo, rol, activo, creado_en FROM usuarios WHERE id_usuario = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol)
       VALUES ($1,$2,$3,COALESCE($4,'vendedor'))
       RETURNING id_usuario, nombre_completo, correo, rol, activo, creado_en`,
      [full_name.trim(), email.toLowerCase().trim(), hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, email, role, active, password } = req.body;

    let passwordHash = null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const { rows } = await pool.query(
      `UPDATE usuarios SET
        nombre_completo = COALESCE($1, nombre_completo),
        correo = COALESCE($2, correo),
        rol = COALESCE($3, rol),
        activo = COALESCE($4, activo),
        contrasena_hash = COALESCE($5, contrasena_hash)
       WHERE id_usuario = $6
       RETURNING id_usuario, nombre_completo, correo, rol, activo, creado_en`,
      [full_name, email ? email.toLowerCase().trim() : null, role, active, passwordHash, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Elimina el usuario definitivamente. Solo accesible por administradores (ver userRoutes.js).
async function remove(req, res, next) {
  try {
    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }

    const { rows: targetRows } = await pool.query('SELECT rol FROM usuarios WHERE id_usuario = $1', [id]);
    if (!targetRows[0]) return res.status(404).json({ message: 'Usuario no encontrado.' });

    if (targetRows[0].rol === 'admin') {
      const { rows: adminCountRows } = await pool.query(
        "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin' AND activo = true"
      );
      if (Number(adminCountRows[0].total) <= 1) {
        return res.status(400).json({ message: 'No puedes eliminar al único administrador activo del sistema.' });
      }
    }

    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        message: 'Este usuario tiene historial de operaciones (facturas, compras, pagos, etc.) y no se puede eliminar. Puedes desactivarlo en su lugar.',
      });
    }
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
