export const PRIORITY_COLORS = {
  Low: '#6FCF97',
  Medium: '#56CCF2',
  High: '#F2994A',
  Urgent: '#E4685D',
};

export function priorityColor(priority) {
  return PRIORITY_COLORS[priority] || '#9AA5B1';
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
