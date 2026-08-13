import { useState } from 'react';
import { formatDate } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';

const LOCKED_FIELDS = ['account', 'startDate', 'client', 'name'];

function RequestChangeInline({ job, field, onRequestChange, type = 'text', options }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!value) return;
    try {
      await onRequestChange(job.id, field, value);
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  if (sent) return <div className="request-sent-hint">Change request sent to admin.</div>;

  if (!open) {
    return (
      <button type="button" className="btn-ghost btn-small" onClick={() => setOpen(true)}>
        Request change…
      </button>
    );
  }

  return (
    <form className="request-change-form" onSubmit={submit}>
      {type === 'select' ? (
        <select value={value} onChange={(e) => setValue(e.target.value)} required autoFocus>
          <option value="" disabled>
            Select…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => setValue(e.target.value)} required autoFocus />
      )}
      <button type="submit" className="btn-secondary btn-small">
        Send
      </button>
      <button type="button" className="btn-ghost btn-small" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {error && <div className="form-error">{error}</div>}
    </form>
  );
}

const emptyJob = {
  designerId: '',
  account: '',
  client: '',
  projectType: '',
  name: '',
  startDate: '',
  endDate: '',
  path: '',
  responseStatus: '',
  status: 'To do',
  notes: '',
  priority: 'Medium',
};

export function JobModal({ job, users, config, onClose, onCreate, onUpdate, onDelete, onRequestChange }) {
  const { user: currentUser } = useAuth();
  const isNew = !job?.id;
  const [form, setForm] = useState(() => (isNew ? { ...emptyJob, ...job } : { ...job }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const notStartedStatus = config.jobStatuses[0];
  const started = !isNew && job.status !== notStartedStatus;
  const locked = (field) => started && !isAdmin && LOCKED_FIELDS.includes(field);

  // Jobs created before this field existed won't have startedBy set — fall
  // back to the earliest known designer (first reassignment entry, or the
  // job's current designer if it's never been reassigned) so the note still
  // shows for pre-existing data.
  const startedById = job?.startedBy || job?.previousDesigners?.[0]?.id || job?.designerId;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.designerId || !form.name) {
      setError('Designer and project name are required.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await onCreate(form);
      } else {
        await onUpdate(job.id, form);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${job.name}"? This can't be undone.`)) return;
    setSaving(true);
    try {
      await onDelete(job.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const activeDesigners = users.filter((u) => u.active !== false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'New job' : form.name}</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {!isNew && startedById && (
          <div
            className="modal-flag modal-flag-info"
            title={
              job.previousDesigners.length
                ? `Reassigned ${job.previousDesigners.length} time(s) — previously: ${job.previousDesigners
                    .map((p) => p.name)
                    .join(', ')}`
                : undefined
            }
          >
            Job started by: <strong>{users.find((u) => u.id === startedById)?.name || 'Unknown'}</strong>
            {job.designerChanged && (
              <>
                , reassigned to <strong>{users.find((u) => u.id === job.designerId)?.name || 'Unknown'}</strong>
              </>
            )}
          </div>
        )}

        <div className="modal-grid">
          <label>
            Project name
            {locked('name') ? (
              <>
                <input value={form.name} disabled />
                <RequestChangeInline job={job} field="name" onRequestChange={onRequestChange} />
              </>
            ) : (
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
            )}
          </label>

          <label>
            Current designer
            <select value={form.designerId} onChange={(e) => set('designerId', e.target.value)} required>
              <option value="" disabled>
                Select designer…
              </option>
              {activeDesigners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Account
            {locked('account') ? (
              <>
                <select value={form.account} disabled>
                  <option value={form.account}>{form.account || '—'}</option>
                </select>
                <RequestChangeInline
                  job={job}
                  field="account"
                  onRequestChange={onRequestChange}
                  type="select"
                  options={config.accounts}
                />
              </>
            ) : (
              <select value={form.account} onChange={(e) => set('account', e.target.value)}>
                <option value="">—</option>
                {config.accounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label>
            Client
            {locked('client') ? (
              <>
                <select value={form.client} disabled>
                  <option value={form.client}>{form.client || '—'}</option>
                </select>
                <RequestChangeInline
                  job={job}
                  field="client"
                  onRequestChange={onRequestChange}
                  type="select"
                  options={config.clients}
                />
              </>
            ) : (
              <select value={form.client} onChange={(e) => set('client', e.target.value)}>
                <option value="">—</option>
                {config.clients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label>
            Project type
            <select value={form.projectType} onChange={(e) => set('projectType', e.target.value)}>
              <option value="">—</option>
              {config.projectTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {config.priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start date
            {locked('startDate') ? (
              <>
                <input type="date" value={form.startDate || ''} disabled />
                <RequestChangeInline job={job} field="startDate" onRequestChange={onRequestChange} type="date" />
              </>
            ) : (
              <input type="date" value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
            )}
          </label>

          <label>
            End date
            <input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
          </label>

          <label>
            Status of job
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {config.jobStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            Waiting on / response status
            <select value={form.responseStatus} onChange={(e) => set('responseStatus', e.target.value)}>
              <option value="">—</option>
              {config.responseStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="span-2">
            Path of job
            <input value={form.path} onChange={(e) => set('path', e.target.value)} placeholder="\\server\jobs\..." />
          </label>

          <label className="span-2">
            Notes
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </label>
        </div>

        {!isNew && (
          <div className="modal-footnote">
            Feedback rounds: <strong>{form.feedbackRounds}</strong> (use the +/− counter on the card) · Created{' '}
            {formatDate(job.createdAt)} · Updated {formatDate(job.updatedAt)}
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          {!isNew && (
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={saving}>
              Delete
            </button>
          )}
          <div className="modal-actions-right">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create job' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
