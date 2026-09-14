const { Pool } = require('pg');
require('dotenv').config();

/**
 * Se arma la configuración del pool usando variables discretas (DB_HOST, DB_USER, etc.)
 * en lugar de una única cadena DATABASE_URL. Esto evita un bug conocido de la librería
 * "pg" en Windows/algunas versiones, donde una contraseña compuesta solo por dígitos
 * (ej: "0124") se interpreta mal al parsear una connection string y provoca el error:
 * "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string".
 *
 * Si prefieres usar DATABASE_URL de todas formas, sigue funcionando como respaldo,
 * pero se recomienda usar las variables DB_* si tu contraseña es numérica.
 */
function buildPoolConfig() {
  if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: String(process.env.DB_PASSWORD ?? ''),
      database: process.env.DB_NAME || 'sistema_ventas',
    };
  }
  return { connectionString: process.env.DATABASE_URL };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres', err);
  process.exit(-1);
});

module.exports = pool;
module.exports.buildPoolConfig = buildPoolConfig;
