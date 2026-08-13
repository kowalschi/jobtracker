const TOKEN_KEY = 'jobtracker_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  getUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: payload }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  getConfig: () => request('/config'),
  addListItem: (listName, value) => request(`/config/${listName}`, { method: 'POST', body: { value } }),
  removeListItem: (listName, value) =>
    request(`/config/${listName}/${encodeURIComponent(value)}`, { method: 'DELETE' }),

  getJobs: () => request('/jobs'),
  createJob: (payload) => request('/jobs', { method: 'POST', body: payload }),
  updateJob: (id, payload) => request(`/jobs/${id}`, { method: 'PATCH', body: payload }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),
  feedback: (id, delta) => request(`/jobs/${id}/feedback`, { method: 'POST', body: { delta } }),
  reassign: (id, designerId) => request(`/jobs/${id}/reassign`, { method: 'POST', body: { designerId } }),

  getLogs: () => request('/logs'),

  getRequests: () => request('/requests'),
  createChangeRequest: (jobId, field, requestedValue) =>
    request('/requests', { method: 'POST', body: { jobId, field, requestedValue } }),
  resolveRequest: (id, status) => request(`/requests/${id}`, { method: 'PATCH', body: { status } }),
};
