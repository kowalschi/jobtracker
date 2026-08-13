import { Router } from 'express';
import { getLogs } from '../lib/logStore.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const logs = await getLogs();
  res.json({ logs: [...logs].reverse() });
});

export default router;
