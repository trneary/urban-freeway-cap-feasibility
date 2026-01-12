import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/segments/:segment_id/inputs
router.get('/:segment_id/inputs', async (req, res) => {
  const { segment_id } = req.params;
  const result = await pool.query(
    `SELECT category, input_key, input_value, confidence, source FROM segment_inputs WHERE segment_id = $1`,
    [segment_id]
  );
  // Group by category
  const grouped = {};
  for (const row of result.rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }
  res.json(grouped);
});

// PATCH /api/segments/:segment_id/inputs
router.patch('/:segment_id/inputs', async (req, res) => {
  const { segment_id } = req.params;
  const updates = req.body; // { input_key: { input_value, confidence } }
  if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Invalid input' });
  for (const [input_key, { input_value, confidence }] of Object.entries(updates)) {
    await pool.query(
      `UPDATE segment_inputs SET input_value = $1, confidence = $2, source = 'USER', updated_at = NOW() WHERE segment_id = $3 AND input_key = $4`,
      [input_value, confidence || 'USER', segment_id, input_key]
    );
  }
  res.json({ status: 'ok' });
});

export default router;
