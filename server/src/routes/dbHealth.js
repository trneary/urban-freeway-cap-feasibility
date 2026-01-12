import { Router } from 'express';
import { checkPostgis } from '../db.js';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const ok = await checkPostgis();
    if (ok) {
      res.json({ status: 'ok' });
    } else {
      res.status(500).json({ status: 'error', message: 'PostGIS not available' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
