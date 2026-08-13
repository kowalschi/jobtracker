import { Router } from 'express';
import { findByEmail, findById, verifyPassword, publicUser, updateUser } from '../lib/userStore.js';
import { signToken, requireAuth } from '../lib/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await findByEmail(email);
  if (!user || !user.active || !(await verifyPassword(user, password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  const user = await findById(req.userId);
  if (!user || !(await verifyPassword(user, currentPassword))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const updated = await updateUser(user.id, { password: newPassword });
  res.json({ user: publicUser(updated) });
});

export default router;
