import { Router } from 'express';
import { getRequests, createRequest, resolveRequest } from '../lib/requestStore.js';
import { getJobById, updateJob } from '../lib/jobStore.js';
import { findById as findUserById } from '../lib/userStore.js';
import { addLog } from '../lib/logStore.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';
import { LOCKED_FIELDS } from './jobs.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const requests = await getRequests();
  res.json({ requests: [...requests].reverse() });
});

router.post('/', requireAuth, async (req, res) => {
  const { jobId, field, requestedValue } = req.body || {};
  if (!jobId || !field || !requestedValue) {
    return res.status(400).json({ error: 'jobId, field and requestedValue are required' });
  }
  if (!LOCKED_FIELDS.includes(field)) {
    return res.status(400).json({ error: 'That field cannot be requested for change' });
  }
  const job = await getJobById(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const requester = await findUserById(req.userId);

  const request = await createRequest({
    jobId,
    jobName: job.name,
    field,
    currentValue: job[field],
    requestedValue,
    requestedBy: req.userId,
    requestedByName: requester?.name || 'Unknown',
  });
  res.status(201).json({ request });
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }
  const requests = await getRequests();
  const existing = requests.find((r) => r.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Request not found' });
  if (existing.status !== 'pending') {
    return res.status(400).json({ error: 'Request was already resolved' });
  }

  const updated = await resolveRequest(req.params.id, { status, resolvedBy: req.userId });

  if (status === 'approved') {
    await updateJob(existing.jobId, { [existing.field]: existing.requestedValue });
    const admin = await findUserById(req.userId);
    await addLog({
      userId: req.userId,
      userName: admin?.name || 'Unknown',
      action: 'request-approved',
      jobId: existing.jobId,
      jobName: existing.jobName,
      details: `Approved change request from ${existing.requestedByName}: ${existing.field} → "${existing.requestedValue}"`,
    });
  }

  res.json({ request: updated });
});

export default router;
