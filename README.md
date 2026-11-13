# GLORY FIGHT CLUB — Website + CMS

**Live domains:** website https://gloryfightclub.vn · CMS https://cms.gloryfightclub.vn

A bilingual (Vietnamese–English) promotional website and a student-management system for Glory Fight Club.
Runs on **Cloudflare Workers** · **D1** (database) · **R2** (images). Framework: Astro 7 + React + Tailwind v4 + Drizzle.

Detailed plan: [`docs/PLAN.md`](docs/PLAN.md) · Context for AI/devs: [`CLAUDE.md`](CLAUDE.md)

---

## 1. Run locally

Requirements: **Node.js 22+** (24 recommended — the tests rely on Node's built-in TypeScript support). No database to install — local D1 is a SQLite file Wrangler creates in `.wrangler/`.

```bash
npm install
npm run db:reset     # create tables + load data (real + demo) into local D1
npm run dev          # open http://localhost:4321  (EN version: http://localhost:4321/en)
```

**CMS:** http://localhost:4321/admin — demo accounts (local only): `admin` / `glory2026` (owner), `hlv` / `glory2026` (coach, limited permissions).
On the club domain the CMS runs at `cms.gloryfightclub.vn`.

> Astro 7 allows only **one** `npm run dev` per project. If you see "Another astro dev server is already running", run `npx astro dev stop`.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with D1/R2 **emulated locally** (runs on Cloudflare's real runtime, workerd) |
| `npm run dev:remote` | Dev server that reads/writes the **real cloud D1 + R2** (careful: edits change real data) |
| `npm run db:reset` | Wipe local D1, recreate tables, load `seed/seed.sql` + `seed/sample.sql`. **Stop `npm run dev` first** (Windows cannot delete an open DB file) |
| `npm run db:generate` | After editing `src/db/schema.ts`: generate a new migration in `migrations/` |
| `npm run db:migrate` | Apply migrations to local D1 |
| `npm run build` / `npm run preview` | Production build / run the build locally |
| `npm run check` | TypeScript check |
| `npm test` | Quick tests (`tests/*.test.mjs`, Node's built-in test runner) |
| `npm run test:api` | Build and test key API writes against a disposable local D1 |

Seed data:
- `seed/seed.sql` — initial club data for the **local** database. It deletes existing rows; never run it against the cloud after the CMS has been used.
- `seed/sample.sql` — **demo data** (news, testimonials, FAQ, students…, marked "mẫu"). **Local only.**

## 2. Cloudflare resources

The club domains already use the production Worker, D1 database, and R2 bucket. The setup steps below are for a new environment. When moving accounts, copy and verify existing data and media before switching production. Never load either seed file into production.

Initial resource setup commands (run while authenticated to the **club account**):

```bash
npx wrangler login                       # log in to the Cloudflare account (opens a browser)
npx wrangler d1 create glory-db          # prints the database_id
npx wrangler r2 bucket create glory-media
```

1. Copy the printed `database_id` into **both places** in `wrangler.jsonc` (top level and `env.remote`).
2. Create the tables in the destination cloud database before importing the source data:
   ```bash
   npm run db:migrate:remote
   ```
3. If starting with an empty database, create the **real** owner account in the cloud (never use the demo accounts). For this move, transfer the existing owner account instead:
   ```bash
   node scripts/create-user.mjs <username> "<StrongPassword>" "<Full name>" owner --remote
   ```
   Coaches: the owner creates them in the CMS → Thêm → Tài khoản & phân quyền.
   Forgot the password → run the same command again with a new password to reset it.
4. Deploy:
   ```bash
   npm run deploy
   ```
   Wrangler prints `https://gloryfightclub.<account>.workers.dev` for a quick look.

## 3. Attach the domains

For `gloryfightclub.vn`, confirm that iNET delegates the domain to the nameservers shown in the club's Cloudflare zone. Preserve any existing mail and verification records when changing nameservers. Then deploy the Worker custom domains:

Cloudflare Dashboard → **Workers & Pages** → `gloryfightclub` → **Settings → Domains & Routes → Add → Custom domain**, and add:
- `gloryfightclub.vn` (website)
- `cms.gloryfightclub.vn` (CMS)

The custom domains are declared in `wrangler.jsonc`; Wrangler attaches them during deployment. Cloudflare provisions their DNS records and HTTPS certificates. Check that neither hostname already has a conflicting DNS record before deploying.

Worth enabling later (Cloudflare Dashboard, free):
- **Turnstile** on the trial form (anti-spam) — currently protected by a hidden honeypot field only.

For a manual release, apply pending migrations with `npm run db:migrate:remote`, run `npm run deploy`, then run `npm run db:enable-location-guard:remote`. The last command enables the student location trigger after the compatible Worker is live.

## Auto deploy (GitHub Actions)

Every **push to `main`** runs `.github/workflows/deploy.yml`:
TypeScript check → unit and API smoke tests → apply new D1 migrations (if any) → build + deploy to Cloudflare. Follow progress in the repo's **Actions** tab.
If the TypeScript check or a test fails, it stops and does **not** deploy — the running site is unaffected.

> **Active in production:** the repository secret is configured. See `docs/HANDOFF.md` for the latest verified deployment.

**One-time setup:**
1. Cloudflare Dashboard → top-right profile icon → **My Profile → API Tokens → Create Token**.
2. Pick the **"Edit Cloudflare Workers"** template → **Add more** permission: `Account` · `D1` · `Edit` → Account Resources: the club's Cloudflare account; Zone Resources: `gloryfightclub.vn` → **Create Token** → copy the token (shown only once). Ensure the token can deploy Workers, manage Worker routes/custom domains and access the new D1/R2 bindings.
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** → Name: `CLOUDFLARE_API_TOKEN`, Secret: paste the token → **Add secret**.
4. Open the **Actions** tab → workflow **Deploy** → **Run workflow** to test it (or push any commit).

Manual `npm run deploy` keeps working as before.

## 4. Backup / restore

D1 has **Time Travel**: restore the database to any point in the last 30 days.
```bash
npx wrangler d1 time-travel info glory-db
npx wrangler d1 time-travel restore glory-db --timestamp=2026-11-02T10:00:00+07:00
```
Export a copy to a file: `npx wrangler d1 export glory-db --remote --output=backup.sql`

## 5. Folder structure

```
src/db/schema.ts        database schema (single source) → migrations/ generated by drizzle-kit
src/middleware.ts       routes the public/CMS hosts + the English version /en/*
src/i18n.ts             VI/EN UI dictionary + helpers to pick *_en columns
src/lib/site.ts         shared club info (settings, locations)
src/layouts/            public page layout (header, footer, SEO, Call/Zalo buttons)
src/components/         Logo (SVG) and UI blocks
src/pages/              public pages; admin/ (CMS); api/ (→ src/api, Hono); media/ (R2 images)
src/api/                API: login, students, fees, trial classes, news, content, upload, accounts
src/admin/              CMS UI (React) — resources.ts declares the content sections
scripts/                create-user.mjs (create user / reset password), clear-local-db.mjs
seed/                   real + demo data
tests/                  node --test files
docs/                   plan, original logo
```
