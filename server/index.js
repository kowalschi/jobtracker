import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import { seed } from './lib/seed.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import configRoutes from './routes/config.js';
import jobRoutes from './routes/jobs.js';
import logRoutes from './routes/logs.js';
import requestRoutes from './routes/requests.js';
import statusCountRoutes from './routes/statusCounts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config', configRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/status-counts', statusCountRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serves the built frontend (see scripts/prepare-deploy.mjs) so this one
// process can be the whole app in production — cPanel's Node.js Selector
// maps a single app to a single port. In local dev this directory doesn't
// exist yet and Vite serves the frontend separately, so these are no-ops.
app.use(express.static(PUBLIC_DIR));
app.get(/.*/, (req, res, next) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

await seed();

app.listen(PORT, () => {
  console.log(`Job tracker API listening on http://localhost:${PORT}`);
});
