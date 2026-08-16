import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getAllJobs, createJob, updateJob, deleteJob, getJobById } from '../lib/jobStore.js';
import { findById as findUserById } from '../lib/userStore.js';
import { getConfig } from '../lib/configStore.js';
import { addLog } from '../lib/logStore.js';
import { incrementStatusCount } from '../lib/statusCountStore.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// Once a job has left the "not started" status, non-admins can no longer
// touch these fields directly — they have to submit a change request
// (see routes/requests.js) that an admin approves.
export const LOCKED_FIELDS = ['account', 'startDate', 'client', 'name'];

const FIELD_LABELS = {
  name: 'Project name',
  designerId: 'Current designer',
  account: 'Account',
  jobAccount: 'Job account',
  client: 'Client',
  projectType: 'Project type',
  startDate: 'Start date',
  endDate: 'End date',
  path: 'Path',
  responseStatus: 'Waiting on',
  status: 'Status',
  notes: 'Notes',
  priority: 'Priority',
};

router.get('/', requireAuth, async (req, res) => {
  const jobs = await getAllJobs();
  res.json({ jobs });
});

router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.designerId || !b.name) {
    return res.status(400).json({ error: 'designerId and name are required' });
  }
  const designer = await findUserById(b.designerId);
  if (!designer) return res.status(400).json({ error: 'Unknown designer' });

  const now = new Date().toISOString();
  const job = {
    id: nanoid(12),
    designerId: b.designerId,
    startedBy: b.designerId,
    account: b.account || '',
    jobAccount: b.jobAccount || '',
    client: b.client || '',
    projectType: b.projectType || '',
    name: b.name,
    startDate: b.startDate || null,
    endDate: b.endDate || null,
    path: b.path || '',
    responseStatus: b.responseStatus || '',
    status: b.status || 'To do',
    feedbackRounds: Number.isFinite(b.feedbackRounds) ? b.feedbackRounds : 0,
    notes: b.notes || '',
    priority: b.priority || 'Medium',
    designerChanged: false,
    previousDesigners: [],
    createdAt: now,
    updatedAt: now,
    createdBy: req.userId,
  };
  await createJob(job);
  await incrementStatusCount(job.status);

  const actor = await findUserById(req.userId);
  await addLog({
    userId: req.userId,
    userName: actor?.name || 'Unknown',
    action: 'create',
    jobId: job.id,
    jobName: job.name,
    details: `Created job, assigned to ${designer.name}`,
  });

  res.status(201).json({ job });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await getJobById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const updates = { ...req.body };
  delete updates.id;
  delete updates.designerChanged;
  delete updates.previousDesigners;
  delete updates.createdAt;
  delete updates.createdBy;
  delete updates.startedBy;
  delete updates.jobNumber;

  const isAdmin = req.userRole === 'admin';
  if (!isAdmin) {
    const config = await getConfig();
    const notStartedStatus = config.jobStatuses[0];
    const started = existing.status !== notStartedStatus;
    if (started) {
      const locked = LOCKED_FIELDS.filter((f) => updates[f] !== undefined && updates[f] !== existing[f]);
      if (locked.length) {
        return res.status(403).json({
          error: `Job has started — ${locked.map((f) => FIELD_LABELS[f]).join(', ')} can only be changed by an admin. Submit a change request instead.`,
        });
      }
    }
  }

  // Reassigning through the general PATCH endpoint (e.g. editing the job
  // form) is also flagged as a designer change, same as the dedicated
  // /reassign action.
  if (updates.designerId && updates.designerId !== existing.designerId) {
    const newDesigner = await findUserById(updates.designerId);
    if (!newDesigner) return res.status(400).json({ error: 'Unknown designer' });
    const oldDesigner = await findUserById(existing.designerId);
    updates.designerChanged = true;
    updates.previousDesigners = [
      ...existing.previousDesigners,
      { id: existing.designerId, name: oldDesigner?.name || 'Unknown', at: new Date().toISOString() },
    ];
  }

  const updated = await updateJob(req.params.id, updates);

  if (updates.status && updates.status !== existing.status) {
    await incrementStatusCount(updates.status);
  }

  const changedFields = Object.keys(updates).filter((f) => FIELD_LABELS[f] && updates[f] !== existing[f]);
  if (changedFields.length) {
    const actor = await findUserById(req.userId);
    const parts = await Promise.all(
      changedFields.map(async (f) => {
        if (f === 'designerId') {
          const oldD = await findUserById(existing.designerId);
          const newD = await findUserById(updates.designerId);
          return `${FIELD_LABELS[f]}: "${oldD?.name || 'Unassigned'}" → "${newD?.name || 'Unassigned'}"`;
        }
        return `${FIELD_LABELS[f]}: "${existing[f] ?? ''}" → "${updates[f] ?? ''}"`;
      })
    );
    await addLog({
      userId: req.userId,
      userName: actor?.name || 'Unknown',
      action: 'update',
      jobId: existing.id,
      jobName: updates.name || existing.name,
      details: parts.join('; '),
    });
  }

  res.json({ job: updated });
});

router.post('/:id/feedback', requireAuth, async (req, res) => {
  const delta = req.body?.delta === -1 ? -1 : 1;
  const existing = await getJobById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const feedbackRounds = Math.max(0, (existing.feedbackRounds || 0) + delta);
  const updated = await updateJob(req.params.id, { feedbackRounds });

  const actor = await findUserById(req.userId);
  await addLog({
    userId: req.userId,
    userName: actor?.name || 'Unknown',
    action: 'feedback',
    jobId: existing.id,
    jobName: existing.name,
    details: `Feedback rounds ${delta > 0 ? '+1' : '-1'} (now ${feedbackRounds})`,
  });

  res.json({ job: updated });
});

router.post('/:id/reassign', requireAuth, async (req, res) => {
  const { designerId } = req.body || {};
  const existing = await getJobById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  if (!designerId || designerId === existing.designerId) {
    return res.status(400).json({ error: 'Provide a different designerId to reassign to' });
  }
  const newDesigner = await findUserById(designerId);
  if (!newDesigner) return res.status(400).json({ error: 'Unknown designer' });
  const oldDesigner = await findUserById(existing.designerId);

  const updated = await updateJob(req.params.id, {
    designerId,
    designerChanged: true,
    previousDesigners: [
      ...existing.previousDesigners,
      { id: existing.designerId, name: oldDesigner?.name || 'Unknown', at: new Date().toISOString() },
    ],
  });

  const actor = await findUserById(req.userId);
  await addLog({
    userId: req.userId,
    userName: actor?.name || 'Unknown',
    action: 'reassign',
    jobId: existing.id,
    jobName: existing.name,
    details: `Reassigned from ${oldDesigner?.name || 'Unknown'} to ${newDesigner.name}`,
  });

  res.json({ job: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await getJobById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const ok = await deleteJob(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Job not found' });

  const actor = await findUserById(req.userId);
  await addLog({
    userId: req.userId,
    userName: actor?.name || 'Unknown',
    action: 'delete',
    jobId: existing.id,
    jobName: existing.name,
    details: `Deleted job "${existing.name}"`,
  });

  res.status(204).end();
});

export default router;
