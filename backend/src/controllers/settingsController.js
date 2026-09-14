const pool = require('../config/db');

// Fuente pública gratuita, sin autenticación, que replica la tasa oficial del BCV.
const BCV_RATE_SOURCE = 'https://ve.dolarapi.com/v1/dolares/oficial';

async function get(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM configuracion_empresa WHERE id = 1');
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const {
      razon_social, rif, domicilio_fiscal, telefono, correo,
      tasa_iva_general, tasa_iva_reducida, tasa_iva_suntuario,
      moneda_principal, tasa_bcv, prefijo_factura, umbral_aprobacion_compra, prefijo_orden_compra,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE configuracion_empresa SET
        razon_social = COALESCE($1, razon_social),
        rif = COALESCE($2, rif),
        domicilio_fiscal = COALESCE($3, domicilio_fiscal),
        telefono = COALESCE($4, telefono),
        correo = COALESCE($5, correo),
        tasa_iva_general = COALESCE($6, tasa_iva_general),
        tasa_iva_reducida = COALESCE($7, tasa_iva_reducida),
        tasa_iva_suntuario = COALESCE($8, tasa_iva_suntuario),
        moneda_principal = COALESCE($9, moneda_principal),
        tasa_bcv = COALESCE($10, tasa_bcv),
        tasa_bcv_actualizada_en = CASE WHEN $10 IS NOT NULL THEN now() ELSE tasa_bcv_actualizada_en END,
        prefijo_factura = COALESCE($11, prefijo_factura),
        umbral_aprobacion_compra = COALESCE($12, umbral_aprobacion_compra),
        prefijo_orden_compra = COALESCE($13, prefijo_orden_compra)
       WHERE id = 1
       RETURNING *`,
      [razon_social, rif, domicilio_fiscal, telefono, correo,
        tasa_iva_general, tasa_iva_reducida, tasa_iva_suntuario,
        moneda_principal, tasa_bcv, prefijo_factura, umbral_aprobacion_compra, prefijo_orden_compra]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function refreshBcvRate(req, res, next) {
  try {
    const response = await fetch(BCV_RATE_SOURCE, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return res.status(502).json({ message: 'No se pudo consultar la tasa BCV en este momento. Intenta más tarde o ingrésala manualmente.' });
    }
    const data = await response.json();
    const rate = Number(data.promedio ?? data.venta ?? data.compra);

    if (!rate || Number.isNaN(rate) || rate <= 0) {
      return res.status(502).json({ message: 'La fuente de la tasa BCV devolvió un valor inválido.' });
    }

    const { rows } = await pool.query(
      `UPDATE configuracion_empresa SET tasa_bcv = $1, tasa_bcv_actualizada_en = now() WHERE id = 1 RETURNING *`,
      [rate]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ message: 'La consulta a la tasa BCV tardó demasiado. Intenta de nuevo o ingrésala manualmente.' });
    }
    next(err);
  }
}

module.exports = { get, update, refreshBcvRate };
