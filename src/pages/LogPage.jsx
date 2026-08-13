import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const ACTION_LABELS = {
  create: 'Created job',
  update: 'Updated job',
  delete: 'Deleted job',
  feedback: 'Feedback rounds',
  reassign: 'Reassigned job',
  'request-approved': 'Approved change request',
};

function formatWhen(iso) {
  return new Date(iso).toLocaleString();
}

export function LogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getLogs()
      .then(({ logs }) => {
        if (!cancelled) setLogs(logs);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="page-loading">Loading activity…</div>;
  if (error) return <div className="page-loading form-error">{error}</div>;

  return (
    <div className="log-page">
      <h1>Activity log</h1>
      <p className="hint">What the team has been changing, most recent first.</p>
      <div className="table-wrap">
        <table className="job-table">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Job</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((entry) => (
              <tr key={entry.id}>
                <td>{formatWhen(entry.at)}</td>
                <td>{entry.userName}</td>
                <td>{ACTION_LABELS[entry.action] || entry.action}</td>
                <td>{entry.jobName}</td>
                <td>{entry.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
