# Project notes / handoff context

Working notes for picking this project back up on a different machine or in a
fresh session, without re-deriving everything from scratch. Not a user-facing
doc — see `README.md` for that.

## What this is

Job tracker for a small design team. React/Vite frontend, Express backend,
**no database** — everything is stored as JSON files on disk under
`server/data/` (gitignored, never committed).

## Deployment status

- **Live/real deployment**: Hetzner Webhosting ("Webhosting L" plan, account
  `innojobtracker`, panel is **KonsoleH**), domain **innojobtracker.de**
  (bought through Hetzner too, set up as an Addon Domain). Server IP
  `167.235.121.178`.
  - Deployed as a single Node.js app via KonsoleH's "Node.js configuration"
    screen: Script path `index.js`, Working directory = wherever the
    `server/` folder contents were uploaded (outside `public_html`, e.g.
    `~/job-tracker`). Secrets (`JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
    are set through that panel's Key/Value env-var fields, **not** a
    `server/.env` file.
  - Deploy flow: run `npm run build:deploy` locally (builds the frontend and
    copies it into `server/public/`), then upload `server/`'s contents
    (minus `data/` and `.env`) to the server.
  - **SSL: resolved.** `https://innojobtracker.de` is live. KonsoleH only
    offered paid certs on this plan (no free Let's Encrypt), so went with
    Cloudflare instead: domain's nameservers point to Cloudflare
    (`lewis.ns.cloudflare.com` / `journey.ns.cloudflare.com`), which issues
    its own free edge certificate to visitors. Cloudflare's SSL/TLS mode is
    set to **Flexible** — this matters: Hetzner's origin has no certificate
    of its own (hitting it directly on port 443 shows Hetzner's "HTTPS Not
    Available" placeholder), so Cloudflare must talk to the origin over
    plain HTTP (port 80), not HTTPS. If this ever gets switched to "Full"
    mode, it will break again with that same placeholder page reappearing —
    either install a real cert on the Hetzner origin first, or leave it on
    Flexible.
  - DNS/TLS troubleshooting note: a stale resolver cache (home ISP/router,
    separate from Windows' own cache) can keep serving pre-Cloudflare IPs
    for a while after a nameserver change — `ipconfig /flushdns` only
    clears the local Windows cache, not upstream ones. If something looks
    broken again, verify against a public resolver first (e.g.
    `nslookup -type=A innojobtracker.de 8.8.8.8`) before assuming the
    server/Cloudflare config is actually wrong.

- **Vercel** (`jobtracker-gilt.vercel.app`): an earlier deployment attempt,
  frontend-only (Vercel serverless functions can't run this app's
  file-storage backend as-is — ephemeral filesystem). Effectively superseded
  by the Hetzner deployment above, which hosts frontend + backend together.
  Not actively maintained — worth explicitly killing/redirecting once
  Hetzner + SSL is fully confirmed working, so there isn't a second
  half-working URL floating around.

## Data architecture (as of the last rewrite)

- `server/data/users.json` — team accounts (currently: Dan/admin,
  Octavian/designer, Cristi/designer).
- `server/data/config.json` — dropdown options + the job status pipeline
  (board columns). Current pipeline: To do → Checking job → Sent to agency
  for response → Working on feedback → Done.
- `server/data/jobs/<designerId>/<YYYY-MM>.json` — jobs, **one file per
  designer per calendar month**, keyed by the job's *creation* month (a job
  keeps living in that file even if reassigned to another designer later —
  only the designer-folder changes, not the month). Replaced an earlier
  size-based shard scheme; `jobStore.js`'s `migrateToMonthlyShards()` runs
  automatically on every startup and is a no-op once migrated.
- `server/data/jobs/_index.json` — jobId → `{ designerId, month }` lookup.
- `server/data/jobs/_counter.json` — global auto-incrementing job number
  (the `#N` shown in the UI), never reused even after deletes.
- `server/data/statusCounts.json` — cumulative "how many times has any job
  ever moved into this status" counts per pipeline column, shown as the
  pill in the top-right of each kanban column. Distinct from current
  occupancy — this one only goes up.
- `server/data/activity.json` — activity log (admin-only `/log` page),
  capped at the most recent 1000 entries.
- `server/data/requests.json` — pending/resolved change requests (see
  below).

All read-modify-write operations across these files go through a single
global mutex (`withLock` in `server/lib/fileStore.js`) to prevent lost
updates from concurrent requests — this was a real bug found and fixed
early on, not speculative hardening.

## Feature notes worth knowing before touching related code

- **Locked fields**: once a job's status is no longer the pipeline's first
  status, non-admins can't directly edit `account`, `startDate`, `client`,
  or `name` — they submit a change request (`server/routes/requests.js`)
  that an admin approves/rejects from the Dashboard.
- **"Job started by"**: `job.startedBy` is set once at creation and never
  changes; the modal shows "Job started by: X" and, if reassigned,
  ", reassigned to: Y". Falls back to `previousDesigners[0]` for jobs that
  predate this field.
- Express version is **4**, not 5 — the SPA-fallback catch-all route in
  `server/index.js` intentionally uses a regex (`/.*/`) instead of the
  string `'*'`, because that string form breaks under the newer
  `path-to-regexp` that ships with Express 5. Keep it a regex if this ever
  gets upgraded.
- `bcryptjs` (pure JS) is used deliberately instead of native `bcrypt` —
  no compilation step needed, matters for shared hosting like Hetzner.

## Cautionary tale

Earlier in development, `server/data` got wiped by a stray `rm -rf` while
setting up a test environment. Recovered fine (it was mostly fresh seed
data at the time), but it's the reason later testing in this project always
uses throwaway designers/jobs that get explicitly cleaned up afterward,
rather than experimenting against the real data files directly.

## Repo

https://github.com/kowalschi/jobtracker — `main` branch, no other branches.
