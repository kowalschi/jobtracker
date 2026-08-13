import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ManageList } from '../components/ManageList.jsx';
import { initials } from '../constants.js';

const emptyDesigner = { name: '', email: '', password: '', role: 'designer' };

const REQUEST_FIELD_LABELS = {
  name: 'Project name',
  account: 'Account',
  client: 'Client',
  startDate: 'Start date',
};

export function DashboardPage() {
  const { user } = useAuth();
  const {
    users,
    config,
    requests,
    loading,
    createUser,
    updateUser,
    deleteUser,
    addListItem,
    removeListItem,
    resolveChangeRequest,
  } = useData();
  const [form, setForm] = useState(emptyDesigner);
  const [error, setError] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  if (loading || !config) return <div className="page-loading">Loading dashboard…</div>;

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  async function handleResolveRequest(id, status) {
    await resolveChangeRequest(id, status);
  }

  async function handleAddDesigner(e) {
    e.preventDefault();
    setError('');
    try {
      await createUser(form);
      setForm(emptyDesigner);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActive(u) {
    await updateUser(u.id, { active: !u.active });
  }

  async function handleDelete(u) {
    if (!confirm(`Remove ${u.name}? Their past jobs stay on record but they won't be selectable anymore.`)) return;
    await deleteUser(u.id);
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!resetPassword.trim()) return;
    await updateUser(resetTarget.id, { password: resetPassword });
    setResetTarget(null);
    setResetPassword('');
  }

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p className="hint">Manage designers and the dropdown options used across job cards.</p>

      <section className="dashboard-section">
        <h2>Pending change requests</h2>
        {pendingRequests.length === 0 ? (
          <p className="hint">No pending requests.</p>
        ) : (
          <table className="job-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Field</th>
                <th>Current</th>
                <th>Requested</th>
                <th>Requested by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.jobName}</td>
                  <td>{REQUEST_FIELD_LABELS[r.field] || r.field}</td>
                  <td>{r.currentValue || '—'}</td>
                  <td>{r.requestedValue}</td>
                  <td>{r.requestedByName}</td>
                  <td className="row-actions">
                    <button className="btn-secondary" onClick={() => handleResolveRequest(r.id, 'approved')}>
                      Approve
                    </button>
                    <button className="btn-ghost" onClick={() => handleResolveRequest(r.id, 'rejected')}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Designers</h2>
        <table className="job-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="avatar avatar-sm" style={{ background: u.color }}>
                    {initials(u.name)}
                  </span>{' '}
                  {u.name}
                </td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.active === false ? 'Inactive' : 'Active'}</td>
                <td className="row-actions">
                  <button className="btn-ghost" onClick={() => setResetTarget(u)}>
                    Reset password
                  </button>
                  <button className="btn-ghost" onClick={() => handleToggleActive(u)}>
                    {u.active === false ? 'Reactivate' : 'Deactivate'}
                  </button>
                  {u.id !== user.id && (
                    <button className="btn-danger" onClick={() => handleDelete(u)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="add-designer-form" onSubmit={handleAddDesigner}>
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={6}
          />
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="designer">Designer</option>
            <option value="admin">Team lead / admin</option>
          </select>
          <button type="submit" className="btn-primary">
            + Add designer
          </button>
        </form>
        {error && <div className="form-error">{error}</div>}
      </section>

      <section className="dashboard-section dashboard-lists">
        <ManageList
          title="Accounts"
          items={config.accounts}
          onAdd={(v) => addListItem('accounts', v)}
          onRemove={(v) => removeListItem('accounts', v)}
        />
        <ManageList
          title="Clients"
          items={config.clients}
          onAdd={(v) => addListItem('clients', v)}
          onRemove={(v) => removeListItem('clients', v)}
        />
        <ManageList
          title="Project types"
          items={config.projectTypes}
          onAdd={(v) => addListItem('projectTypes', v)}
          onRemove={(v) => removeListItem('projectTypes', v)}
        />
        <ManageList
          title="Waiting-on statuses"
          hint="Who must respond next (column 9)."
          items={config.responseStatuses}
          onAdd={(v) => addListItem('responseStatuses', v)}
          onRemove={(v) => removeListItem('responseStatuses', v)}
        />
        <ManageList
          title="Job status pipeline"
          hint="Order shown here is the order of the board columns."
          items={config.jobStatuses}
          onAdd={(v) => addListItem('jobStatuses', v)}
          onRemove={(v) => removeListItem('jobStatuses', v)}
        />
      </section>

      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <form className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()} onSubmit={handleReset}>
            <div className="modal-header">
              <h2>Reset password — {resetTarget.name}</h2>
              <button type="button" className="btn-ghost" onClick={() => setResetTarget(null)}>
                ✕
              </button>
            </div>
            <label>
              New password
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </label>
            <div className="modal-actions">
              <div className="modal-actions-right">
                <button type="button" className="btn-ghost" onClick={() => setResetTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Set password
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
