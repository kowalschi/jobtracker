import { formatDate, initials, priorityColor } from '../constants.js';

export function JobCard({ job, designer, config, onOpen, onBumpFeedback, onQuickUpdate }) {
  return (
    <div
      className={`job-card${job.designerChanged ? ' job-card-reassigned' : ''}${
        job.responseStatus === 'Finished' ? ' job-card-finished' : ''
      }`}
      onClick={() => onOpen(job)}
    >
      <div className="job-card-top">
        <div className="job-card-top-left">
          <span className="job-card-number">#{job.jobNumber ?? '—'}</span>
          <span className="tag tag-type">{job.projectType || 'N/A'}</span>
        </div>
        <span className="tag tag-priority" style={{ background: priorityColor(job.priority) }}>
          {job.priority}
        </span>
      </div>

      <h3 className="job-card-title">{job.name}</h3>
      <div className="job-card-meta">
        {job.account && <span>{job.account}</span>}
        {job.client && <span>· {job.client}</span>}
      </div>

      {job.jobAccount && (
        <div className="job-card-jobaccount">
          <span className="job-card-field-label">Job account</span>
          <span>{job.jobAccount}</span>
        </div>
      )}

      <div className="job-card-dates">
        <span>{formatDate(job.startDate)}</span>
        <span>→</span>
        <span>{formatDate(job.endDate)}</span>
      </div>

      {job.path && (
        <div className="job-card-path" title={job.path}>
          {job.path}
        </div>
      )}

      <div className="job-card-quick-row" onClick={(e) => e.stopPropagation()}>
        <select
          className="quick-select"
          value={job.status}
          onChange={(e) => onQuickUpdate(job.id, 'status', e.target.value)}
          title="Change status"
        >
          {config.jobStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="quick-select"
          value={job.responseStatus || ''}
          onChange={(e) => onQuickUpdate(job.id, 'responseStatus', e.target.value)}
          title="Change waiting on"
        >
          <option value="">Waiting on: —</option>
          {config.responseStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="job-card-footer">
        <div className="job-card-designer" title={designer?.name}>
          <span className="avatar avatar-sm" style={{ background: designer?.color || '#9AA5B1' }}>
            {designer ? initials(designer.name) : '?'}
          </span>
          <span>{designer?.name || 'Unassigned'}</span>
        </div>

        <div
          className={`feedback-counter${job.designerChanged ? ' feedback-counter-flagged' : ''}`}
          title={job.designerChanged ? `Reassigned from ${job.previousDesigners.at(-1)?.name}` : 'Feedback rounds'}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => onBumpFeedback(job.id, -1)} aria-label="Decrease feedback rounds">
            −
          </button>
          <span>{job.feedbackRounds}</span>
          <button onClick={() => onBumpFeedback(job.id, 1)} aria-label="Increase feedback rounds">
            +
          </button>
        </div>
      </div>

      {job.notes && (
        <div className="job-card-notes" title={job.notes}>
          {job.notes}
        </div>
      )}
    </div>
  );
}
