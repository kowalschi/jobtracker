import { Router } from 'express';
import { getConfig, addListItem, removeListItem } from '../lib/configStore.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  res.json({ config: await getConfig() });
});

router.post('/:listName', requireAuth, requireAdmin, async (req, res) => {
  const { value } = req.body || {};
  if (!value) return res.status(400).json({ error: 'Value is required' });
  try {
    const config = await addListItem(req.params.listName, value);
    res.json({ config });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:listName/:value', requireAuth, requireAdmin, async (req, res) => {
  try {
    const config = await removeListItem(req.params.listName, decodeURIComponent(req.params.value));
    res.json({ config });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
