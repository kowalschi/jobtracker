import { readJSON, writeJSON, withLock } from './fileStore.js';
import { STATUS_COUNTS_FILE } from './paths.js';

// Counts how many times a job has ever moved INTO each status — a running
// total that only goes up, unlike the current per-column occupancy count.
// Lets the board show e.g. how many times a job has been sent back for
// feedback, not just how many jobs are sitting there right now.

export async function getStatusCounts() {
  return readJSON(STATUS_COUNTS_FILE, {});
}

export async function incrementStatusCount(status) {
  return withLock(async () => {
    const counts = await readJSON(STATUS_COUNTS_FILE, {});
    counts[status] = (counts[status] || 0) + 1;
    await writeJSON(STATUS_COUNTS_FILE, counts);
    return counts;
  });
}
