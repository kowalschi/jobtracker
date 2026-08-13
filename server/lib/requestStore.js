import { nanoid } from 'nanoid';
import { readJSON, writeJSON, withLock } from './fileStore.js';
import { REQUESTS_FILE } from './paths.js';

export async function getRequests() {
  return readJSON(REQUESTS_FILE, []);
}

export async function createRequest({ jobId, jobName, field, currentValue, requestedValue, requestedBy, requestedByName }) {
  return withLock(async () => {
    const requests = await readJSON(REQUESTS_FILE, []);
    const request = {
      id: nanoid(10),
      jobId,
      jobName,
      field,
      currentValue,
      requestedValue,
      requestedBy,
      requestedByName,
      status: 'pending',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
    };
    requests.push(request);
    await writeJSON(REQUESTS_FILE, requests);
    return request;
  });
}

export async function resolveRequest(id, { status, resolvedBy }) {
  return withLock(async () => {
    const requests = await readJSON(REQUESTS_FILE, []);
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated = { ...requests[idx], status, resolvedAt: new Date().toISOString(), resolvedBy };
    requests[idx] = updated;
    await writeJSON(REQUESTS_FILE, requests);
    return updated;
  });
}
