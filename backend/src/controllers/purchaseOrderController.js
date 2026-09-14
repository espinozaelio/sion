const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (num, size) => String(num).padStart(size, '0');

async function list(req, res, next) {
  try {
    const { status, supplier_id } = req.query;
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = ['1=1'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`oc.estado = $${params.length}`);
    }
    if (supplier_id) {
      params.push(supplier_id);
      conditions.push(`oc.id_proveedor = $${params.length}`);
    }
    const where = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM ordenes_compra oc WHERE ${where}`,
      params
    );
    const { rows } = await pool.query(
      `SELECT oc.id_orden_compra AS id, oc.numero_orden, oc.estado AS status, oc.moneda AS currency,
              oc.subtotal, oc.total, oc.es_credito AS is_credit, oc.creado_en AS created_at,
              oc.id_proveedor AS supplier_id, p.nombre AS supplier_name
       FROM ordenes_compra oc
       JOIN proveedores p ON p.id_proveedor = oc.id_proveedor
       WHERE ${where}
       ORDER BY oc.creado_en DESC
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
    const { rows: poRows } = await pool.query(
      `SELECT oc.id_orden_compra AS id, oc.numero_orden, oc.estado AS status, oc.moneda AS currency,
              oc.subtotal, oc.total, oc.es_credito AS is_credit, oc.notas AS notes,
              oc.aprobada_en AS approved_at, oc.recibida_en AS received_at, oc.cancelada_en AS cancelled_at,
              oc.creado_en AS created_at, oc.id_proveedor AS supplier_id,
              p.nombre AS supplier_name, p.dias_credito AS payment_terms_days,
              ru.nombre_completo AS requested_by_name, au.nombre_completo AS approved_by_name
       FROM ordenes_compra oc
       JOIN proveedores p ON p.id_proveedor = oc.id_proveedor
       LEFT JOIN usuarios ru ON ru.id_usuario = oc.id_usuario_solicitante
       LEFT JOIN usuarios au ON au.id_usuario = oc.id_usuario_aprobador
       WHERE oc.id_orden_compra = $1`,
      [id]
    );
    if (!poRows[0]) return res.status(404).json({ message: 'Orden de compra no encontrada.' });

    const { rows: items } = await pool.query(
      `SELECT id_detalle_orden AS id, id_producto AS product_id, nombre_producto AS product_name,
              cantidad AS quantity, costo_unitario AS unit_cost, total_linea AS line_total
       FROM detalle_ordenes_compra WHERE id_orden_compra = $1 ORDER BY id_detalle_orden`,
      [id]
    );
    const { rows: payable } = await pool.query(
      `SELECT id_cuenta_pagar AS id, monto AS amount, saldo AS balance, moneda AS currency,
              fecha_vencimiento AS due_date, estado AS status
       FROM cuentas_por_pagar WHERE id_orden_compra = $1`,
      [id]
    );

    res.json({ ...poRows[0], items, payable: payable[0] || null });
  } catch (err) {
    next(err);
  }
}

// Crea la orden de compra en estado "borrador".
async function create(req, res, next) {
  try {
    const { supplier_id, currency, is_credit, notes, items } = req.body;

    if (!supplier_id) return res.status(400).json({ message: 'Debes seleccionar un proveedor.' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'La orden debe tener al menos un producto.' });
    }

    const { rows: settingsRows } = await pool.query(
      'SELECT * FROM configuracion_empresa WHERE id = 1 FOR UPDATE'
    );
    const settings = settingsRows[0];

    let subtotal = 0;
    const lineItems = items.map((it) => {
      const lineTotal = round2(Number(it.unit_cost) * Number(it.quantity));
      subtotal += lineTotal;
      return { ...it, line_total: lineTotal };
    });
    const total = round2(subtotal);

    const poNumber = `${settings.prefijo_orden_compra}-${pad(settings.siguiente_numero_orden_compra, 6)}`;

    const { rows } = await pool.query(
      `INSERT INTO ordenes_compra (numero_orden, id_proveedor, moneda, subtotal, total, es_credito, notas, id_usuario_solicitante)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id_orden_compra AS id, numero_orden, estado AS status, total, es_credito AS is_credit`,
      [poNumber, supplier_id, currency || 'VES', subtotal, total, !!is_credit, notes || null, req.user.id]
    );
    const po = rows[0];

    for (const li of lineItems) {
      await pool.query(
        `INSERT INTO detalle_ordenes_compra (id_orden_compra, id_producto, nombre_producto, cantidad, costo_unitario, total_linea)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [po.id, li.product_id || null, li.product_name, li.quantity, li.unit_cost, li.line_total]
      );
    }

    await pool.query(
      'UPDATE configuracion_empresa SET siguiente_numero_orden_compra = siguiente_numero_orden_compra + 1 WHERE id = 1'
    );

    res.status(201).json({ ...po, items: lineItems });
  } catch (err) {
    next(err);
  }
}

// Envía la orden a flujo: aprobación automática si no la requiere, o pendiente de aprobación si sí.
async function submit(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: poRows } = await pool.query(
      `SELECT oc.*, p.requiere_aprobacion_siempre FROM ordenes_compra oc
       JOIN proveedores p ON p.id_proveedor = oc.id_proveedor WHERE oc.id_orden_compra = $1`,
      [id]
    );
    const po = poRows[0];
    if (!po) return res.status(404).json({ message: 'Orden de compra no encontrada.' });
    if (po.estado !== 'borrador') {
      return res.status(400).json({ message: 'Solo se puede enviar una orden en estado borrador.' });
    }

    const { rows: settingsRows } = await pool.query('SELECT umbral_aprobacion_compra FROM configuracion_empresa WHERE id = 1');
    const threshold = Number(settingsRows[0].umbral_aprobacion_compra);
    const requiresApproval = po.requiere_aprobacion_siempre || Number(po.total) > threshold;

    let rows;
    if (requiresApproval) {
      ({ rows } = await pool.query(
        `UPDATE ordenes_compra SET estado = 'pendiente_aprobacion' WHERE id_orden_compra = $1 RETURNING *`,
        [id]
      ));
    } else {
      ({ rows } = await pool.query(
        `UPDATE ordenes_compra SET estado = 'aprobada', id_usuario_aprobador = $1, aprobada_en = now()
         WHERE id_orden_compra = $2 RETURNING *`,
        [req.user.id, id]
      ));
    }

    res.json({
      requires_approval: requiresApproval,
      message: requiresApproval
        ? 'La orden requiere aprobación por el monto o el proveedor.'
        : 'La orden fue aprobada automáticamente.',
      purchase_order: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE ordenes_compra SET estado = 'aprobada', id_usuario_aprobador = $1, aprobada_en = now()
       WHERE id_orden_compra = $2 AND estado = 'pendiente_aprobacion' RETURNING *`,
      [req.user.id, id]
    );
    if (!rows[0]) {
      return res.status(400).json({ message: 'La orden no está pendiente de aprobación.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Recibe la mercancía: sube inventario, actualiza costo y genera cuenta por pagar si es a crédito.
async function receive(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const { rows: poRows } = await client.query(
      'SELECT * FROM ordenes_compra WHERE id_orden_compra = $1 FOR UPDATE',
      [id]
    );
    const po = poRows[0];
    if (!po) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Orden de compra no encontrada.' });
    }
    if (po.estado !== 'aprobada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Solo se puede recibir una orden ya aprobada.' });
    }

    const { rows: items } = await client.query(
      'SELECT * FROM detalle_ordenes_compra WHERE id_orden_compra = $1',
      [id]
    );

    for (const item of items) {
      if (item.id_producto) {
        await client.query(
          'UPDATE productos SET cantidad_stock = cantidad_stock + $1, precio_costo = $2, actualizado_en = now() WHERE id_producto = $3',
          [item.cantidad, item.costo_unitario, item.id_producto]
        );
        await client.query(
          `INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, motivo, id_orden_compra_referencia, id_usuario_creador)
           VALUES ($1, 'entrada', $2, $3, $4, $5)`,
          [item.id_producto, item.cantidad, `Recepción orden de compra ${po.numero_orden}`, po.id_orden_compra, req.user.id]
        );
      }
    }

    await client.query(
      `UPDATE ordenes_compra SET estado = 'recibida', recibida_en = now() WHERE id_orden_compra = $1`,
      [id]
    );

    let payable = null;
    if (po.es_credito) {
      const { rows: supplierRows } = await client.query('SELECT dias_credito FROM proveedores WHERE id_proveedor = $1', [po.id_proveedor]);
      const termDays = supplierRows[0]?.dias_credito || 0;
      const { rows: payableRows } = await client.query(
        `INSERT INTO cuentas_por_pagar (id_orden_compra, id_proveedor, monto, saldo, moneda, fecha_vencimiento)
         VALUES ($1,$2,$3,$3,$4, CURRENT_DATE + ($5 || ' days')::interval)
         RETURNING *`,
        [po.id_orden_compra, po.id_proveedor, po.total, po.moneda, termDays]
      );
      payable = payableRows[0];
    }

    await client.query('COMMIT');
    res.json({ message: 'Mercancía recibida e inventario actualizado.', payable });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function cancel(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE ordenes_compra SET estado = 'cancelada', cancelada_en = now()
       WHERE id_orden_compra = $1 AND estado IN ('borrador','pendiente_aprobacion','aprobada')
       RETURNING *`,
      [id]
    );
    if (!rows[0]) {
      return res.status(400).json({ message: 'La orden ya fue recibida o cancelada, no se puede cancelar.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, submit, approve, receive, cancel };
