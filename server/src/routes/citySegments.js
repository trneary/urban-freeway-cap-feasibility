import { Router } from 'express';
import { pool } from '../db.js';
import buildSegmentsForCity from '../buildSegments.js';

const router = Router();

// GET /api/cities/:city_id/segments
router.get('/:city_id/segments', async (req, res) => {
  const { city_id } = req.params;
  // Check city status
  const cityRes = await pool.query('SELECT segment_library_status FROM cities WHERE city_id = $1', [city_id]);
  if (cityRes.rows.length === 0) return res.status(404).json({ error: 'City not found' });
  const status = cityRes.rows[0].segment_library_status;

  if (status === 'NOT_BUILT') {
    // Trigger build job (non-blocking)
    buildSegmentsForCity(city_id).catch(() => {});
    return res.json({ status: 'BUILDING' });
  }
  if (status === 'BUILDING') {
    return res.json({ status: 'BUILDING' });
  }
  if (status === 'ERROR') {
    return res.json({ status: 'ERROR', message: 'Segment build failed.' });
  }
  // READY: return segments
  const segRes = await pool.query(
    'SELECT segment_id, route_label, length_ft FROM segments WHERE city_id = $1',
    [city_id]
  );
  return res.json({ status: 'READY', segments: segRes.rows });
});

export default router;
