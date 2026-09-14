const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');
const { esNumeroTelefonoValido, esNumeroDocumentoValido } = require('../utils/validators');

const SELECT_FIELDS = `
  s.id_proveedor AS id, s.nombre AS name, s.nombre_contacto AS contact_name,
  s.direccion AS address, s.correo AS email, s.dias_credito AS payment_terms_days,
  s.requiere_aprobacion_siempre AS always_requires_approval, s.activo AS active, s.creado_en AS created_at,
  s.id_tipo_documento AS document_type_id, td.codigo AS document_type_code, td.tipo_persona AS person_type,
  s.numero_documento AS document_number,
  CASE WHEN td.codigo IS NOT NULL AND s.numero_documento IS NOT NULL
       THEN td.codigo || '-' || s.numero_documento ELSE NULL END AS document_display,
  s.id_codigo_telefonico AS phone_code_id, ct.codigo AS phone_code, s.numero_telefono AS phone_number,
  CASE WHEN ct.codigo IS NOT NULL AND s.numero_telefono IS NOT NULL
       THEN ct.codigo || '-' || s.numero_telefono ELSE NULL END AS phone
`;

const JOINS = `
  LEFT JOIN tipos_documento td ON td.id_tipo_documento = s.id_tipo_documento
  LEFT JOIN codigos_telefonicos ct ON ct.id_codigo_telefonico = s.id_codigo_telefonico
`;

function validar({ document_number, phone_number }) {
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
    const conditions = ['s.activo = true'];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.nombre ILIKE $${params.length} OR s.numero_documento ILIKE $${params.length})`);
    }
    const where = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS total FROM proveedores s WHERE ${where}`, params);
    const { rows } = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM proveedores s ${JOINS}
       WHERE ${where} ORDER BY s.nombre ASC
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
    const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM proveedores s ${JOINS} WHERE s.id_proveedor = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Proveedor no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      name, document_type_id, document_number, contact_name, phone_code_id, phone_number,
      email, address, payment_terms_days, always_requires_approval,
    } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre es requerido.' });
    const validationError = validar({ document_number, phone_number });
    if (validationError) return res.status(400).json({ message: validationError });

    const { rows } = await pool.query(
      `INSERT INTO proveedores
        (nombre, id_tipo_documento, numero_documento, nombre_contacto, id_codigo_telefonico,
         numero_telefono, correo, direccion, dias_credito, requiere_aprobacion_siempre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0),COALESCE($10,false))
       RETURNING id_proveedor AS id`,
      [name.trim(), document_type_id || null, document_number || null, contact_name || null,
        phone_code_id || null, phone_number || null, email || null, address || null,
        payment_terms_days, always_requires_approval]
    );
    const created = await pool.query(`SELECT ${SELECT_FIELDS} FROM proveedores s ${JOINS} WHERE s.id_proveedor = $1`, [rows[0].id]);
    res.status(201).json(created.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name, document_type_id, document_number, contact_name, phone_code_id, phone_number,
      email, address, payment_terms_days, always_requires_approval, active,
    } = req.body;
    const validationError = validar({ document_number, phone_number });
    if (validationError) return res.status(400).json({ message: validationError });

    const { rows } = await pool.query(
      `UPDATE proveedores SET
        nombre = COALESCE($1, nombre),
        id_tipo_documento = $2,
        numero_documento = $3,
        nombre_contacto = $4,
        id_codigo_telefonico = $5,
        numero_telefono = $6,
        correo = $7,
        direccion = $8,
        dias_credito = COALESCE($9, dias_credito),
        requiere_aprobacion_siempre = COALESCE($10, requiere_aprobacion_siempre),
        activo = COALESCE($11, activo)
       WHERE id_proveedor = $12
       RETURNING id_proveedor AS id`,
      [name, document_type_id || null, document_number || null, contact_name || null,
        phone_code_id || null, phone_number || null, email || null, address || null,
        payment_terms_days, always_requires_approval, active, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Proveedor no encontrado.' });
    const updated = await pool.query(`SELECT ${SELECT_FIELDS} FROM proveedores s ${JOINS} WHERE s.id_proveedor = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { rows } = await pool.query(
      'UPDATE proveedores SET activo = false WHERE id_proveedor = $1 RETURNING id_proveedor',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Proveedor no encontrado.' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
