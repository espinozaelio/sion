const pool = require('../config/db');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

// Reemplaza por completo la lista de proveedores asociados a un producto.
async function syncSuppliers(productId, supplierIds) {
  if (!Array.isArray(supplierIds)) return; // si no viene el campo, no se toca la relación
  await pool.query('DELETE FROM productos_proveedores WHERE id_producto = $1', [productId]);
  const uniqueIds = [...new Set(supplierIds.filter(Boolean))];
  for (const supplierId of uniqueIds) {
    await pool.query(
      'INSERT INTO productos_proveedores (id_producto, id_proveedor) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [productId, supplierId]
    );
  }
}

const SELECT_FIELDS = `
  p.id_producto AS id, p.sku, p.nombre AS name, p.descripcion AS description,
  p.id_categoria AS category_id, p.precio_unitario AS unit_price, p.precio_costo AS cost_price,
  p.tipo_tasa_iva AS tax_rate_type, p.cantidad_stock AS stock_quantity, p.stock_minimo AS min_stock,
  p.unidad_medida AS unit, p.activo AS active, p.creado_en AS created_at, p.actualizado_en AS updated_at
`;

async function list(req, res, next) {
  try {
    const { search, category_id, low_stock, supplier_id } = req.query;
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = ['p.activo = true'];
    const params = [];
    let joinClause = '';

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.nombre ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`p.id_categoria = $${params.length}`);
    }
    if (low_stock === 'true') {
      conditions.push('p.cantidad_stock <= p.stock_minimo');
    }
    if (supplier_id) {
      // Solo productos asociados a este proveedor (tabla productos_proveedores).
      joinClause = 'JOIN productos_proveedores pp ON pp.id_producto = p.id_producto';
      params.push(supplier_id);
      conditions.push(`pp.id_proveedor = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM productos p ${joinClause} WHERE ${whereClause}`,
      params
    );

    const { rows } = await pool.query(
      `SELECT ${SELECT_FIELDS}, c.nombre AS category_name
       FROM productos p
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
       ${joinClause}
       WHERE ${whereClause}
       ORDER BY p.nombre ASC
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
      `SELECT ${SELECT_FIELDS}, c.nombre AS category_name FROM productos p
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Producto no encontrado.' });

    const { rows: supplierRows } = await pool.query(
      'SELECT id_proveedor FROM productos_proveedores WHERE id_producto = $1',
      [id]
    );

    res.json({ ...rows[0], supplier_ids: supplierRows.map((r) => r.id_proveedor) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      sku, name, description, category_id, unit_price, cost_price,
      tax_rate_type, stock_quantity, min_stock, unit, supplier_ids,
    } = req.body;

    if (!sku || !name || unit_price === undefined) {
      return res.status(400).json({ message: 'SKU, nombre y precio de venta son requeridos.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO productos
        (sku, nombre, descripcion, id_categoria, precio_unitario, precio_costo, tipo_tasa_iva, cantidad_stock, stock_minimo, unidad_medida)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'general'),COALESCE($8,0),COALESCE($9,5),COALESCE($10,'unidad'))
       RETURNING id_producto AS id, sku, nombre AS name, cantidad_stock AS stock_quantity`,
      [sku.trim(), name.trim(), description || null, category_id || null, unit_price, cost_price || 0,
        tax_rate_type, stock_quantity, min_stock, unit]
    );

    const product = rows[0];

    await syncSuppliers(product.id, supplier_ids);

    if (Number(stock_quantity) > 0) {
      await pool.query(
        `INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, motivo, id_usuario_creador)
         VALUES ($1, 'entrada', $2, 'Stock inicial', $3)`,
        [product.id, stock_quantity, req.user.id]
      );
    }

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      sku, name, description, category_id, unit_price, cost_price,
      tax_rate_type, min_stock, unit, active, supplier_ids,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE productos SET
        sku = COALESCE($1, sku),
        nombre = COALESCE($2, nombre),
        descripcion = COALESCE($3, descripcion),
        id_categoria = $4,
        precio_unitario = COALESCE($5, precio_unitario),
        precio_costo = COALESCE($6, precio_costo),
        tipo_tasa_iva = COALESCE($7, tipo_tasa_iva),
        stock_minimo = COALESCE($8, stock_minimo),
        unidad_medida = COALESCE($9, unidad_medida),
        activo = COALESCE($10, activo),
        actualizado_en = now()
       WHERE id_producto = $11
       RETURNING id_producto AS id`,
      [sku, name, description, category_id || null, unit_price, cost_price,
        tax_rate_type, min_stock, unit, active, id]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Producto no encontrado.' });

    await syncSuppliers(id, supplier_ids);

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE productos SET activo = false, actualizado_en = now() WHERE id_producto = $1 RETURNING id_producto',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function adjustStock(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { movement_type, quantity, reason } = req.body;

    if (!['entrada', 'salida', 'ajuste'].includes(movement_type)) {
      return res.status(400).json({ message: 'Tipo de movimiento inválido.' });
    }
    if (!quantity || Number(quantity) === 0) {
      return res.status(400).json({ message: 'La cantidad debe ser distinta de cero.' });
    }

    await client.query('BEGIN');

    const delta = movement_type === 'salida' ? -Math.abs(Number(quantity)) : Math.abs(Number(quantity));
    const finalDelta = movement_type === 'ajuste' ? Number(quantity) : delta;

    const { rows: productRows } = await client.query(
      'SELECT cantidad_stock FROM productos WHERE id_producto = $1 FOR UPDATE',
      [id]
    );
    if (!productRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const newStock = Number(productRows[0].cantidad_stock) + finalDelta;
    if (newStock < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No hay suficiente stock para esta salida.' });
    }

    await client.query(
      'UPDATE productos SET cantidad_stock = $1, actualizado_en = now() WHERE id_producto = $2',
      [newStock, id]
    );

    await client.query(
      `INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, motivo, id_usuario_creador)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, movement_type, finalDelta, reason || null, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Inventario actualizado.', stock_quantity: newStock });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function movements(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT m.id_movimiento AS id, m.tipo_movimiento AS movement_type, m.cantidad AS quantity,
              m.motivo AS reason, m.creado_en AS created_at, u.nombre_completo AS created_by_name
       FROM movimientos_inventario m
       LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario_creador
       WHERE m.id_producto = $1
       ORDER BY m.creado_en DESC
       LIMIT 100`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, adjustStock, movements };
