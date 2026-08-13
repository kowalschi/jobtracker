import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, publicUser } from '../lib/userStore.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';

const router = Router();

// Any logged-in user can see the designer list (needed for filters/assignment).
router.get('/', requireAuth, async (req, res) => {
  const users = await getUsers();
  res.json({ users: users.map(publicUser) });
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  try {
    const user = await createUser({ name, email, password, role: role === 'admin' ? 'admin' : 'designer' });
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const updated = await updateUser(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(updated) });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: "You can't delete your own account" });
  }
  const ok = await deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

export default router;
