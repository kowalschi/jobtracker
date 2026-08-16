import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(__dirname, '..', 'data');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');
export const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');
export const JOBS_INDEX_FILE = path.join(JOBS_DIR, '_index.json');
export const JOBS_COUNTER_FILE = path.join(JOBS_DIR, '_counter.json');
export const LOG_FILE = path.join(DATA_DIR, 'activity.json');
export const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
export const STATUS_COUNTS_FILE = path.join(DATA_DIR, 'statusCounts.json');

// A designer's jobs are sharded across numbered files once a shard grows
// past this size, so no single JSON file grows unbounded.
export const SHARD_MAX_BYTES = 500 * 1024; // 500 KB
export const SHARD_MAX_RECORDS = 300;
