import path from 'node:path';
import { readJSON, writeJSON, fileSizeBytes, listDir, listSubdirs, withLock } from './fileStore.js';
import { JOBS_DIR, JOBS_INDEX_FILE, JOBS_COUNTER_FILE, SHARD_MAX_BYTES, SHARD_MAX_RECORDS } from './paths.js';

// Jobs are stored per-designer, one JSON array per shard file
// (data/jobs/<designerId>/jobs-1.json, jobs-2.json, ...). Once a shard
// passes SHARD_MAX_BYTES or SHARD_MAX_RECORDS, new jobs roll into the next
// shard file instead of growing that file forever.
// _index.json maps jobId -> { designerId, shard } so single-job lookups
// don't require scanning every shard of every designer.

function designerDir(designerId) {
  return path.join(JOBS_DIR, designerId);
}

function shardPath(designerId, shardNum) {
  return path.join(designerDir(designerId), `jobs-${shardNum}.json`);
}

async function shardNumbers(designerId) {
  const files = await listDir(designerDir(designerId));
  return files
    .map((f) => f.match(/^jobs-(\d+)\.json$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
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
    const nums = await shardNumbers(designerId);
    for (const n of nums) {
      const jobs = await readJSON(shardPath(designerId, n), []);
      all.push(...jobs);
    }
  }
  return all;
}

export async function getJobsByDesigner(designerId) {
  const nums = await shardNumbers(designerId);
  const jobs = [];
  for (const n of nums) {
    jobs.push(...(await readJSON(shardPath(designerId, n), [])));
  }
  return jobs;
}

export async function getJobById(jobId) {
  const index = await loadIndex();
  const entry = index[jobId];
  if (!entry) return null;
  const jobs = await readJSON(shardPath(entry.designerId, entry.shard), []);
  return jobs.find((j) => j.id === jobId) || null;
}

// Appends a job to a designer's current (last) shard, rolling over to a
// new shard file first if the current one is full.
async function appendToDesigner(designerId, job) {
  const nums = await shardNumbers(designerId);
  let shardNum = nums.length ? nums[nums.length - 1] : 1;
  let jobs = await readJSON(shardPath(designerId, shardNum), []);

  const wouldBeFull =
    jobs.length >= SHARD_MAX_RECORDS ||
    (await fileSizeBytes(shardPath(designerId, shardNum))) >= SHARD_MAX_BYTES;

  if (nums.length && wouldBeFull) {
    shardNum = nums[nums.length - 1] + 1;
    jobs = [];
  }

  jobs.push(job);
  await writeJSON(shardPath(designerId, shardNum), jobs);

  const index = await loadIndex();
  index[job.id] = { designerId, shard: shardNum };
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
      const filePath = shardPath(entry.designerId, entry.shard);
      const jobs = await readJSON(filePath, []);
      const idx = jobs.findIndex((j) => j.id === job.id);
      if (idx === -1) continue;
      jobs[idx] = { ...jobs[idx], jobNumber: counter };
      await writeJSON(filePath, jobs);
    }

    await writeJSON(JOBS_COUNTER_FILE, counter);
  });
}

export async function updateJob(jobId, updates) {
  return withLock(async () => {
    const index = await loadIndex();
    const entry = index[jobId];
    if (!entry) return null;

    const currentPath = shardPath(entry.designerId, entry.shard);
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

    const filePath = shardPath(entry.designerId, entry.shard);
    const jobs = await readJSON(filePath, []);
    const next = jobs.filter((j) => j.id !== jobId);
    await writeJSON(filePath, next);

    delete index[jobId];
    await saveIndex(index);
    return true;
  });
}
