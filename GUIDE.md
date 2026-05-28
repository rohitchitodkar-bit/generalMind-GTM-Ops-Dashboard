# GTM Dashboard — Setup & Deployment Guide

Complete step-by-step guide for someone using this stack for the first time.

---

## What You Need Installed First

Install these once on your machine if you don't have them:

1. **Node.js** (v18 or newer) — https://nodejs.org → download the LTS version, run the installer
2. **Git** — https://git-scm.com → download and install
3. **VS Code** (optional but recommended) — https://code.visualstudio.com

Verify they're installed by opening a terminal (PowerShell on Windows) and running:
```
node --version    # should print v18.x.x or higher
git --version     # should print git version 2.x.x
```

---

## Part 1 — Run Locally

### Step 1: Install project dependencies

Open a terminal, navigate to this folder, and run:
```
npm install
```
This downloads all the libraries the project needs into a `node_modules/` folder. Takes 1-2 minutes.

### Step 2: Set up your environment variables

Copy the example file:
```
cp .env.example .env.local
```
Open `.env.local` and set two values:
```
DASHBOARD_PASSWORD=pick-any-password-you-want
AUTH_SECRET=any-long-random-string-at-least-32-characters
```
- `DASHBOARD_PASSWORD` — what users type on the login screen
- `AUTH_SECRET` — used to sign the session cookie (keep it secret, make it long and random)

### Step 3: Place your real CSV files

Put your three CSV files inside the `data/` folder:
```
data/
  hubspot_activities.csv
  outbound_logs.csv
  hs_communicated.csv
```
The `data/` folder is in `.gitignore` — these files will never be committed to GitHub.

Column names must match exactly what is documented in `KPIs.md`. If column names differ, update the field references in `scripts/process-data.mjs`.

### Step 4: Process your data

Run the ETL script that reads your CSVs and computes all 14 KPIs:
```
npm run process-data
```
This generates `src/data/kpis.json` — a privacy-safe aggregated file (no raw contact data).

You should see output like:
```
✓ KPIs written to src/data/kpis.json
  Logs processed : 20334
  Decided        : 18500
  Approval rate  : 74.3%
  ...
```

### Step 5: Start the development server
```
npm run dev
```
Open your browser at **http://localhost:3000**

You'll see the login page. Enter the password you set in `.env.local` and you're in.

---

## Part 2 — Deploy to Vercel

### Step 1: Create a GitHub repository

Go to https://github.com → click **New repository** → name it `gtm-dashboard` → set it to **Private** → click **Create repository**.

### Step 2: Push your code to GitHub

In the project folder, run these commands one by one:
```
git init
git add .
git commit -m "Initial dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/gtm-dashboard.git
git push -u origin main
```
Replace `YOUR-USERNAME` with your GitHub username.

> **Important:** The `.gitignore` is already set up to exclude:
> - `/data/*.csv` — your raw CSV files (privacy)
> - `.env.local` — your secrets
>
> What IS committed: `src/data/kpis.json` (aggregated, no raw data), all source code.

### Step 3: Create a Vercel account

Go to https://vercel.com → sign up with your GitHub account.

### Step 4: Import the project into Vercel

1. In Vercel, click **Add New → Project**
2. Find your `gtm-dashboard` repository and click **Import**
3. Leave all build settings as default (Vercel auto-detects Next.js)
4. Before clicking **Deploy**, expand **Environment Variables** and add:

| Name | Value |
|---|---|
| `DASHBOARD_PASSWORD` | your chosen password |
| `AUTH_SECRET` | your long secret string (different from DASHBOARD_PASSWORD) |

5. Click **Deploy**

Vercel builds and deploys automatically. Takes about 1 minute.

### Step 5: Your dashboard is live

Vercel gives you a URL like `https://gtm-dashboard-abc123.vercel.app`

Share this URL with your team. They'll see the login screen and need the password.

---

## Part 3 — Updating the Dashboard with New Data

Every time you want to refresh the data:

1. Replace the CSV files in `data/` with updated versions
2. Run `npm run process-data` — regenerates `src/data/kpis.json`
3. Commit and push the updated JSON:
```
git add src/data/kpis.json
git commit -m "Refresh dashboard data"
git push
```
Vercel automatically redeploys within ~1 minute of the push.

---

## Project Structure Reference

```
gtm-dashboard/
│
├── data/                        ← PUT YOUR CSV FILES HERE (gitignored)
│   ├── hubspot_activities.csv
│   ├── outbound_logs.csv
│   └── hs_communicated.csv
│
├── scripts/
│   └── process-data.mjs         ← ETL script: CSVs → kpis.json
│
├── src/
│   ├── app/
│   │   ├── page.tsx             ← Main dashboard page
│   │   ├── layout.tsx           ← HTML shell
│   │   ├── globals.css          ← Global styles
│   │   ├── login/page.tsx       ← Login screen
│   │   └── api/login/route.ts   ← Password check API
│   │
│   ├── components/
│   │   ├── CsuiteSection.tsx    ← Layer 1 — C-Suite KPIs
│   │   ├── SalesLeadSection.tsx ← Layer 2 — Sales Lead KPIs
│   │   ├── OperatorSection.tsx  ← Layer 3 — Operator KPIs
│   │   ├── MetricCard.tsx       ← Reusable number card
│   │   └── SectionHeader.tsx    ← Section label + title
│   │
│   └── data/
│       └── kpis.json            ← Generated by process-data.mjs (committed)
│
├── middleware.ts                 ← Auth guard: redirects to /login if no cookie
├── .env.local                   ← Your secrets (NOT committed)
├── .env.example                 ← Template (committed, no secrets)
├── .gitignore
├── package.json
└── GUIDE.md                     ← This file
```

---

## Common Issues & Fixes

**"Cannot find module 'papaparse'"**
→ Run `npm install` again.

**Login page shows but password doesn't work**
→ Check `.env.local` exists and `DASHBOARD_PASSWORD` is set correctly. Restart `npm run dev` after changing env files.

**Charts are blank / dashboard shows no data**
→ Make sure you ran `npm run process-data` and it printed "KPIs written". Check that your CSV column names match the schema.

**Vercel build fails**
→ Check that you added `DASHBOARD_PASSWORD` and `AUTH_SECRET` in Vercel's Environment Variables settings.

**"Column not found" error in process-data.mjs**
→ Your CSV column names don't match the expected schema. Open `scripts/process-data.mjs` and update the field names to match your actual CSV headers.
