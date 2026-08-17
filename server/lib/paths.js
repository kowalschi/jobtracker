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

// DATA_DIR must never live inside server/public — that folder is served
// as static web content (see server/index.js), and anything under it is
// reachable by anyone who guesses the URL. DATA_DIR is a sibling of
// server/public, not a descendant of it — keep it that way.
