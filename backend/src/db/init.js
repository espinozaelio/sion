/**
 * Ejecuta schema.sql y seed.sql contra la base de datos configurada en DATABASE_URL.
 * Uso: npm run db:init
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

  const client = await pool.connect();
  try {
    console.log('Creando esquema...');
    await client.query(schema);
    console.log('Insertando datos iniciales...');
    await client.query(seed);
    console.log('Listo. Base de datos inicializada correctamente.');
    console.log('Usuario admin: admin@miempresa.com / Admin123!');
  } catch (err) {
    console.error('Error inicializando la base de datos:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
