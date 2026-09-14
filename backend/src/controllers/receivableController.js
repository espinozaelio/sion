const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Lista facturas a crédito (cuentas por cobrar), con estado de antigüedad calculado.
async function list(req, res, next) {
  try {
    const { status, search } = req.query; // status: 'pendiente' | 'vencida' | 'pagada'
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = ['f.es_credito = true', "f.estado = 'emitida'"];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(f.numero_factura ILIKE $${params.length} OR f.datos_cliente->>'nombre' ILIKE $${params.length})`);
    }
    if (status === 'pagada') {
      conditions.push('f.saldo_pendiente <= 0');
    } else if (status === 'vencida') {
      conditions.push('f.saldo_pendiente > 0 AND f.fecha_vencimiento < CURRENT_DATE');
    } else if (status === 'pendiente') {
      conditions.push('f.saldo_pendiente > 0 AND f.fecha_vencimiento >= CURRENT_DATE');
    }

    const where = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM facturas f WHERE ${where}`,
      params
    );

    const { rows } = await pool.query(
      `SELECT f.id_factura AS id, f.numero_factura AS invoice_number, f.datos_cliente AS customer_snapshot,
              f.total, f.saldo_pendiente AS balance_due, f.fecha_vencimiento AS due_date,
              f.moneda AS currency, f.creado_en AS created_at, f.pagada_en AS paid_at,
              CASE
                WHEN f.saldo_pendiente <= 0 THEN 'pagada'
                WHEN f.fecha_vencimiento < CURRENT_DATE THEN 'vencida'
                ELSE 'pendiente'
              END AS aging_status,
              GREATEST(0, (CURRENT_DATE - f.fecha_vencimiento))::int AS days_overdue
       FROM facturas f
       WHERE ${where}
       ORDER BY f.fecha_vencimiento ASC NULLS LAST
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
      `SELECT f.id_factura AS id, f.numero_factura AS invoice_number, f.datos_cliente AS customer_snapshot,
              f.total, f.saldo_pendiente AS balance_due, f.fecha_vencimiento AS due_date,
              f.moneda AS currency, f.creado_en AS created_at, f.pagada_en AS paid_at, f.estado AS status,
              CASE
                WHEN f.saldo_pendiente <= 0 THEN 'pagada'
                WHEN f.fecha_vencimiento < CURRENT_DATE THEN 'vencida'
                ELSE 'pendiente'
              END AS aging_status,
              GREATEST(0, (CURRENT_DATE - f.fecha_vencimiento))::int AS days_overdue
       FROM facturas f
       WHERE f.id_factura = $1 AND f.es_credito = true`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Cuenta por cobrar no encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0), 0) AS total_pending,
        COUNT(*) FILTER (WHERE saldo_pendiente > 0) AS pending_count,
        COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE), 0) AS total_overdue,
        COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE) AS overdue_count
       FROM facturas WHERE es_credito = true AND estado = 'emitida'`
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
      `SELECT pc.id_pago_cobrar AS id, pc.monto AS amount, pc.metodo_pago AS payment_method,
              pc.referencia AS reference, pc.creado_en AS created_at, u.nombre_completo AS created_by_name
       FROM pagos_por_cobrar pc
       LEFT JOIN usuarios u ON u.id_usuario = pc.id_usuario_creador
       WHERE pc.id_factura = $1 ORDER BY pc.creado_en DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Registra un abono de un cliente contra una factura a crédito.
async function registerPayment(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, payment_method, reference } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'El monto del abono debe ser mayor a cero.' });
    }

    await client.query('BEGIN');

    const { rows: invRows } = await client.query(
      'SELECT * FROM facturas WHERE id_factura = $1 FOR UPDATE',
      [id]
    );
    const invoice = invRows[0];
    if (!invoice) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Factura no encontrada.' });
    }
    if (!invoice.es_credito) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Esta factura no es a crédito.' });
    }
    if (Number(invoice.saldo_pendiente) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Esta factura ya está saldada.' });
    }
    if (Number(amount) > Number(invoice.saldo_pendiente)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `El abono no puede superar el saldo pendiente (${invoice.saldo_pendiente}).` });
    }

    const newBalance = round2(Number(invoice.saldo_pendiente) - Number(amount));

    await client.query(
      `UPDATE facturas SET saldo_pendiente = $1::numeric,
        pagada_en = CASE WHEN $1::numeric <= 0 THEN now() ELSE pagada_en END
       WHERE id_factura = $2`,
      [newBalance, id]
    );

    const { rows: paymentRows } = await client.query(
      `INSERT INTO pagos_por_cobrar (id_factura, monto, metodo_pago, referencia, id_usuario_creador)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, amount, payment_method || 'efectivo', reference || null, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ payment: paymentRows[0], new_balance: newBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { list, getOne, summary, getPayments, registerPayment };
