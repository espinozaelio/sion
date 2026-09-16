const pool = require('../config/db');

// Cualquier usuario autenticado puede ver el estado de los módulos
// (el frontend lo usa para decidir qué mostrar en el menú).
async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT clave, nombre, descripcion, activo FROM modulos_sistema ORDER BY nombre ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Solo administradores pueden cambiar el estado (ver requireRole('admin') en la ruta).
async function update(req, res, next) {
  try {
    const { clave } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'El campo "active" debe ser true o false.' });
    }

    const { rows } = await pool.query(
      `UPDATE modulos_sistema SET activo = $1, actualizado_en = now()
       WHERE clave = $2
       RETURNING clave, nombre, descripcion, activo`,
      [active, clave]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Módulo no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, update };
