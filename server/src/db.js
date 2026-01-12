
import { Pool } from 'pg';
import { DATABASE_URL } from './config.js';

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Idempotently enable PostGIS and check availability
export async function checkPostgis() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
  const result = await pool.query('SELECT postgis_full_version()');
  return result.rows.length > 0;
}
