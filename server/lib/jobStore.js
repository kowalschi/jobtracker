import path from 'node:path';
import { readJSON, writeJSON, deleteFile, listDir, listSubdirs, withLock } from './fileStore.js';
import { JOBS_DIR, JOBS_INDEX_FILE, JOBS_COUNTER_FILE } from './paths.js';

// Jobs are stored per-designer, one JSON file per calendar month
// (data/jobs/<designerId>/<YYYY-MM>.json), keyed by the month the job was
// CREATED in — a job keeps living in that same file for its whole life,
// even if it's later reassigned to another designer or edited months later.
// This keeps each file small (a month's worth of one person's jobs) instead
// of one ever-growing file per designer.
// _index.json maps jobId -> { designerId, month } so single-job lookups
// don't require scanning every month file of every designer.

function designerDir(designerId) {
  return path.join(JOBS_DIR, designerId);
}

function monthKey(dateInput) {
  const d = new Date(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function shardPath(designerId, month) {
  return path.join(designerDir(designerId), `${month}.json`);
}

async function monthKeys(designerId) {
  const files = await listDir(designerDir(designerId));
  return files
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .map((f) => f.replace('.json', ''))
    .sort();
}

async function loadIndex() {
  return readJSON(JOBS_INDEX_FILE, {});
}

async function saveIndex(index) {
  await writeJSON(JOBS_INDEX_FILE, index);
}

export async function getAllJobs() {
  const designerIds = await listSubdirs(JOBS_DIR);
  const all = [];
  for (const designerId of designerIds) {
    const keys = await monthKeys(designerId);
    for (const key of keys) {
      const jobs = await readJSON(shardPath(designerId, key), []);
      all.push(...jobs);
    }
  }
  return all;
}

export async function getJobsByDesigner(designerId) {
  const keys = await monthKeys(designerId);
  const jobs = [];
  for (const key of keys) {
    jobs.push(...(await readJSON(shardPath(designerId, key), [])));
  }
  return jobs;
}

export async function getJobById(jobId) {
  const index = await loadIndex();
  const entry = index[jobId];
  if (!entry) return null;
  const jobs = await readJSON(shardPath(entry.designerId, entry.month), []);
  return jobs.find((j) => j.id === jobId) || null;
}

// Appends a job to the designer's file for the month the job was created in
// (not the current month — matters when a job is reassigned later).
async function appendToDesigner(designerId, job) {
  const month = monthKey(job.createdAt);
  const filePath = shardPath(designerId, month);
  const jobs = await readJSON(filePath, []);
  jobs.push(job);
  await writeJSON(filePath, jobs);

  const index = await loadIndex();
  index[job.id] = { designerId, month };
  await saveIndex(index);
}

async function nextJobNumber() {
  const current = await readJSON(JOBS_COUNTER_FILE, 0);
  const next = current + 1;
  await writeJSON(JOBS_COUNTER_FILE, next);
  return next;
}

export async function createJob(job) {
  return withLock(async () => {
    job.jobNumber = await nextJobNumber();
    await appendToDesigner(job.designerId, job);
    return job;
  });
}

// One-time backfill for jobs created before job numbers existed. Assigns
// numbers in creation order and advances the shared counter past them.
// Safe to call on every startup — a no-op once every job has a number.
export async function backfillJobNumbers() {
  return withLock(async () => {
    const all = await getAllJobs();
    const missing = all.filter((j) => !j.jobNumber);
    if (!missing.length) return;

    missing.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let counter = await readJSON(JOBS_COUNTER_FILE, 0);
    const index = await loadIndex();

    for (const job of missing) {
      counter += 1;
      const entry = index[job.id];
      if (!entry) continue;
      const filePath = shardPath(entry.designerId, entry.month);
      const jobs = await readJSON(filePath, []);
      const idx = jobs.findIndex((j) => j.id === job.id);
      if (idx === -1) continue;
      jobs[idx] = { ...jobs[idx], jobNumber: counter };
      await writeJSON(filePath, jobs);
    }

    await writeJSON(JOBS_COUNTER_FILE, counter);
  });
}

// One-time migration from the old size-based shard files (jobs-1.json,
// jobs-2.json, ...) to the new one-file-per-month layout. Safe to call on
// every startup — a no-op once no old-style shard files remain.
export async function migrateToMonthlyShards() {
  return withLock(async () => {
    const designerIds = await listSubdirs(JOBS_DIR);
    let migratedAny = false;

    for (const designerId of designerIds) {
      const dir = designerDir(designerId);
      const files = await listDir(dir);
      const oldFiles = files.filter((f) => /^jobs-\d+\.json$/.test(f));
      if (!oldFiles.length) continue;

      migratedAny = true;
      const byMonth = new Map();
      for (const f of oldFiles) {
        const jobs = await readJSON(path.join(dir, f), []);
        for (const job of jobs) {
          const key = monthKey(job.createdAt);
          if (!byMonth.has(key)) byMonth.set(key, []);
          byMonth.get(key).push(job);
        }
      }

      for (const [key, jobs] of byMonth) {
        const targetPath = shardPath(designerId, key);
        const existing = await readJSON(targetPath, []);
        await writeJSON(targetPath, [...existing, ...jobs]);
      }

      for (const f of oldFiles) {
        await deleteFile(path.join(dir, f));
      }
    }

    if (migratedAny) {
      const index = {};
      for (const designerId of designerIds) {
        const keys = await monthKeys(designerId);
        for (const key of keys) {
          const jobs = await readJSON(shardPath(designerId, key), []);
          for (const job of jobs) index[job.id] = { designerId, month: key };
        }
      }
      await saveIndex(index);
    }
  });
}

export async function updateJob(jobId, updates) {
  return withLock(async () => {
    const index = await loadIndex();
    const entry = index[jobId];
    if (!entry) return null;

    const currentPath = shardPath(entry.designerId, entry.month);
    const jobs = await readJSON(currentPath, []);
    const jobIndex = jobs.findIndex((j) => j.id === jobId);
    if (jobIndex === -1) return null;

    const original = jobs[jobIndex];
    const updated = { ...original, ...updates, id: jobId, updatedAt: new Date().toISOString() };

    const designerChanged = updates.designerId && updates.designerId !== original.designerId;

    if (designerChanged) {
      jobs.splice(jobIndex, 1);
      await writeJSON(currentPath, jobs);
      await appendToDesigner(updated.designerId, updated);
    } else {
      jobs[jobIndex] = updated;
      await writeJSON(currentPath, jobs);
    }

    return updated;
  });
}

export async function deleteJob(jobId) {
  return withLock(async () => {
    const index = await loadIndex();
    const entry = index[jobId];
    if (!entry) return false;

    const filePath = shardPath(entry.designerId, entry.month);
    const jobs = await readJSON(filePath, []);
    const next = jobs.filter((j) => j.id !== jobId);
    await writeJSON(filePath, next);

    delete index[jobId];
    await saveIndex(index);
    return true;
  });
}
