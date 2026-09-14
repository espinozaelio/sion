const pool = require('../config/db');

async function tiposDocumento(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM tipos_documento ORDER BY codigo ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function codigosTelefonicos(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM codigos_telefonicos ORDER BY codigo ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { tiposDocumento, codigosTelefonicos };
