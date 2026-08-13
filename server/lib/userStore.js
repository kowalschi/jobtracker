import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { readJSON, writeJSON, withLock } from './fileStore.js';
import { USERS_FILE } from './paths.js';

const AVATAR_COLORS = [
  '#5B8DEF', '#E4685D', '#6FCF97', '#F2C94C',
  '#BB6BD9', '#56CCF2', '#F2994A', '#9B51E0',
];

export async function getUsers() {
  return readJSON(USERS_FILE, []);
}

async function saveUsers(users) {
  await writeJSON(USERS_FILE, users);
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function findByEmail(email) {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findById(id) {
  const users = await getUsers();
  return users.find((u) => u.id === id) || null;
}

export async function createUser({ name, email, password, role = 'designer' }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return withLock(async () => {
    const users = await getUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('A user with that email already exists');
    }
    const user = {
      id: nanoid(10),
      name,
      email,
      passwordHash,
      role,
      color: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
      active: true,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await saveUsers(users);
    return user;
  });
}

export async function updateUser(id, updates) {
  const passwordHash = updates.password ? await bcrypt.hash(updates.password, 10) : null;
  return withLock(async () => {
    const users = await getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    const next = { ...users[idx] };
    if (updates.name !== undefined) next.name = updates.name;
    if (updates.email !== undefined) next.email = updates.email;
    if (updates.role !== undefined) next.role = updates.role;
    if (updates.active !== undefined) next.active = updates.active;
    if (passwordHash) next.passwordHash = passwordHash;

    users[idx] = next;
    await saveUsers(users);
    return next;
  });
}

export async function deleteUser(id) {
  return withLock(async () => {
    const users = await getUsers();
    const next = users.filter((u) => u.id !== id);
    if (next.length === users.length) return false;
    await saveUsers(next);
    return true;
  });
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.passwordHash);
}
