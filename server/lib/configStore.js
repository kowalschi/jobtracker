import { readJSON, writeJSON, withLock } from './fileStore.js';
import { CONFIG_FILE } from './paths.js';

export const DEFAULT_CONFIG = {
  accounts: ['P&G'],
  clients: [],
  projectTypes: ['DTP', 'DIGITAL', 'VIDEO'],
  responseStatuses: ['Finished', 'At client agency'],
  jobStatuses: ['To do', 'Checking job', 'Sent to agency for response', 'Working on feedback', 'Done'],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
};

// Lists the dashboard is allowed to add/remove items from.
export const EDITABLE_LISTS = ['accounts', 'clients', 'projectTypes', 'responseStatuses', 'jobStatuses'];

export async function getConfig() {
  const stored = await readJSON(CONFIG_FILE, null);
  if (!stored) {
    await writeJSON(CONFIG_FILE, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  // Merge in any new default keys added after a config file was already created.
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function addListItem(listName, value) {
  if (!EDITABLE_LISTS.includes(listName)) throw new Error('Unknown list');
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Value cannot be empty');
  return withLock(async () => {
    const config = await getConfig();
    if (!config[listName].some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      config[listName] = [...config[listName], trimmed];
      await writeJSON(CONFIG_FILE, config);
    }
    return config;
  });
}

export async function removeListItem(listName, value) {
  if (!EDITABLE_LISTS.includes(listName)) throw new Error('Unknown list');
  return withLock(async () => {
    const config = await getConfig();
    config[listName] = config[listName].filter((v) => v !== value);
    await writeJSON(CONFIG_FILE, config);
    return config;
  });
}
