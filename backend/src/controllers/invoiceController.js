const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (num, size) => String(num).padStart(size, '0');

function toUsd(amountVes, exchangeRate) {
  const rate = Number(exchangeRate);
  if (!rate || rate <= 0) return 0;
  return round2(Number(amountVes) / rate);
}

const INVOICE_FIELDS = `
  f.id_factura AS id, f.numero_factura AS invoice_number, f.numero_control AS control_number,
  f.id_cliente AS customer_id, f.datos_cliente AS customer_snapshot, f.estado AS status,
  f.metodo_pago AS payment_method, f.moneda AS currency, f.tasa_cambio AS exchange_rate,
  f.subtotal, f.descuento_total AS discount_total, f.iva_general AS tax_general,
  f.iva_reducido AS tax_reducida, f.iva_suntuario AS tax_suntuario, f.total,
  f.es_credito AS is_credit, f.fecha_vencimiento AS due_date, f.saldo_pendiente AS balance_due,
  f.pagada_en AS paid_at, f.notas AS notes, f.id_usuario_creador AS created_by,
  f.creado_en AS created_at, f.anulada_en AS voided_at, f.motivo_anulacion AS void_reason
`;

const INSERT_RETURNING_FIELDS = `
  id_factura AS id, numero_factura AS invoice_number, numero_control AS control_number,
  id_cliente AS customer_id, datos_cliente AS customer_snapshot, estado AS status,
  metodo_pago AS payment_method, moneda AS currency, tasa_cambio AS exchange_rate,
  subtotal, descuento_total AS discount_total, iva_general AS tax_general,
  iva_reducido AS tax_reducida, iva_suntuario AS tax_suntuario, total,
  es_credito AS is_credit, fecha_vencimiento AS due_date, saldo_pendiente AS balance_due,
  pagada_en AS paid_at, notas AS notes, id_usuario_creador AS created_by,
  creado_en AS created_at, anulada_en AS voided_at, motivo_anulacion AS void_reason
`;

function withUsdEquivalents(invoice) {
  return {
    ...invoice,
    subtotal_usd: toUsd(invoice.subtotal, invoice.exchange_rate),
    tax_total_usd: toUsd(
      Number(invoice.tax_general) + Number(invoice.tax_reducida) + Number(invoice.tax_suntuario),
      invoice.exchange_rate
    ),
    total_usd: toUsd(invoice.total, invoice.exchange_rate),
  };
}

async function create(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      customer_id, customer_final_consumer, payment_method, currency, items, notes,
      is_credit, due_date,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'La factura debe tener al menos un producto.' });
    }
    if (is_credit && !due_date) {
      return res.status(400).json({ message: 'Las ventas a crédito requieren una fecha límite de pago.' });
    }

    await client.query('BEGIN');

    const { rows: settingsRows } = await client.query(
      'SELECT * FROM configuracion_empresa WHERE id = 1 FOR UPDATE'
    );
    const settings = settingsRows[0];

    let customerSnapshot;
    if (customer_id) {
      const { rows: custRows } = await client.query(
        `SELECT c.*, td.codigo AS document_type_code FROM clientes c
         LEFT JOIN tipos_documento td ON td.id_tipo_documento = c.id_tipo_documento
         WHERE c.id_cliente = $1`,
        [customer_id]
      );
      if (!custRows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Cliente no encontrado.' });
      }
      const c = custRows[0];
      customerSnapshot = {
        name: c.nombre,
        rif_cedula: c.document_type_code && c.numero_documento ? `${c.document_type_code}-${c.numero_documento}` : null,
        is_final_consumer: c.es_consumidor_final,
        address: c.direccion,
      };
    } else {
      customerSnapshot = {
        name: customer_final_consumer?.name || 'Consumidor Final',
        rif_cedula: null,
        is_final_consumer: true,
      };
    }

    const taxRateMap = {
      general: Number(settings.tasa_iva_general),
      reducida: Number(settings.tasa_iva_reducida),
      suntuario: Number(settings.tasa_iva_suntuario),
      exento: 0,
    };

    let subtotal = 0;
    let discountTotal = 0;
    let taxGeneral = 0;
    let taxReducida = 0;
    let taxSuntuario = 0;
    const lineItems = [];

    for (const item of items) {
      const { product_id, quantity, discount = 0 } = item;
      if (!product_id || !quantity || Number(quantity) <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cada línea debe tener producto y cantidad válida.' });
      }

      const { rows: prodRows } = await client.query(
        'SELECT * FROM productos WHERE id_producto = $1 FOR UPDATE',
        [product_id]
      );
      const product = prodRows[0];
      if (!product || !product.activo) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Producto no encontrado o inactivo (${product_id}).` });
      }
      if (Number(product.cantidad_stock) < Number(quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Stock insuficiente para "${product.nombre}". Disponible: ${product.cantidad_stock}`,
        });
      }

      const unitPrice = Number(product.precio_unitario);
      const lineDiscount = round2(discount);
      const lineSubtotal = round2(unitPrice * Number(quantity) - lineDiscount);
      const rate = taxRateMap[product.tipo_tasa_iva] ?? 0;
      const lineTax = round2(lineSubtotal * (rate / 100));
      const lineTotal = round2(lineSubtotal + lineTax);

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      if (product.tipo_tasa_iva === 'general') taxGeneral += lineTax;
      else if (product.tipo_tasa_iva === 'reducida') taxReducida += lineTax;
      else if (product.tipo_tasa_iva === 'suntuario') taxSuntuario += lineTax;

      lineItems.push({
        product_id: product.id_producto,
        product_name: product.nombre,
        quantity,
        unit_price: unitPrice,
        tax_rate_type: product.tipo_tasa_iva,
        tax_rate: rate,
        discount: lineDiscount,
        line_subtotal: lineSubtotal,
        line_tax: lineTax,
        line_total: lineTotal,
      });

      const newStock = Number(product.cantidad_stock) - Number(quantity);
      await client.query(
        'UPDATE productos SET cantidad_stock = $1, actualizado_en = now() WHERE id_producto = $2',
        [newStock, product.id_producto]
      );
    }

    const totalTax = round2(taxGeneral + taxReducida + taxSuntuario);
    const total = round2(subtotal + totalTax);

    const invoiceNumber = `${settings.prefijo_factura}-${pad(settings.siguiente_numero_factura, 6)}`;
    const controlNumber = `00-${pad(settings.siguiente_numero_control, 6)}`;

    const { rows: invoiceRows } = await client.query(
      `INSERT INTO facturas
        (numero_factura, numero_control, id_cliente, datos_cliente, metodo_pago,
         moneda, tasa_cambio, subtotal, descuento_total, iva_general, iva_reducido,
         iva_suntuario, total, notas, id_usuario_creador, es_credito, fecha_vencimiento, saldo_pendiente)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING ${INSERT_RETURNING_FIELDS}`,
      [
        invoiceNumber, controlNumber, customer_id || null, JSON.stringify(customerSnapshot),
        payment_method || 'efectivo', currency || 'VES', settings.tasa_bcv,
        round2(subtotal), round2(discountTotal), round2(taxGeneral), round2(taxReducida),
        round2(taxSuntuario), total, notes || null, req.user.id,
        !!is_credit, is_credit ? due_date : null, is_credit ? total : 0,
      ]
    );
    const invoice = invoiceRows[0];

    for (const li of lineItems) {
      await client.query(
        `INSERT INTO detalle_facturas
          (id_factura, id_producto, nombre_producto, cantidad, precio_unitario, tipo_tasa_iva,
           tasa_iva, descuento, subtotal_linea, iva_linea, total_linea)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          invoice.id, li.product_id, li.product_name, li.quantity, li.unit_price,
          li.tax_rate_type, li.tax_rate, li.discount, li.line_subtotal, li.line_tax, li.line_total,
        ]
      );
      await client.query(
        `INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, motivo, id_factura_referencia, id_usuario_creador)
         VALUES ($1, 'venta', $2, $3, $4, $5)`,
        [li.product_id, -Math.abs(li.quantity), `Venta ${invoiceNumber}`, invoice.id, req.user.id]
      );
    }

    await client.query(
      `UPDATE configuracion_empresa SET
        siguiente_numero_factura = siguiente_numero_factura + 1,
        siguiente_numero_control = siguiente_numero_control + 1
       WHERE id = 1`
    );

    await client.query('COMMIT');

    res.status(201).json({ ...withUsdEquivalents(invoice), items: lineItems });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function list(req, res, next) {
  try {
    const { from, to, status, search } = req.query;
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = [];
    const params = [];

    if (from) {
      params.push(from);
      conditions.push(`f.creado_en >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`f.creado_en <= $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`f.estado = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(f.numero_factura ILIKE $${params.length} OR f.datos_cliente->>'name' ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS total FROM facturas f ${where}`, params);

    const { rows } = await pool.query(
      `SELECT ${INVOICE_FIELDS}, u.nombre_completo AS created_by_name
       FROM facturas f
       LEFT JOIN usuarios u ON u.id_usuario = f.id_usuario_creador
       ${where}
       ORDER BY f.creado_en DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );
    res.json(buildPaginatedResponse(rows.map(withUsdEquivalents), countRows[0].total, page, pageSize));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: invRows } = await pool.query(
      `SELECT ${INVOICE_FIELDS}, u.nombre_completo AS created_by_name FROM facturas f
       LEFT JOIN usuarios u ON u.id_usuario = f.id_usuario_creador WHERE f.id_factura = $1`,
      [id]
    );
    if (!invRows[0]) return res.status(404).json({ message: 'Factura no encontrada.' });

    const { rows: itemRows } = await pool.query(
      `SELECT id_detalle_factura AS id, id_producto AS product_id, nombre_producto AS product_name,
              cantidad AS quantity, precio_unitario AS unit_price, tipo_tasa_iva AS tax_rate_type,
              tasa_iva AS tax_rate, descuento AS discount, subtotal_linea AS line_subtotal,
              iva_linea AS line_tax, total_linea AS line_total
       FROM detalle_facturas WHERE id_factura = $1 ORDER BY id_detalle_factura`,
      [id]
    );

    const { rows: companyRows } = await pool.query('SELECT * FROM configuracion_empresa WHERE id = 1');

    const itemsWithUsd = itemRows.map((item) => ({
      ...item,
      line_total_usd: toUsd(item.line_total, invRows[0].exchange_rate),
    }));

    res.json({ ...withUsdEquivalents(invRows[0]), items: itemsWithUsd, company: companyRows[0] });
  } catch (err) {
    next(err);
  }
}

async function voidInvoice(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM facturas WHERE id_factura = $1 FOR UPDATE', [id]);
    const invoice = rows[0];
    if (!invoice) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Factura no encontrada.' });
    }
    if (invoice.estado === 'anulada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'La factura ya está anulada.' });
    }

    const { rows: items } = await client.query('SELECT * FROM detalle_facturas WHERE id_factura = $1', [id]);
    for (const item of items) {
      if (item.id_producto) {
        await client.query(
          'UPDATE productos SET cantidad_stock = cantidad_stock + $1, actualizado_en = now() WHERE id_producto = $2',
          [item.cantidad, item.id_producto]
        );
        await client.query(
          `INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, motivo, id_factura_referencia, id_usuario_creador)
           VALUES ($1, 'devolucion', $2, $3, $4, $5)`,
          [item.id_producto, item.cantidad, `Anulación factura ${invoice.numero_factura}`, id, req.user.id]
        );
      }
    }

    await client.query(
      `UPDATE facturas SET estado = 'anulada', anulada_en = now(), motivo_anulacion = $1 WHERE id_factura = $2`,
      [reason || null, id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Factura anulada correctamente. Inventario restituido.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { create, list, getOne, voidInvoice };
