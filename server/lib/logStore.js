import { nanoid } from 'nanoid';
import { readJSON, writeJSON, withLock } from './fileStore.js';
import { LOG_FILE } from './paths.js';

// Keep the log from growing without bound — this is meant as a simple
// recent-activity feed, not a permanent audit trail.
const MAX_ENTRIES = 1000;

export async function getLogs() {
  return readJSON(LOG_FILE, []);
}

export async function addLog({ userId, userName, action, jobId, jobName, details }) {
  return withLock(async () => {
    const logs = await readJSON(LOG_FILE, []);
    logs.push({
      id: nanoid(10),
      at: new Date().toISOString(),
      userId,
      userName,
      action,
      jobId,
      jobName,
      details,
    });
    const trimmed = logs.length > MAX_ENTRIES ? logs.slice(logs.length - MAX_ENTRIES) : logs;
    await writeJSON(LOG_FILE, trimmed);
  });
}
