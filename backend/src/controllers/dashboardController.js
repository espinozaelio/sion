const pool = require('../config/db');

async function summary(req, res, next) {
  try {
    const [
      todaySales,
      monthSales,
      lowStock,
      totalProducts,
      recentInvoices,
      payablesSummary,
      receivablesSummary,
    ] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
         FROM facturas WHERE estado = 'emitida' AND creado_en::date = CURRENT_DATE`
      ),
      pool.query(
        `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
         FROM facturas WHERE estado = 'emitida' AND date_trunc('month', creado_en) = date_trunc('month', CURRENT_DATE)`
      ),
      pool.query(
        `SELECT id_producto AS id, sku, nombre AS name, cantidad_stock AS stock_quantity, stock_minimo AS min_stock
         FROM productos WHERE activo = true AND cantidad_stock <= stock_minimo
         ORDER BY (cantidad_stock - stock_minimo) ASC LIMIT 10`
      ),
      pool.query(`SELECT COUNT(*) AS count FROM productos WHERE activo = true`),
      pool.query(
        `SELECT id_factura AS id, numero_factura AS invoice_number, total, moneda AS currency, creado_en AS created_at,
                datos_cliente->>'name' AS customer_name
         FROM facturas WHERE estado = 'emitida' ORDER BY creado_en DESC LIMIT 5`
      ),
      pool.query(
        `SELECT COALESCE(SUM(saldo) FILTER (WHERE estado = 'pendiente'), 0) AS total_pending,
                COUNT(*) FILTER (WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE) AS overdue_count
         FROM cuentas_por_pagar`
      ),
      pool.query(
        `SELECT COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0), 0) AS total_pending,
                COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE) AS overdue_count
         FROM facturas WHERE es_credito = true AND estado = 'emitida'`
      ),
    ]);

    res.json({
      today_sales_total: Number(todaySales.rows[0].total),
      today_sales_count: Number(todaySales.rows[0].count),
      month_sales_total: Number(monthSales.rows[0].total),
      month_sales_count: Number(monthSales.rows[0].count),
      low_stock_products: lowStock.rows,
      total_active_products: Number(totalProducts.rows[0].count),
      recent_invoices: recentInvoices.rows,
      payables_pending_total: Number(payablesSummary.rows[0].total_pending),
      payables_overdue_count: Number(payablesSummary.rows[0].overdue_count),
      receivables_pending_total: Number(receivablesSummary.rows[0].total_pending),
      receivables_overdue_count: Number(receivablesSummary.rows[0].overdue_count),
    });
  } catch (err) {
    next(err);
  }
}

async function salesByDay(req, res, next) {
  try {
    const { days = 14 } = req.query;
    const { rows } = await pool.query(
      `SELECT creado_en::date AS day, COALESCE(SUM(total),0) AS total, COUNT(*) AS count
       FROM facturas
       WHERE estado = 'emitida' AND creado_en >= CURRENT_DATE - ($1 || ' days')::interval
       GROUP BY day ORDER BY day ASC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, salesByDay };
