import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { JobCard } from '../components/JobCard.jsx';
import { JobModal } from '../components/JobModal.jsx';
import { formatDate, priorityColor } from '../constants.js';

const PRIORITY_RANK = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export function BoardPage() {
  const { user } = useAuth();
  const { jobs, users, config, loading, error, createJob, updateJob, deleteJob, bumpFeedback, createChangeRequest } =
    useData();

  const [filters, setFilters] = useState({ designerId: 'all', projectType: 'all', account: 'all', search: '' });
  const [view, setView] = useState('board');
  const [sort, setSort] = useState('startDate');
  const [activeJob, setActiveJob] = useState(undefined); // undefined = closed, null = new, object = editing

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.designerId !== 'all' && j.designerId !== filters.designerId) return false;
      if (filters.projectType !== 'all' && j.projectType !== filters.projectType) return false;
      if (filters.account !== 'all' && j.account !== filters.account) return false;
      if (filters.search && !j.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [jobs, filters]);

  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    list.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'designer':
          return (usersById[a.designerId]?.name || '').localeCompare(usersById[b.designerId]?.name || '');
        case 'priority':
          return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
        case 'endDate':
          return (a.endDate || '9999').localeCompare(b.endDate || '9999');
        case 'startDate':
        default:
          return (a.startDate || '9999').localeCompare(b.startDate || '9999');
      }
    });
    return list;
  }, [filteredJobs, sort, usersById]);

  const columns = useMemo(() => (config ? config.jobStatuses : []), [config]);
  const jobsByStatus = useMemo(() => {
    const map = Object.fromEntries(columns.map((c) => [c, []]));
    for (const j of filteredJobs) {
      (map[j.status] ||= []).push(j);
    }
    return map;
  }, [filteredJobs, columns]);

  const newJobTemplate = user?.role === 'designer' ? { designerId: user.id } : null;

  if (loading || !config) return <div className="page-loading">Loading jobs…</div>;
  if (error) return <div className="page-loading form-error">{error}</div>;

  return (
    <div className="board-page">
      <div className="board-page-header">
        <h1>Jobs</h1>
        <button className="btn-primary" onClick={() => setActiveJob(newJobTemplate || {})}>
          + New job
        </button>
      </div>

      <FilterBar
        users={users}
        config={config}
        filters={filters}
        setFilters={setFilters}
        view={view}
        setView={setView}
        sort={sort}
        setSort={setSort}
      />

      {view === 'board' ? (
        <div className="kanban">
          {columns.map((status) => (
            <div className="kanban-column" key={status}>
              <div className="kanban-column-header">
                <span>{status}</span>
                <span className="count-pill">{jobsByStatus[status]?.length || 0}</span>
              </div>
              <div className="kanban-column-body">
                {(jobsByStatus[status] || []).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    designer={usersById[job.designerId]}
                    config={config}
                    onOpen={setActiveJob}
                    onBumpFeedback={bumpFeedback}
                    onQuickUpdate={(id, field, value) => updateJob(id, { [field]: value })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="job-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Current designer</th>
                <th>Account / Client</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Waiting on</th>
                <th>Feedback</th>
                <th>Notes</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => {
                const designer = usersById[job.designerId];
                return (
                  <tr key={job.id} onClick={() => setActiveJob(job)}>
                    <td className="job-table-name">{job.name}</td>
                    <td>
                      <span className="avatar avatar-sm" style={{ background: designer?.color || '#9AA5B1' }}>
                        {designer?.name?.slice(0, 1).toUpperCase() || '?'}
                      </span>{' '}
                      {designer?.name || 'Unassigned'}
                    </td>
                    <td>
                      {job.account} {job.client && `· ${job.client}`}
                    </td>
                    <td>{job.projectType}</td>
                    <td>{formatDate(job.startDate)}</td>
                    <td>{formatDate(job.endDate)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="quick-select"
                        value={job.status}
                        onChange={(e) => updateJob(job.id, { status: e.target.value })}
                        title="Change status"
                      >
                        {config.jobStatuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="quick-select"
                        value={job.responseStatus || ''}
                        onChange={(e) => updateJob(job.id, { responseStatus: e.target.value })}
                        title="Change waiting on"
                      >
                        <option value="">—</option>
                        {config.responseStatuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={job.designerChanged ? 'feedback-flagged' : ''}
                      title={job.designerChanged ? `Reassigned from ${job.previousDesigners.at(-1)?.name}` : ''}
                    >
                      {job.feedbackRounds}
                    </td>
                    <td className="job-table-notes" title={job.notes}>
                      {job.notes || '—'}
                    </td>
                    <td>
                      <span className="tag tag-priority" style={{ background: priorityColor(job.priority) }}>
                        {job.priority}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeJob !== undefined && (
        <JobModal
          key={activeJob?.id || 'new'}
          job={activeJob}
          users={users}
          config={config}
          onClose={() => setActiveJob(undefined)}
          onCreate={createJob}
          onUpdate={updateJob}
          onDelete={deleteJob}
          onRequestChange={createChangeRequest}
        />
      )}
    </div>
  );
}
