# Rei-volution — Track Your Hustle

A premium, responsive dashboard for tracking expenses, savings, attendance, tasks, and your
calendar in one place. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma,
and NextAuth — running on **Supabase Postgres**.

This is the **complete version**: authentication (hashed password + 6-digit security PIN), the
dashboard overview, Expenses, Savings, Tasks, Calendar, Attendance, Analytics, Notifications, and
a full Settings page (change password/PIN, preferences, CSV export, delete account) are all
wired up end-to-end — database → API → UI.

---

## 1. Tech stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS v4 (CSS-variable design tokens, dark/light mode)
- shadcn/ui-style components (Radix primitives) + Framer Motion
- Prisma ORM 7 (with the `@prisma/adapter-pg` driver adapter) + **Supabase Postgres**
- NextAuth v5 (Credentials provider, JWT sessions)
- bcryptjs for password + PIN hashing
- React Hook Form + Zod validation
- Recharts (charts) + FullCalendar (calendar) + Zustand (UI state)

---

## 2. Prerequisites

- **Node.js 20+** (Node 22 recommended) — https://nodejs.org
- **npm** (comes with Node)
- A [Supabase](https://supabase.com) account with a project created (free tier is fine)

Check your Node/npm versions:

```bash
node -v
npm -v
```

---

## 3. Get your Supabase connection strings

1. Open your project on [supabase.com](https://supabase.com/dashboard)
2. Click the **Connect** button at the top of the dashboard → **ORMs** tab → **Prisma**
3. Supabase shows you two ready-made connection strings, pre-filled with your actual project's
   host and project ref (not a placeholder — this is the important part). They'll look like:
   ```
   DATABASE_URL="postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   ```
4. Copy both **exactly as Supabase shows them**, then replace `[YOUR-PASSWORD]` with your actual
   database password (the one you set when creating the project — reset it under **Project
   Settings → Database** if you don't remember it).

> ⚠️ **The most common setup mistake:** copying the example strings from this README (or from
> `.env.example`) without replacing them with your *own* project's values from Supabase. Every
> placeholder in this project's `.env.example` is written as `REPLACE_WITH_...` for exactly this
> reason — if you still see that text anywhere in your `.env`, it hasn't been filled in yet.
>
> If your password has special characters (`@ # % & ...`), they need to be percent-encoded in
> the URL (e.g. `p@ss` → `p%40ss`). Copying Supabase's own string (rather than typing it by hand)
> avoids this entirely.

---

## 4. First-time setup

Unzip the project. **Make sure you `cd` into the folder that directly contains `package.json`**
— if your zip tool created a nested `rei-volution/rei-volution/` folder, go one level deeper.
You can check with `ls` (or `dir` on Windows) — you should see `package.json` in the listing.

```bash
# 1. Set up your environment file first
cp .env.example .env
```

Open `.env` and paste in your two Supabase connection strings (`DATABASE_URL` = pooler/6543,
`DIRECT_URL` = direct/5432), then generate a real auth secret:

```bash
openssl rand -base64 32   # paste the output as NEXTAUTH_SECRET in .env
```

> Fill in `.env` **before** running `npm install` — installing automatically runs
> `prisma generate` (via a `postinstall` hook), which needs `DIRECT_URL` to already be set.
> This is the same hook that makes deploying to Vercel work without any extra manual step.

Then:

```bash
# 2. Install dependencies (this also runs `prisma generate` automatically)
npm install

# 3. Sanity-check your connection strings actually work
npm run db:test

# 4. Create all the tables in your Supabase database
npm run db:migrate

# 5. Seed demo data (a sample user, expenses, savings accounts, tasks, calendar events)
npm run db:seed

# 6. Start the dev server
npm run dev
```

`db:test` (step 3) exists specifically to catch a bad connection string *before* you get a wall
of stack traces from migrate/seed/dev — if it fails, fix `.env` and re-run it until you see
`✓ Connected to the database successfully.` before moving on.

Open **http://localhost:3000** — you'll be redirected to `/login`.

### Demo account (created by the seed script)

```
Email:    demo@rei-volution.app
Password: Demo1234!
PIN:      123456
```

The PIN is asked for whenever you delete an expense, savings account, or task — try it out.

Or click **Create account** on the login page to sign up your own user from scratch.

> **Tip:** you can also browse and edit your data visually anytime with `npm run db:studio`, or
> directly in Supabase's own **Table Editor** in the dashboard — it's the same database either way.

---

## 5. Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string (port 6543, `?pgbouncer=true`) — used for normal app queries |
| `DIRECT_URL` | Supabase **direct** connection string (port 5432) — used only for `prisma migrate` |
| `NEXTAUTH_SECRET` | Signs session JWTs — must be random and kept secret in production |
| `NEXTAUTH_URL` | Base URL of your deployment (`http://localhost:3000` locally) |

---

## 6. Everyday commands

```bash
npm run dev          # start the dev server (http://localhost:3000)
npm run build         # production build
npm run start         # run the production build
npm run lint          # ESLint

npm run db:studio     # visual database browser (Prisma Studio)
npm run db:test       # check that your DATABASE_URL/DIRECT_URL actually connect
npm run db:migrate    # apply schema changes to Supabase
npm run db:generate   # regenerate the Prisma client after editing schema.prisma
npm run db:seed       # re-run the demo data seed (safe to run again)
```

If you ever change `prisma/schema.prisma`, run `npm run db:migrate` again to apply it.

> **Updating from an earlier copy of this project?** This version added a `Report` model and
> new fields on `Attendance` (`breakMinutes`, `expectedHours`, `undertimeMins`, `notes`). Run
> `npm run db:generate && npm run db:migrate` once after replacing your files to bring your
> existing database up to date — your existing data is untouched, this only adds new
> tables/columns.

---

## 7. What's implemented vs. what's next

**Everything below is working end-to-end (DB → API → UI):**
- Sign up (first/last name, email, company, job position, optional profile picture, password,
  6-digit PIN, terms checkbox) and log in, both with hashed credentials
- Collapsible sidebar, top bar with search/theme toggle/profile menu, dark & light mode,
  responsive mobile layout with a slide-out sidebar
- Dashboard overview: time-of-day greeting, company/role, stat cards, 6-month spending chart,
  category breakdown, upcoming events
- Expenses: create/edit/delete/archive, search, category & sort filters, pagination, weekly/
  monthly/yearly totals, CSV export
- Savings: multiple personal accounts (cash, bank, e-wallet, credit card, emergency, investment)
  plus a **visually separated Company Card section**, deposit/withdraw with running balance and
  transaction history, goal progress bars
- Tasks: kanban-style columns by status, priority, subtasks, and **automatic two-way sync with
  the calendar** (creating/editing/deleting a task updates its calendar event; color reflects
  status/priority/overdue)
- **Reports**: a separate panel under Tasks for daily/weekly write-ups — create, edit, delete,
  optionally link to a task, and **export any report as a PDF** with one click
- Calendar: month/week/day views, drag to reschedule, custom event creation (meetings,
  birthdays, deadlines)
- **Attendance**: clock in / lunch out / lunch in / clock out with automatic hours + overtime +
  late-minutes calculation, manual leave/holiday/absence marking, attendance rate and history,
  and a full **edit dialog** for every record — fix a mis-click, or hand-enter company hours,
  breaks, and times directly
- **Analytics**: year-over-year spending comparison, monthly bar chart, category pie chart,
  savings growth line chart (personal vs. company), task breakdown by status and priority,
  attendance rate
- **Notifications**: a live bell dropdown in the top bar — auto-generates alerts for tasks due
  within 2 days, exceeded monthly budget, and reached savings goals; mark-as-read, mark-all-read,
  and delete
- **Settings**: profile, theme, **currency selection that actually applies everywhere** (dashboard,
  expenses, savings, analytics all reformat instantly), timezone/monthly budget, change password,
  change PIN (both re-verify the current one first), CSV export, and PIN-gated delete account
- The cat and dog mascots throughout the app (sidebar, login/signup, app icon) are your own
  uploaded artwork, not placeholder drawings
- Security PIN modal gates every delete action app-wide

Nothing is stubbed anymore — every sidebar destination is a real, working page. Natural next
steps if you want to keep going: Excel export (CSV and PDF reports are done), CSV import, offline
support, and keyboard shortcuts.

---

## 8. Project structure

```
src/
  app/
    (auth)/login, (auth)/signup      # auth pages, shared branding layout
    dashboard/                       # protected app shell + all feature pages
    api/                             # REST-style route handlers (Prisma-backed)
  components/
    ui/                              # design-system primitives (button, card, dialog, ...)
    dashboard/                       # sidebar, topbar, stat cards, PIN modal
  lib/                                # prisma client, auth config, zod schemas, utils
  store/                              # zustand UI store (sidebar, PIN modal)
prisma/
  schema.prisma                      # full data model (12 tables) — models only, no connection info
  seed.ts                            # demo data
prisma.config.ts                     # Prisma 7 CLI config: connection URLs for migrate/studio/seed
```

---

## 9. Notes on security

- Passwords and PINs are hashed with bcrypt (12 salt rounds) — never stored in plain text.
- Session strategy is JWT via NextAuth; middleware protects every `/dashboard/*` route.
- The PIN check has its own endpoint (`/api/auth/verify-pin`) and is required client-side before
  destructive actions fire. For extra hardening, consider also passing the PIN with the delete
  request itself for defense-in-depth.
- Profile pictures are stored as base64 data URLs for simplicity — for heavier use, swap to
  **Supabase Storage** and store the file URL instead (it's already right there in your project).
- This app only uses Supabase for its Postgres database via Prisma — it does not use Supabase
  Auth, Realtime, or Storage. Your data lives in regular tables you can see in the Supabase Table
  Editor at any time.

---

## 10. Deploying it to the web (so you can use it from your phone)

Your Supabase database is already cloud-hosted, so the only thing left to deploy is the Next.js
app itself. The easiest path is **Vercel** (made by the Next.js team; free tier is plenty).

### Step 1 — Put the code on GitHub

```bash
cd rei-volution
git init
git add .
git commit -m "Rei-volution"
```

Create a new empty repo on [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/<your-username>/rei-volution.git
git branch -M main
git push -u origin main
```

### Step 2 — Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (GitHub login is easiest)
2. Click **Import** next to your `rei-volution` repo
3. Vercel auto-detects Next.js — leave the build settings as default
4. Before clicking Deploy, open **Environment Variables** and add all four from your `.env`:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Supabase pooled connection string (port 6543) |
   | `DIRECT_URL` | your Supabase direct connection string (port 5432) |
   | `NEXTAUTH_SECRET` | a random string — generate with `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | your Vercel URL, e.g. `https://rei-volution.vercel.app` (add this after the first deploy gives you the URL, then redeploy) |

Running the app locally with `npm run dev` and deploying it on Vercel aren't mutually
exclusive — they're the same codebase pointed at the same Supabase database. Vercel runs its own
`npm install` on its own servers, which automatically triggers `prisma generate` there (via the
`postinstall` script) — you don't need to do anything Prisma-related specifically for Vercel
beyond setting the environment variables above.

### Step 3 — Deploy

Click **Deploy** (or push a new commit — it redeploys automatically on every push to `main`).
Since your tables already exist in Supabase from `npm run db:migrate` in setup, there's nothing
else to migrate. Once it finishes, you'll get a live URL like `https://rei-volution.vercel.app`.

Open that URL on your phone's browser — sign up or log in, and it's the same app, fully working,
from anywhere.

**Custom domain (optional):** in the Vercel project settings under Domains, you can attach your
own domain (e.g. `reivolution.app`) if you own one — free, just point your DNS at Vercel.

---

## 11. Installing it on your phone's home screen

The app ships with a web app manifest and icons, so once it's deployed you can install it like a
native app:

- **iPhone (Safari):** open the site → tap the Share icon → **Add to Home Screen**
- **Android (Chrome):** open the site → tap the ⋮ menu → **Add to Home screen** / **Install app**

It'll launch full-screen, without the browser address bar, with the Rei-volution icon on your
home screen. Note this is "installable," not a full offline-capable PWA yet — you still need an
internet connection to load data, since it talks to your Supabase database. True offline support
(service worker caching) is on the "what's next" list in §7.

---

## 12. Troubleshooting

**"Cannot resolve environment variable: DIRECT_URL" during `npm install`** — the new
`postinstall` hook runs `prisma generate`, which needs `.env` to already have real values (see
§4) before you run `npm install`. On Vercel, this means `DATABASE_URL`/`DIRECT_URL` must be set
in the project's Environment Variables before the first deploy.

**"The datasource property `url`/`directUrl` is no longer supported in schema files"** — your
local environment resolved a different major version of Prisma than this project pins (this
project uses **Prisma 7**, where connection URLs live in `prisma.config.ts` instead of
`schema.prisma`). Delete `node_modules` and `package-lock.json`, then run `npm install` fresh so
the exact pinned versions in `package.json` take effect. Confirm with `npx prisma -v` — it should
report version 7.x.

**"Can't reach database server"** — by far the most common cause is that `.env` still has the
placeholder values from `.env.example` (anything reading `REPLACE_WITH_...`) instead of your
real Supabase strings. Run `npm run db:test` — it will tell you exactly this if it's the problem.
Otherwise: check for stray spaces/quotes, and make sure your Supabase project isn't paused
(free-tier projects pause after a week of inactivity — open the dashboard once to wake it up).

**Migration hangs or times out** — make sure `DIRECT_URL` is the port-`5432` string, not the
pooled one; `prisma migrate` needs a direct connection.

**"prepared statement already exists" errors at runtime** — this means `DATABASE_URL` is missing
`?pgbouncer=true`. Add it to the end of the pooled connection string.

**Next.js warns about "multiple lockfiles" / a nested folder** — this happens if the zip was
extracted into a folder that already had the same name, creating `rei-volution/rei-volution/`.
Always run `npm install` and `npm run dev` from the innermost folder — the one that directly
contains `package.json` — and delete any stray `node_modules`/`package-lock.json` sitting in the
outer folder by mistake.

**A `middleware` deprecation warning** — this project uses `src/proxy.ts` (Next.js 16's current
convention); if you see a warning about `middleware` being deprecated, you're looking at a stale
`.next` build cache — delete the `.next` folder and restart `npm run dev`.
