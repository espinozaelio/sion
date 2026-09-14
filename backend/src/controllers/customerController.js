const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');
const { esNumeroTelefonoValido, esNumeroDocumentoValido } = require('../utils/validators');

const SELECT_FIELDS = `
  c.id_cliente AS id, c.nombre AS name, c.es_consumidor_final AS is_final_consumer,
  c.direccion AS address, c.correo AS email, c.creado_en AS created_at,
  c.id_tipo_documento AS document_type_id, td.codigo AS document_type_code,
  td.tipo_persona AS person_type, c.numero_documento AS document_number,
  CASE WHEN td.codigo IS NOT NULL AND c.numero_documento IS NOT NULL
       THEN td.codigo || '-' || c.numero_documento ELSE NULL END AS document_display,
  c.id_codigo_telefonico AS phone_code_id, ct.codigo AS phone_code,
  c.numero_telefono AS phone_number,
  CASE WHEN ct.codigo IS NOT NULL AND c.numero_telefono IS NOT NULL
       THEN ct.codigo || '-' || c.numero_telefono ELSE NULL END AS phone
`;

const JOINS = `
  LEFT JOIN tipos_documento td ON td.id_tipo_documento = c.id_tipo_documento
  LEFT JOIN codigos_telefonicos ct ON ct.id_codigo_telefonico = c.id_codigo_telefonico
`;

function validarDocumentoYTelefono({ document_number, phone_number }) {
  if (document_number && !esNumeroDocumentoValido(document_number)) {
    return 'El número de documento debe tener entre 5 y 10 dígitos, sin letras ni guiones.';
  }
  if (phone_number && !esNumeroTelefonoValido(phone_number)) {
    return 'El número de teléfono debe tener exactamente 7 dígitos (ej. 8326360).';
  }
  return null;
}

async function list(req, res, next) {
  try {
    const { search } = req.query;
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = ['1=1'];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.nombre ILIKE $${params.length} OR c.numero_documento ILIKE $${params.length})`);
    }
    const where = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS total FROM clientes c WHERE ${where}`, params);
    const { rows } = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM clientes c ${JOINS}
       WHERE ${where} ORDER BY c.nombre ASC
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
      `SELECT ${SELECT_FIELDS} FROM clientes c ${JOINS} WHERE c.id_cliente = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      name, document_type_id, document_number, is_final_consumer,
      address, phone_code_id, phone_number, email,
    } = req.body;

    if (!name) return res.status(400).json({ message: 'El nombre es requerido.' });
    const validationError = validarDocumentoYTelefono({ document_number, phone_number });
    if (validationError) return res.status(400).json({ message: validationError });

    const { rows } = await pool.query(
      `INSERT INTO clientes
        (nombre, id_tipo_documento, numero_documento, es_consumidor_final, direccion,
         id_codigo_telefonico, numero_telefono, correo)
       VALUES ($1,$2,$3,COALESCE($4,false),$5,$6,$7,$8)
       RETURNING id_cliente AS id`,
      [name.trim(), document_type_id || null, document_number || null, is_final_consumer,
        address || null, phone_code_id || null, phone_number || null, email || null]
    );
    const created = await pool.query(`SELECT ${SELECT_FIELDS} FROM clientes c ${JOINS} WHERE c.id_cliente = $1`, [rows[0].id]);
    res.status(201).json(created.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name, document_type_id, document_number, is_final_consumer,
      address, phone_code_id, phone_number, email,
    } = req.body;

    const validationError = validarDocumentoYTelefono({ document_number, phone_number });
    if (validationError) return res.status(400).json({ message: validationError });

    const { rows } = await pool.query(
      `UPDATE clientes SET
        nombre = COALESCE($1, nombre),
        id_tipo_documento = $2,
        numero_documento = $3,
        es_consumidor_final = COALESCE($4, es_consumidor_final),
        direccion = $5,
        id_codigo_telefonico = $6,
        numero_telefono = $7,
        correo = $8
       WHERE id_cliente = $9
       RETURNING id_cliente AS id`,
      [name, document_type_id || null, document_number || null, is_final_consumer,
        address || null, phone_code_id || null, phone_number || null, email || null, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });
    const updated = await pool.query(`SELECT ${SELECT_FIELDS} FROM clientes c ${JOINS} WHERE c.id_cliente = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
