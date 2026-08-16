import { Router } from 'express';
import { getStatusCounts } from '../lib/statusCountStore.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const counts = await getStatusCounts();
  res.json({ counts });
});

export default router;
