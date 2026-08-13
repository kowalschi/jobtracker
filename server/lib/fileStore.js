import fs from 'node:fs/promises';
import path from 'node:path';

// Simple per-file write queue so concurrent requests never interleave writes
// to the same JSON file and corrupt it.
const queues = new Map();

function enqueue(filePath, task) {
  const prev = queues.get(filePath) || Promise.resolve();
  const next = prev.then(task, task);
  queues.set(filePath, next.finally(() => {
    if (queues.get(filePath) === next) queues.delete(filePath);
  }));
  return next;
}

// Global lock for compound read-modify-write operations (e.g. "read a shard,
// append a job, write it back"). The per-file write queue above only
// serializes the write step, so two concurrent operations can both read the
// same "before" state and the second write would silently clobber the
// first's change. Store functions that read-then-write must run their whole
// operation through withLock, not just the final writeJSON call.
let lockChain = Promise.resolve();

export function withLock(task) {
  const result = lockChain.then(task, task);
  lockChain = result.then(() => {}, () => {});
  return result;
}

export async function readJSON(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeJSON(filePath, data) {
  return enqueue(filePath, async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, filePath);
  });
}

export async function fileSizeBytes(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    throw err;
  }
}

export async function listDir(dirPath) {
  try {
    return await fs.readdir(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function listSubdirs(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
