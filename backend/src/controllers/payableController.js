const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function list(req, res, next) {
  try {
    const { status, search } = req.query; // status: 'pendiente' | 'vencida' | 'pagada'
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = ['1=1'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`p.nombre ILIKE $${params.length}`);
    }
    if (status === 'pagada') {
      conditions.push("cp.estado = 'pagada'");
    } else if (status === 'vencida') {
      conditions.push("cp.estado = 'pendiente' AND cp.fecha_vencimiento < CURRENT_DATE");
    } else if (status === 'pendiente') {
      conditions.push("cp.estado = 'pendiente' AND (cp.fecha_vencimiento >= CURRENT_DATE OR cp.fecha_vencimiento IS NULL)");
    }
    const where = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM cuentas_por_pagar cp JOIN proveedores p ON p.id_proveedor = cp.id_proveedor WHERE ${where}`,
      params
    );
    const { rows } = await pool.query(
      `SELECT cp.id_cuenta_pagar AS id, cp.monto AS amount, cp.saldo AS balance, cp.moneda AS currency,
              cp.fecha_vencimiento AS due_date, cp.estado AS status, cp.creado_en AS created_at,
              cp.id_proveedor AS supplier_id, p.nombre AS supplier_name,
              oc.numero_orden AS po_number,
              CASE
                WHEN cp.estado = 'pagada' THEN 'pagada'
                WHEN cp.fecha_vencimiento < CURRENT_DATE THEN 'vencida'
                ELSE 'pendiente'
              END AS aging_status,
              GREATEST(0, (CURRENT_DATE - cp.fecha_vencimiento))::int AS days_overdue
       FROM cuentas_por_pagar cp
       JOIN proveedores p ON p.id_proveedor = cp.id_proveedor
       LEFT JOIN ordenes_compra oc ON oc.id_orden_compra = cp.id_orden_compra
       WHERE ${where}
       ORDER BY cp.fecha_vencimiento ASC NULLS LAST
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
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT cp.id_cuenta_pagar AS id, cp.monto AS amount, cp.saldo AS balance, cp.moneda AS currency,
              cp.fecha_vencimiento AS due_date, cp.estado AS status, cp.creado_en AS created_at,
              cp.id_proveedor AS supplier_id, p.nombre AS supplier_name, p.dias_credito AS payment_terms_days,
              cp.id_orden_compra AS purchase_order_id, oc.numero_orden AS po_number,
              CASE
                WHEN cp.estado = 'pagada' THEN 'pagada'
                WHEN cp.fecha_vencimiento < CURRENT_DATE THEN 'vencida'
                ELSE 'pendiente'
              END AS aging_status,
              GREATEST(0, (CURRENT_DATE - cp.fecha_vencimiento))::int AS days_overdue
       FROM cuentas_por_pagar cp
       JOIN proveedores p ON p.id_proveedor = cp.id_proveedor
       LEFT JOIN ordenes_compra oc ON oc.id_orden_compra = cp.id_orden_compra
       WHERE cp.id_cuenta_pagar = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Cuenta por pagar no encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
        COALESCE(SUM(saldo) FILTER (WHERE estado = 'pendiente'), 0) AS total_pending,
        COUNT(*) FILTER (WHERE estado = 'pendiente') AS pending_count,
        COALESCE(SUM(saldo) FILTER (WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE), 0) AS total_overdue,
        COUNT(*) FILTER (WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE) AS overdue_count
       FROM cuentas_por_pagar`
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getPayments(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT pp.id_pago_pagar AS id, pp.monto AS amount, pp.metodo_pago AS payment_method,
              pp.referencia AS reference, pp.creado_en AS created_at, u.nombre_completo AS created_by_name
       FROM pagos_por_pagar pp
       LEFT JOIN usuarios u ON u.id_usuario = pp.id_usuario_creador
       WHERE pp.id_cuenta_pagar = $1 ORDER BY pp.creado_en DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Registra un pago nuestro hacia un proveedor contra una cuenta por pagar.
async function registerPayment(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, payment_method, reference } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'El monto del pago debe ser mayor a cero.' });
    }

    await client.query('BEGIN');

    const { rows: apRows } = await client.query(
      'SELECT * FROM cuentas_por_pagar WHERE id_cuenta_pagar = $1 FOR UPDATE',
      [id]
    );
    const payable = apRows[0];
    if (!payable) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cuenta por pagar no encontrada.' });
    }
    if (payable.estado === 'pagada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Esta cuenta ya está saldada.' });
    }
    if (Number(amount) > Number(payable.saldo)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `El pago no puede superar el saldo pendiente (${payable.saldo}).` });
    }

    const newBalance = round2(Number(payable.saldo) - Number(amount));
    const newStatus = newBalance <= 0 ? 'pagada' : 'pendiente';

    await client.query(
      `UPDATE cuentas_por_pagar SET saldo = $1, estado = $2 WHERE id_cuenta_pagar = $3`,
      [newBalance, newStatus, id]
    );

    const { rows: paymentRows } = await client.query(
      `INSERT INTO pagos_por_pagar (id_cuenta_pagar, monto, metodo_pago, referencia, id_usuario_creador)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, amount, payment_method || 'efectivo', reference || null, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ payment: paymentRows[0], new_balance: newBalance, status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { list, getOne, summary, getPayments, registerPayment };
