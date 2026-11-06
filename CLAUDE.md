# CLAUDE.md — Glory Club

## Project
Promotional website + student-management CMS for **GLORY FIGHT CLUB** (MMA, Kudo, Muay Thai/Kickboxing, BJJ/Grappling, Boxing), 2 locations in Ho Chi Minh City.
- **Personal project, fully independent of the NEAX company.** Work only in this folder; commit/push only to `https://github.com/nhuutrong203/gloryfightclub` (public repo — never commit secrets, passwords or account emails).
- Public site (`gloryfightclub.huutrong203.id.vn`): promotion/enrolment only — no visitor login, no likes/comments.
- CMS (`cms-gloryfightclub.huutrong203.id.vn`): for the club owner and coaches (there is no "assistant" role); phone-first UX.
- No student photos are stored. Classes are named by day group: `246` = Mon·Wed·Fri, `357` = Tue·Thu·Sat, `8` = Sun.
- Monthly fees, 4 plans: Premium 1,500,000 (all disciplines except kids + Fighter classes), Standard 1,000,000 (2 disciplines), Kids 700,000 (age 6–15), Student 800,000 (1 discipline). Open mat – Sparring Sun 18:00–21:00 is free.
- **No** online payment / QR code on the site: students scan the bank QR at the club; the CMS only records that a fee was received (cash / transfer).
- **No** attendance and **no** belt exams (the CMS manages students + fees + site content only).
- Public site is **bilingual**: VI at `/`, EN at `/en/...`; every public text column has an `_en` twin that falls back to VI when empty. The CMS is Vietnamese only.
- Roles: `owner` (club owner, full access) and `coach` (permissions ticked by the owner; default: students + posts, no fees, no delete).
- Each location: schedule entered in the CMS or uploaded as an image (`locations.schedule_image_key`).
- Location 1: 125/9/18 Nguyễn Thị Nhuần, An Phú Đông. Original raster logo: `docs/logo-source.png`.
- Domain `huutrong203.id.vn` already uses Cloudflare nameservers → deploying only needs 2 Worker Custom Domains; never touch other DNS records.
- **Live** at https://gloryfightclub.huutrong203.id.vn and https://cms-gloryfightclub.huutrong203.id.vn.
- **Push to `main` = auto deploy** via GitHub Actions `.github/workflows/deploy.yml` (wrangler types → astro check → npm test → D1 migrations --remote → deploy). It needs the repo secret `CLOUDFLARE_API_TOKEN` — **on hold by decision (2026-11-03) until the site moves to the club owner's own domain**, so CI runs fail at the first step (expected, ignore) and deploys are manual: `npm run deploy` (wrangler on the dev machine is logged in to the club's Cloudflare account).
- Schema changes: create a migration with `npm run db:generate` and commit it — CI applies it to cloud D1 before deploying. Migrations must be backward compatible (add columns/tables only), because the old code keeps running while migrating.

## Status
- [x] Plan v3 → `docs/PLAN.md` (approved)
- [x] Phase 0 — Foundation: Astro 7 + Cloudflare adapter 14, schema + migration `0000_init`, real/demo seed, SVG logo, public layout, home page skeleton (VI/EN)
- [x] Phase 1 — Public site: 19 VI/EN pages (home, disciplines, schedule, coaches, news, gallery, belts, fees, achievements, testimonials, FAQ, about, contact, trial class, 404, sitemap, robots)
- [x] Phase 2 — Core CMS: login, dashboard, students, trial → student, news + R2 upload, site content
- [x] Phase 3 — Monthly fees, CSV export, accounts + coach permissions
- [x] Phase 4 — Club settings (contact, hero, about page), gallery, achievements, testimonials, FAQ, belts in the CMS
- [x] Phase 5 — Deploy (2026-11-02): Worker `gloryfightclub`, D1 `glory-db` (APAC), R2 `glory-media`, 2 custom domains. Cloud holds real data only (`seed.sql`). The cloud owner account was created with `scripts/create-user.mjs`; its credentials are kept by the repo owner, NEVER in the repo.
- [x] 2026-11-03 — Class diary ("Nhật ký lớp học", `/nhat-ky`): the old news feed became the diary — rich text editor, photos, uploaded videos (≤95MB) and YouTube links, month timeline. `/tin-tuc/*` 301-redirects to `/nhat-ky/*`.
- [x] 2026-11-05 — Second audit fixes: diary sanitizer drops raw-text tags (`xmp`, `noembed`, `noframes`, `plaintext` — unwrapping them let `<img onerror>` through), import rejects unreadable dates/statuses instead of overwriting with today/"Đang học", import writes in 60-row transactions and reports unwritten rows, `/api/admin|auth` return 404 on the public host, saving a deleted student/post returns 404. Re-audit: blank status/join-date cells keep the old value on import, impossible dates (31/02) rejected, Settings groups no longer wipe typing when their row is missing (stable `NONE`), fee lists skip students who joined after the month, fee search is accent-insensitive, the student form always shows already-selected classes, deleting a student resets its trial sign-up to "contacted", `create-user.mjs` reuses `hashPassword` + `DEFAULT_COACH_PERMISSIONS` from `src/lib/auth.ts`.
- [x] 2026-11-05 — UI pass: testimonials became a moving band (`TestimonialBand`, home + `/cam-nhan`), schedule cells link to their discipline and show live/finished state, full coach names (no truncation), "Đang tập" badge aligned, "Open mat … FREE" no longer says free twice (`open_mat_name`), long words wrap site-wide, CMS class list flags "Chưa có HLV". Follow-up: testimonials became a 3-card carousel with arrows, prices no longer break ("1.000.00 / 0"), schedule location addresses shown in full, footer links ≥44px tall on phones. Checked with an automatic scan of all 57 VI/EN pages at 320–1920px (broken words, overflow, cut text, tap size, tiny text, alt text).
- [x] 2026-11-05 — CMS ease-of-use audit fixes: sliding sessions + re-login overlay (no lost drafts), `MoneyInput`, coach achievements merged (`extraAwards`), Vietnamese offline/HEIC errors, backup-owner reminder on the Accounts page, "bấm Lưu để giữ ảnh" upload toast, belt ranks auto-renumber, show-password buttons.
- [x] 2026-11-05 — Trial sign-up asks for the plan (migration `0002_silent_mariko_yashida`: `trial_registrations.fee_plan_id`), plan cards link to the form with the plan preselected, converting carries the plan; parent fields optional for all ages.
- [x] 2026-11-06 — Motion pass 2: testimonials became an endless conveyor belt (drag/swipe with inertia, eases to a stop on hover), contact-page maps in full colour with a red frame (were grayscale + inverted), hero "NO GLORY" block reveal, hero film grain + red spotlight following the cursor, red cursor ring (fine pointers), desktop nav links roll to a red copy, Premium plan with a spinning highlight border, outline marquee of disciplines running opposite the slogan band, giant "GLORY" watermark drifting with scroll.
- [x] 2026-11-06 — Motion pass on the public site (`src/scripts/motion.ts` + the motion block in `global.css`): headline mask reveals, scroll progress bar, header hides on scroll down, hero Ken Burns + parallax, red wipe on discipline cards, 3D tilt + cursor glow on cards, magnetic main CTAs, button shine, marquee speeds up / reverses / skews with scroll, prices and hero numbers count up when seen, image zoom-in on reveal.
- [x] 2026-11-06 — Third audit fixes: fee data (`payments`, list badge) only returned with `fees.view`; `useApi` drops stale responses (fast month switch / search on 4G); import rejects an unknown student code instead of inserting a duplicate under a new code; trial status/delete need `students.edit`; `/en/admin` on the public host redirects to the CMS host; `/media/*` cached 1 day (deleted photos disappear); "owes this month" rule lives in one helper (`owesIn`); site info loaded once per request (`Astro.locals.site`); password change moved to `POST /api/admin/password`.
- [x] 2026-11-03 — CMS hardening after a full audit: auto sort order + ↑↓ reorder, safe Excel import, unsaved-changes guard, Vietnamese field-labelled errors, cross-field checks, race-safe writes, first tests.

## Stack
Astro 7 SSR + `@astrojs/cloudflare` 14 (Cloudflare Workers) · React (CMS SPA) · Hono (API under `/api/*`) · Cloudflare D1 + Drizzle ORM · Cloudflare R2 (images) · Tailwind CSS v4.

## Conventions
- UI, content, seed data: **Vietnamese**. Code, table/column names: English, snake_case in the DB. Markdown docs (`*.md`): **English**.
- Dates: text `YYYY-MM-DD`; timestamps: integer unix ms; business time zone `Asia/Ho_Chi_Minh`.
- Images are stored as **R2 keys**, never URLs; served through `/media/*`. R2 holds public images only.
- Student data is never returned from a public route or on the public host (the middleware answers `/api/admin/*` and `/api/auth/*` with 404 there).
- Colours: black `#0A0A0A`, white, red accent `#E10600`. Fonts: Anton (headings) + Be Vietnam Pro (body).
- **Uppercase Vietnamese Anton headings: line-height ≥ 1.12** (stacked marks on Ổ/Ầ/Ấ rise above the cap height). Do NOT use `leading-none`/`leading-[0.9x]` on text with diacritics; only on numbers/prices. Headings use `text-wrap: balance`.
- **Small** red text on dark backgrounds uses `text-glory-bright` (#ff3b30, 5.6:1); `glory` (#E10600) is for buttons/blocks/large headings only; on light backgrounds use `glory-dark`.
- Menu/footer hide links to sections without content (testimonials, FAQ, gallery, achievements, belts) — counted in `PublicLayout` with the same rule as each page (belts: only disciplines with "Có hệ thống đai" on and public; the CMS belt list groups by discipline and flags the hidden ones). The class diary link always shows (owner's choice); the diary block on Home still hides while there are no posts.
- Phones: fixed bottom action bar (Call · Zalo · Trial class), `body` has matching bottom padding; the round floating button only shows from `lg`.
- Page transitions: CSS `@view-transition` (no JS). Every animation has a `prefers-reduced-motion` branch.
- Motion layer = `src/scripts/motion.ts` (imported by `PublicLayout`) + the "Chuyển động khi cuộn" block in `global.css`. Hooks:
  - `.reveal` (fade/slide in, stagger with `--i`), every `<main> h2` gets `.reveal-title` automatically (opt out with `data-no-reveal` on an ancestor), `[data-count]` counts up (vi-VN format) when seen, `[data-zoom]` image inside a `.reveal` zooms in. A scroll-end fallback reveals anything a fast fling skipped.
  - `.hero-line` (headline rises from behind a clip edge, `--d` delay), `.stripe-in`, `.hero-media` (Ken Burns + CSS scroll-driven parallax), `.wipe` (red fill from the bottom on hover).
  - `[data-tilt]` (3D tilt + glow; element must be `position: relative`) and `[data-magnetic]` (only 1–2 main CTAs per screen, clamped ±10px) run only on `(hover: hover) and (pointer: fine)`.
  - Reveal/tilt use the individual `translate` / `scale` properties so they never fight Tailwind `transform` utilities; `.reveal` only sets `translate` while hidden, so hover translates (plan cards) still work.
  - `.block-reveal` (white block sweeps across, text appears mid-sweep; hero line 2), `.spot` + `[data-spot]` (red glow follows the cursor, static on touch), `.grain` (film grain overlay), `.drift-x` (scroll-driven horizontal drift), `.roll` + `data-text` (nav link text rolls up to a red copy; the copy is `content: attr(data-text) / ''` so screen readers don't read it twice), `.premium-glow` (featured plan border with a spinning highlight via `@property --spin`), `.cursor-ring` (created by the script, fine pointers only, the real cursor stays visible). `Marquee` takes `outline` (big outline text, slow) and `reverse`; its copy count scales with text length so every band runs at a similar speed.
  - Client scripts: use `appendChild`, not `append` — the Workers types (HTMLRewriter) shadow the DOM signature and `astro check` fails.
  - Header: `data-scrolled`, `data-hidden` (hidden after scrolling down past 320px, shown on scroll up or focus); red `.scroll-progress` bar under it (CSS `animation-timeline: scroll()`, hidden where unsupported).
- Coach cards and coach pages: medal lines = the coach's "Thành tích" text lines + achievements-table rows linked to that coach that the text does not already mention (`extraAwards` in `src/lib/medals.ts`: a row is a duplicate when every word of its title is in one text line and its year (from the title or event name only — the date field is filled in loosely), if any, matches — real data has "HCV giải Kudo quốc gia 2024" in text vs "HCV Kudo quốc gia" in the table). `publicCoaches()` attaches `awards` (title, event, date).
- Achievements text is free-form; `src/lib/medals.ts` reads it (HCV/HCB/HCĐ, "huy chương vàng", "1 vàng, 1 bạc…", titles like "vô địch", belts) → `AchievementIcon` (gold/silver/bronze `Medal`, trophy, belt in its color) and `MedalTally` (medal counts on coach cards/pages). Medal colors live in `@theme static` (used via `var()`, not classes).
- Site info (`club`, `hero`, `texts`, `locations` from `getSite()`) is loaded ONCE per public request by the middleware into `Astro.locals.site`; pages, the layout and components read it from there — never call `getSite()` in a page.
- Interactions in `PublicLayout`: shared lightbox for any `[data-lightbox="group"]` (gallery, achievement photos, diary images; swipe + arrow keys), "Đang tập" badge on Home's today list and today's column of `/lich-hoc` (any element with `data-class-time` gets `data-state` = next/live/done, checked in VN time on the client because pages are cached), hero numbers count up (`data-count`).
- Testimonials: `TestimonialBand` = endless conveyor belt (sushi-belt style): the script clones the card set until the strip covers the screen + one loop, then moves it at a constant speed (one card per 4.5 s) with `translate`, wrapping by exactly one loop so it reads 1-2-3-4-1-2… with no jump back. Hover / keyboard focus / the "Đọc tiếp" dialog / the pause button ease it to a stop (and back up) instead of braking; drag or swipe spins it with inertia (`touch-action: pan-y` keeps vertical page scroll); ← → push exactly one card. The rAF loop only runs while the belt is on screen. Card width uses `cqi` units (the strip is `w-max`). Clones are `aria-hidden` with buttons out of the tab order. Reduced motion: no clones, no movement — a plain horizontally scrollable row. Quotes clamp to 5 lines; "Đọc tiếp" shows only when the text is really cut.
- Big display text (`h1–h3`, `.font-display`) never breaks inside a word (`overflow-wrap: normal`; body text uses `break-word`). Fee prices are one line and size to the card (`@container` + `text-[clamp(2.25rem,24cqi,3.75rem)]`).
- Schedule: each class card links to its first public discipline (Open mat has none). The coach name shows only when the class has a coach assigned — the CMS class list flags classes without one ("Chưa có HLV").
- All public content is read from D1, never hard-coded. Fixed UI strings live in `dict` (`src/i18n.ts`) and are **editable in CMS → Chữ trên website** (settings key `texts` = `{vi:{key:text}, en:{…}}`, loaded by the middleware into `setTextOverrides`; `t()` prefers the edited text). New string → add a key to `dict`, NEVER a hard-coded string in a page; display groups are in `src/admin/pages/Texts.tsx` (`GROUPS`).
- The slogan (marquee, footer) comes from `club.slogan`; the discipline line at the top of Home / Disciplines comes from the `disciplines` table.
- Every form/API input is validated with zod on the server.
- **Update this file after every finished task** (status, commands, structure changes).

## Running
```bash
npm install
npm run db:reset   # local D1: create tables + seed/seed.sql (real) + seed/sample.sql (demo)
npm run dev        # site http://localhost:4321 (EN /en) · CMS http://localhost:4321/admin
npm test           # quick tests (node --test, tests/*.test.mjs; CI runs them before deploying)
```
LOCAL demo accounts (in `seed/sample.sql`): `admin` (owner) and `hlv` (coach), password `glory2026`. They exist only locally.
Create a real account: `node scripts/create-user.mjs <username> <password> "<Full name>" owner [--remote]`.
**Astro 7 allows one dev server per project** — to run another command that needs the DB, share the running server or `npx astro dev stop`.
Commands, deploy and domain details: `README.md`. In the Claude desktop app, `.claude/launch.json` has the `glory-dev` config.

## Technical notes (Astro 7 / adapter 14)
- Bindings come from `import { env } from 'cloudflare:workers'` (NOT `Astro.locals.runtime` any more). DB: `import { db, schema } from '../db'`.
- `astro dev` runs inside real workerd; local D1/R2 live in `.wrangler/state`.
- `npm run dev:remote` = `CLOUDFLARE_ENV=remote` → uses `env.remote` in `wrangler.jsonc` (bindings with `remote: true`).
- Tailwind v4: shared classes are declared with `@utility` in `src/styles/global.css` (not `@layer components` + `@apply`).
- `session: false` (sessions are managed in D1), `imageService: 'passthrough'` (images are compressed in the browser).
- EN version: the middleware rewrites `/en/*` to the same page (query string kept) with `Astro.locals.lang = 'en'`. Use `t()`, `tr(row, 'field', lang)`, `href(path, lang)` from `src/i18n.ts`.
- Schema change: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.
- `db:reset` needs the dev server stopped first (Windows locks the SQLite file) — `scripts/clear-local-db.mjs` prints a clear error.
- `seed/seed.sql` holds real data only (it is loaded to the cloud); fake data goes in `seed/sample.sql`, marked "(mẫu)".
- D1 limits: max 100 bound parameters per statement (never `inArray` over a long id list — use a subquery or one `json_each(?)` JSON param), only a few `UNION` terms per query (use `EXISTS … OR EXISTS …`), and 50 calls per request on the Free plan (1000 on Paid) → batch multi-row writes with `db.batch`.

## Main structure
```
src/pages/            public pages (.astro) · api/[...path].ts → Hono · admin/[...path].astro → React CMS · media/[...key].ts (public/… keys only)
src/components/public public building blocks: Icon, PageHero, Marquee, PlanCard, CoachCard, PostCard, ClassList, CtaBand, TestimonialAuthor (name + photo or initials), TestimonialBand, Medal, AchievementIcon, MedalTally
src/lib/              auth.ts (PBKDF2, sessions, PERMISSIONS) · util.ts (vnNow, slugify, normalizePhone, youtubeId) · import.ts (Excel import parsing) · html.ts (diary rich text: sanitize, toText) · site.ts · public.ts (public queries, richText, youtubeEmbed)
src/api/              index.ts (CSRF origin check, auth middleware) · guard.ts (need(), body(), csv()) · auth · public (trial form) · content (generic CRUD) · students · fees · trials · posts · admin (me, lookups, dashboard, settings, upload, users)
src/scripts/motion.ts public-site motion (reveal, count-up, header hide, marquee, tilt, magnetic)
src/admin/            React CMS: App.tsx (hand-written router, shell, bottom menu) · lib.ts (api, useApi, toast, uploadImage → WebP, useDirty, useUploading) · ui.tsx · resources.ts · pages/*
tests/                node --test files (*.test.mjs import the .ts modules directly; Node 24 strips types)
```
- CMS menu (`menuGroups` in `src/admin/pages/More.tsx`) mirrors the public menu order; item names come from `RESOURCES[k].title` (= the page title = the public name) ("Lịch học", "HLV", "Nhật ký lớp"…) with a one-line hint of what each edits. Every list/edit screen has a "Xem trên web" button (`ViewOnSite`, from `publicPath` in `resources.ts`). Keep both in sync when adding a public section.
- `src/admin/resources.ts` is the **single source** for simple content sections: it generates both the CMS form and the API's zod schema + writable columns. New content column → add a field there.
  - Field options: `type: 'url'` (must start with https://), `showIf` (hide a field based on another; hidden fields are saved empty). Resource options: `check` (cross-field validation, runs in both CMS and API), `orderBy`, `newFirst`.
- Display order (`sort`) has **no input**: new items get `max(sort)+1` (gallery and achievements use `newFirst` → `min-1`, so they go first; the public achievements page follows this order, date only breaks ties); reorder with the ↑↓ buttons in the list → `PUT /api/admin/content/:res/order {ids}` rewrites 1, 2, 3… Only resources with `orderBy: 'sort'` show the buttons; fee plans are ordered by price (same as the public page).
- Forms with images disable Save while an upload is running (`useUploading()` in `lib.ts`).
- Unsaved-changes guard: forms call `useDirty()` (lib.ts) → `markDirty(true)` on edit, `markDirty(false)` after a successful save; `navigate()` and the browser Back button ask before leaving. New forms must do the same.
- Sessions slide: the auth middleware renews a session (30 days, new cookie) when < 15 days are left, so daily users are never logged out. A 401 mid-work (`glory:logout` event) shows `Login overlay` ON TOP of the open page — typed text survives; after logging in the user presses Save again. "Đăng xuất" does a full reload to the login screen instead.
- Money fields use `MoneyInput` (ui.tsx): text input with numeric keyboard, accepts "1.500.000" / "1 500 000", passes digits only, always shows "= 1.500.000 đ" (browser number inputs read "1.500.000" as 1.5). Resource field type `money` (fee plan price). Passwords use `PasswordInput` (eye button). Times use `TimeInput` (hour + minute selects, always 24-hour "19:30" — native `type="time"` shows "07:30 PM" on English browsers); class start/end and the diary publish time use it.
- Browser-side errors are Vietnamese too: `api()` turns a failed fetch into `OFFLINE`; image upload turns undecodable files into `HEIC` / "Không mở được ảnh này" messages.
- Belts: `rank` is typed, but after every create / update / delete the API renumbers that discipline's belts 1, 2, 3… (`rerank` in `src/lib/util.ts`, tested): the edited belt keeps the typed rank, others shift.
- API errors: zod messages are Vietnamese (`z.config(z.locales.vi())` in `guard.ts`); `body(c, schema, labels)` turns column names into form labels. Forms show the error right above the Save button.
- Deleting a discipline is blocked while belts/classes still use it (the message suggests turning off "Hiện trên website").
- Creating a student goes through `createStudent()` (students.ts): student + classes in one batch, retried on a duplicate code. Recording a fee relies on the DB's unique (student, month) index.
- Permissions: `students.view`, `students.edit`, `fees.view`, `fees.edit`, `posts`, `content`, `delete`. The owner always has all of them; only the owner manages accounts. Permissions are enforced in the API with `need()`; the UI only shows/hides. Fee data is also left out of student responses without `fees.view` (`payments: []`, `fee: null`); changing / deleting a trial sign-up needs `students.edit`.
- Password change: `POST /api/admin/password` (behind the session middleware, so an expired session or locked account cannot use it); logs out the user's other devices.
- Accent-insensitive student search runs in JS (`matchQuery`) — fine up to a few thousand students.
- Fees: one `payments` row per student per month (unique). "Owes this month" is ONE rule, `owesIn(month)` in `src/api/fees.ts` (Dashboard "unpaid", fee list, the student list's `fee` = paid/unpaid/null badge computed on the server): `active` students whose `joined_at` is by the end of that month — someone entered ahead with next month's join date is not counted yet. The fee list of a month also shows anyone who paid that month, so on the client "unpaid" = no payment row. Never re-implement the rule on the client.
- R2 cleanup: after a write, `deleteMedia(keys)` (`src/api/media.ts`) deletes files no longer referenced by any image column (posts, content images, hero). Errors only log — never fail the save. New image column → add it to that query. Files uploaded and then abandoned in an unsaved form still stay (known limit).
- Upload: the client shrinks to ≤1600px WebP (JPEG fallback; JPEG/WebP ≤400KB is sent as is), XHR with % progress, instant preview; `uploadMany` uploads 3 images in parallel (news, "Thêm nhiều ảnh" in the gallery). The server checks magic bytes, ≤8MB, key `public/YYYY-MM/<uuid>.ext`.
- `/media/*` runs on BOTH the public and the CMS host (middleware `CMS_PATH`) and is cached for 1 day at the edge (Cache API) and in the browser — keys are never overwritten, but a deleted photo must stop loading soon (e.g. a parent asks to remove it).
- Achievements with photos: shown on Home (photos first), on the coach page ("Hình ảnh thành tích", from `achievements.coach_id`) and on /thanh-tich; clicking a photo opens the original.
- Student import: the CMS reads .xlsx (`read-excel-file`, lazy-loaded) or .csv and sends `POST /api/admin/students/import` using the export's columns; an existing code → update ONLY the columns present in the file, a code that does not exist → row error (never inserted under a new code: re-importing would duplicate students) (`updatableColumns` in `src/lib/import.ts`, unit-tested; a blank status/join-date cell keeps the old value), no code → insert; errors are returned per row. Location/plan match by accent-insensitive name or initials; an unknown location/plan/class name, an unreadable date (month > 12, 2-digit year…) or an unknown status is a row error (never overwritten with empty / today / "Đang học"). All rows are validated first, then written with `db.batch` in chunks of 60 rows (each chunk is one transaction); if a chunk fails the import stops and the remaining rows come back as row errors, so a retry only sends those.
- CMS: the "Học thử" tab shows a red badge with the count of new trial sign-ups (`GET /api/admin/trials/count`, refreshed every minute and on navigation).
- Class diary = the `posts` table (CMS route `/admin/nhat-ky` — old `/admin/tin-tuc` links are rewritten in `App.tsx`; public `/nhat-ky`). Paged list (50 per page, `GET /api/admin/posts?page=`), one post via `GET /api/admin/posts/:id`. The sitemap reads post slugs only (`publishedSlugs`).
  - Text: `src/admin/RichEditor.tsx` (contentEditable + execCommand, pastes as plain text) → HTML is re-sanitized on the server with an allowlist (`sanitizeHtml` in `src/lib/html.ts`, HTMLRewriter) and stored with `posts.format = 'html'`; old posts are `'text'` (rendered via `richText`). Render with `postHtml()`; excerpts/meta use `toText()`.
  - Media: `post_images` rows with `type` = `image` | `video` (R2 key) | `youtube` (link); max 24 per post (24 × 4 columns stays under D1's 100 bound parameters).
  - Video upload: `POST /api/admin/upload-video` streams the raw file to R2 (MP4/MOV/WebM, ≤95MB because Workers requests cap at 100MB; .mov is served as video/mp4). `/media/*` answers `Range` requests with 206 so videos play and seek on iPhone.
  - CMS links to the public site use `siteUrl()`: the admin page writes `<meta name="glory-hosts" content="PUBLIC_HOST|CMS_HOST">` from wrangler vars (on the CMS host a plain `/…` link redirects to `/admin`).
- Trial form: honeypot field `website` + max 5 submissions/minute/IP (`TRIAL_LIMITER` binding, shows `f_too_many`); when a child under 16 is converted to a student, the sign-up phone becomes the parent's phone. The form has "Gói tập quan tâm" (`trial_registrations.fee_plan_id`, migration `0002`), preselected by `?goi=<plan id>` from the "Đăng ký học thử" button on every plan card; the CMS trial list shows it and converting copies it to the student's `fee_plan_id`.
- Parent name / phone are optional at every age (owner's choice); the student form only hints "Nên ghi" for kids.

## Production
- CMS login is limited to 10 attempts/minute/IP by the `LOGIN_LIMITER` binding, the trial form to 5/minute/IP by `TRIAL_LIMITER` (Workers Rate Limiting, `wrangler.jsonc`). After adding a binding run `npx wrangler types`.
- NEVER load `seed/sample.sql` to the cloud. Schema change → `db:generate` → `db:migrate:remote` BEFORE `npm run deploy` (CI does this automatically once the token secret exists).
- Local D1 is keyed by `database_id`: after changing the id, run `npm run db:reset` again.
- Possible next step: Cloudflare Turnstile on the trial form (currently honeypot + per-IP rate limit; bots rotating IPs still get through).

## Still waiting on the owner / head coach
- Schedule image for location 2 (or the head coach enters/uploads it in the CMS).
- Achievements + photos for coaches Tỉnh, Đức, Vĩnh Tâm, Nhi Thảo; which coach leads each class.
- What the "Fighter class" is and its schedule. When and where Kudo Kids trains.
- Kudo belts (seed + cloud, 2026-11-03): white → purple → blue → yellow → green → brown → black (purple added per the owner). Intermediate grades/stripes still to confirm with the head coach.
