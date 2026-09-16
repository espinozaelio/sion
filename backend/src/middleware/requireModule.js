const pool = require('../config/db');

/**
 * Bloquea TODO el acceso (lectura y escritura) a un módulo opcional si está
 * deshabilitado. Se usa después de authRequired en las rutas de Proveedores,
 * Compras, Cuentas por Pagar y Cuentas por Cobrar.
 *
 * Uso:
 *   router.use(authRequired, requireModule('compras'));
 *
 * Si la clave no existe en la tabla modulos_sistema, se asume habilitado
 * (así un módulo "core" que nunca se agregó a la tabla nunca queda bloqueado
 * por accidente).
 */
function requireModule(clave) {
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT activo FROM modulos_sistema WHERE clave = $1',
        [clave]
      );
      if (rows[0] && rows[0].activo === false) {
        return res.status(403).json({
          message: 'Este módulo está deshabilitado por el administrador. Actívalo desde Configuración → Módulos.',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requireModule;
