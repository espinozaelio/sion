const pool = require('../config/db');

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id_categoria AS id, nombre AS name, creado_en AS created_at FROM categorias ORDER BY nombre ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre es requerido.' });
    const { rows } = await pool.query(
      'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id_categoria AS id, nombre AS name',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
