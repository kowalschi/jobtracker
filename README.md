# Job Tracker

A Jira-style job tracker for a small design team. React + Vite on the front
end, a small Node/Express API on the back end, data stored as JSON files on
disk (one folder per designer, auto-sharded into multiple files once a
designer's job list gets large).

## Project layout

```
src/            React frontend (Vite)
server/         Express API + JSON file storage
server/data/    Runtime data (users.json, config.json, jobs/<designer>/*.json)
                — created automatically on first run, not committed to git
```

## First-time setup

```powershell
npm run setup          # installs both frontend and backend dependencies
```

Then create `server/.env` (copy the example below) with your own JWT secret
and admin login:

```
JWT_SECRET=some-long-random-string
ADMIN_EMAIL=you@agency.com
ADMIN_PASSWORD=pick-a-real-password
PORT=4000
```

If you skip this, the server still runs with a development secret and a
default admin account (`constantindan@gmail.com` / `ChangeMe123!`) — change
that password from the Dashboard immediately if you use the default.

## Running it

```powershell
npm run dev:all        # starts the API (port 4000) and the Vite dev server together
```

Open the URL Vite prints (usually http://localhost:5173). The frontend talks
to the API through Vite's dev proxy, so you only need to open one URL.

To run them separately: `npm run server` (API) and `npm run dev` (frontend)
in two terminals.

## How it's organized

- **Login** — every team member (designers + you) signs in with an email and
  password. Only an admin account can open the **Dashboard**.
- **Dashboard** (admin only) — add designers and set their passwords, and
  manage the dropdown options used on job cards: Accounts, Clients, Project
  types, "waiting on" statuses, and the job-status pipeline (the columns on
  the board).
- **Board** — jobs shown as a Kanban board grouped by status, or as a
  sortable table (by start/end date, job name, designer, priority). Filter
  by designer, project type, account, or search by name.
- **Job card** — click a card to edit any field (client, dates, path, notes,
  priority, etc.). The **feedback rounds** counter has +/− buttons right on
  the card so you don't need to open it. Changing a job's designer (from the
  edit form) is tracked automatically: the card gets an orange left border
  and the feedback counter is highlighted, with a tooltip showing who it was
  reassigned from.
- **Storage** — each designer's jobs live in their own JSON files under
  `server/data/jobs/<designerId>/`. Once a file grows past ~500KB or 300
  jobs, new jobs roll into a new numbered file automatically, so no single
  file grows without bound.

## Notes on the data store

This uses plain JSON files instead of a database, matching how the project
was originally scoped. It works well for a small team's worth of jobs. If
the team or job volume grows a lot, the same API layer (`server/lib/*Store.js`)
can be swapped for a real database without changing the frontend.
