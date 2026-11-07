# AGENTS.md — Glory Fight Club (briefing for Codex and other coding agents)

This file is the entry point for any agent other than Claude Code. It gives the whole picture in one read. Two other files hold more detail:
- **`CLAUDE.md`**: the full rulebook, with every convention and pitfall. It applies to you too. Read the section you need before you touch that area.
- **`docs/HANDOFF.md`**: current state, the owner's to-dos and open questions.

If this file and `CLAUDE.md` disagree, `CLAUDE.md` wins. Fix this file in the same change.

---

## 1. What this is

**GLORY FIGHT CLUB** is a martial-arts gym in Ho Chi Minh City with 2 locations. It teaches MMA, Kudo, Muay Thai / Kickboxing, BJJ / Grappling and Boxing.

This repo has two parts, and both run as one Cloudflare Worker:

| Part | URL | Who uses it |
|---|---|---|
| Public site (bilingual VI at `/`, EN at `/en/...`) | https://gloryfightclub.huutrong203.id.vn | Visitors. Promotion and trial-class sign-up only. No visitor accounts, likes or comments. |
| CMS (Vietnamese only, built for phones) | https://cms-gloryfightclub.huutrong203.id.vn | Club owner (`owner`) and coaches (`coach`, with permissions the owner ticks) |

The CMS manages students, monthly fees and **all** public content.

Out of scope, by the owner's decision:
- online payment or QR codes on the site;
- attendance;
- belt exams;
- student photos.

This is a personal project. The repo `github.com/nhuutrong203/gloryfightclub` is **public**, so never commit secrets, passwords, account emails or private data.

## 2. Stack

- **Astro 7 SSR** with `@astrojs/cloudflare` 14, on **Cloudflare Workers**.
- **React**: the CMS is a single-page app at `/admin`, with its own small hand-written router.
- **Hono**: every API route under `/api/*`, through `src/pages/api/[...path].ts`.
- **Cloudflare D1** (SQLite) with **Drizzle ORM**, and **Cloudflare R2** for images and videos.
- **Tailwind CSS v4**. Shared classes are `@utility` blocks in `src/styles/global.css`.
- **zod** validates every input on the server, with Vietnamese error messages.
- Bindings come from `import { env } from 'cloudflare:workers'`, not from `Astro.locals.runtime`.

## 3. Where things are

```
src/pages/             public pages (.astro); api/[...path].ts → Hono; admin/[...path].astro → CMS; media/[...key].ts serves R2
src/components/public/ public building blocks (PlanCard, CoachCard, PageHero, TestimonialBand, Marquee, …)
src/layouts/           PublicLayout.astro (header, footer, lightbox, live class state, JSON-LD)
src/lib/               public.ts (public queries) · site.ts (getSite, thumbUrl) · schedule.ts · html.ts · util.ts · auth.ts · medals.ts · import.ts
src/api/               index.ts (CSRF + auth middleware) · guard.ts (need/body) · content.ts (generic CRUD) · students · fees · trials · posts · admin · public
src/admin/             React CMS: App.tsx, lib.ts (api, upload, useDirty), ui.tsx, resources.ts (single source for content forms), pages/*
src/db/schema.ts       Drizzle schema → migrations/ (drizzle-kit generate, applied with wrangler)
src/i18n.ts            every fixed UI string (`dict`, VI + EN) + t(), tr(), href()
src/scripts/motion.ts  public-site animations
seed/seed.sql          REAL club data (it was loaded to the cloud) · seed/sample.sql = local demo data only
tests/*.test.mjs       node --test (they import the .ts files directly)
```

## 4. Run it

```bash
npm install
npm run db:reset   # local D1: migrations + seed.sql + sample.sql (stop the dev server first on Windows)
npm run dev        # http://localhost:4321 (EN: /en) · CMS: http://localhost:4321/admin
npm run check      # astro check — must be 0 errors
npm test           # unit tests — must pass
```

Local demo logins come from `seed/sample.sql` and exist **only locally**: `admin` (owner) and `hlv` (coach), password `glory2026`.

Astro 7 allows only **one dev server per project**. Stop it before another command that needs the local DB file.

## 5. Hard rules

1. **Never deploy without the owner's explicit "deploy" in chat.**
   - Deploys are manual: `npm run deploy` (it builds, then runs `wrangler deploy`).
   - The GitHub Actions deploy fails on purpose: there is no `CLOUDFLARE_API_TOKEN` secret, by decision. Ignore that red CI.
2. **Schema change**, in this order:
   - edit `src/db/schema.ts`;
   - `npm run db:generate`, and commit the migration;
   - `npm run db:migrate` (local);
   - when deploying: `npm run db:migrate:remote` **before** `npm run deploy`.

   Migrations only add things (columns, tables), because the old code keeps running during the migration. drizzle-kit drops `ON DELETE` on `ALTER … REFERENCES`, so add it by hand.
3. **Never run `npm run db:seed:remote` and never load `seed/sample.sql` to the cloud.**
   - `seed.sql` starts with `DELETE FROM …`, so it would wipe everything the owner has edited in the CMS.
   - To change live data, write targeted `UPDATE`s, or let the owner edit in the CMS.
4. **No hard-coded public text.**
   - Content comes from D1.
   - Fixed UI strings are keys in `dict` (`src/i18n.ts`), and the owner can edit them in CMS → "Chữ trên website".
   - Every public text column has an `_en` twin that falls back to the VI text when empty.
   - A new CMS field must show up somewhere on the site, or it should not exist.
5. **Simple content sections are generated from `src/admin/resources.ts`**: the CMS form, the API's zod schema and the writable columns all come from it. To add a content column, add a field there.
6. **Permissions are enforced in the API** with `need()`. The UI only shows or hides things.
   - Student data never leaves through a public route.
   - On the public host, `/api/admin/*` and `/api/auth/*` answer 404.
7. **Images are stored as R2 keys, never URLs**, and served through `/media/*`.
   - Cards and grids use `thumbUrl(key)`, the 800px copy.
   - After a write, `deleteMedia()` removes images that nothing references any more.
8. **Language**:
   - UI, content and seed data are Vietnamese.
   - Code identifiers are English; DB columns are snake_case.
   - Markdown docs and commit messages are **English**.
   - Commit and push only to `nhuutrong203/gloryfightclub`.
9. **D1 limits**:
   - at most 100 bound parameters per statement, so never `inArray` over a long list;
   - only a few `UNION`s per query;
   - 50 queries per request on the Free plan, so batch writes with `db.batch`.
10. **Every animation has a `prefers-reduced-motion` branch.**

## 6. Pitfalls that bite

- In `.astro`, an HTML comment `<!-- -->` **inside** `{cond && (…)}` or a ternary is a compile error. Put it before the `{…}`.
- Uppercase Vietnamese headings in Anton need `line-height ≥ 1.12`, because the stacked accents get clipped. Use `leading-none` only on numbers.
- Small red text on a dark background uses `text-glory-bright`. `glory` (#E10600) is for buttons and large text only.
- In client scripts, use `appendChild`, not `append`: the Workers types shadow the DOM signature and `astro check` fails.
- Pages are cached (`max-age=60`). Anything that depends on "now" (live class, today) is computed on the client, in Vietnam time (`Asia/Ho_Chi_Minh`).
- Site info (`club`, `hero`, `texts`, `policy`, `locations`) is loaded once per request into `Astro.locals.site`. Never call `getSite()` from a page.
- Shell here-docs sometimes lose a backslash in `\n`, `\\'` or `<`. Re-read the file after a scripted edit.

## 7. Business facts

- Classes are named by day group: `246` = Mon·Wed·Fri, `357` = Tue·Thu·Sat, `8` = Sunday. On the site, Sunday is shown as **"CN"**, never "8".
- 4 monthly plans:

  | Plan | Price per month (VND) | What it covers |
  |---|---|---|
  | Premium | 1,500,000 | all disciplines except the kids and Fighter classes |
  | Standard | 1,000,000 | 2 disciplines |
  | Student | 800,000 | 1 discipline |
  | Kids | 700,000 | ages 6–15 |

  The Sunday 18:00–21:00 Open mat (sparring) is free.
- The trial form:
  - asks for date of birth, discipline, location and plan;
  - offers the 2 nearest available sessions;
  - requires agreeing to the club rules (`/quy-dinh`);
  - is protected by a honeypot field plus a limit of 5 sign-ups per minute per IP.
- Fees: one payment row per student per month. The "owes this month" rule exists in exactly one place: `owesIn()` in `src/api/fees.ts`.

## 8. Current state (2026-11-06)

- **The UX/API review pass and audit fixes are deployed to the two temporary domains for owner review.**
  - Live Worker version: `532a5218-d933-4dda-8434-7c0a9ece4d73`, deployed from commit `e57297a`.
  - Cloud D1 has migrations up to `0005_last_saracen`.
- The last shipped work:
  - plan cards show "Phù hợp với: …" (`fee_plans.audience`), with a "Xem chi tiết gói" link to `/hoc-phi#goi-<id>`;
  - the schedule legend shows "CN" and "7·CN";
  - Home shows only the coaches marked as featured;
  - class level badges and class notes appear on the schedule.
- The full history is the **Status** list in `CLAUDE.md`.
- The deployed review pass covers trial/API reliability, CMS trial pagination, mobile pricing/schedule/form UX, responsive images, removal of bare decorative number labels and subsequent audit fixes. Seven visible test content rows in cloud D1 were replaced with labeled examples.

**Waiting on the club owner** (content entered in the CMS, no code needed):
- upload a real hero photo;
- decide the extra club policies (card freeze, referral, family discount);
- send the schedule image for location 2 and the coach achievements;
- say which coach leads which class;
- explain the "Fighter class" and the Kudo Kids schedule.

**Proposed next work, not started:**
- trial-form fields "goal" and "trained before?";
- Cloudflare Turnstile on the trial form;
- a Zalo/SMS reminder before a trial session.

## 9. How to work here

- Make the smallest change that fully solves the task. Follow the patterns already in the codebase.
- Before you call a change finished:
  - `npm run check` shows 0 errors;
  - `npm test` passes;
  - for UI changes, look at the page with `npm run dev` at phone width (375px) and desktop width (1600px), with no horizontal scroll.
- After finishing a task, update the **Status** section and the relevant rules in `CLAUDE.md`, and `docs/HANDOFF.md` if the state changed.
- Commit messages are in English and describe the user-visible change.
