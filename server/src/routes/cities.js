import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/cities?query=bos
router.get('/', async (req, res) => {
  const { query } = req.query;
  let sql = `SELECT city_id, display_name, rank_top, population, segment_library_status FROM cities`;
  let params = [];
  if (query) {
    sql += ` WHERE city_name ILIKE $1 OR display_name ILIKE $1 ORDER BY rank_top ASC LIMIT 10`;
    params = [`%${query}%`];
  } else {
    sql += ` ORDER BY rank_top ASC LIMIT 100`;
  }
  const result = await pool.query(sql, params);
  res.json(result.rows);
});

// GET /api/cities/:city_id
router.get('/:city_id', async (req, res) => {
  const { city_id } = req.params;
  const result = await pool.query(
    `SELECT * FROM cities WHERE city_id = $1`,
    [city_id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'City not found' });
  }
  res.json(result.rows[0]);
});

export default router;
