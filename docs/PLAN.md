# GLORY FIGHT CLUB — Implementation plan (v3)

> Status: **APPROVED** · Phases 0–5 done (2026-11-02), the site is live. Detailed progress: CLAUDE.md.
> v2: 2 locations, real schedule, no student photos, no "assistant" role, 2 subdomains, GitHub repo.
> v3: **bilingual Vietnamese–English**; location 2 schedule entered in the CMS or uploaded as an image; the owner sets coach permissions; **no attendance and no belt exams**; parent details for young students; real coach + achievement data from gloryfightclub.vn.

## v3 changes (summary)

| Topic | Decision |
|---|---|
| Language | Vietnamese by default at `/`, English at `/en/...`, VI/EN switch in the header. Content fields in the CMS get an extra "English" field (empty → the EN page shows the Vietnamese text). The CMS stays Vietnamese. |
| Location 2 schedule | Each location has 2 options: enter classes in the CMS (the schedule table is generated) **or** upload one schedule image. If an image exists, the Schedule page shows it for that location. |
| Permissions | The owner has full access and toggles permissions per coach with checkboxes: *View students · Edit students · View fees · Record fees · Post news · Edit site content · Delete data*. Default for a new coach = option B (students + posts, no fees, no delete). |
| Attendance, belt exams | **Dropped.** Only the student list + fees remain. The public "Belt system" page (Kudo/BJJ belts) stays. |
| Young students | Birth year, parent name + phone added. |
| Coaches | Taken from gloryfightclub.vn (see section 0). Achievements are prominent on Home, the coach pages and the Achievements page to build trust. |

---

## 0. Club information

| | |
|---|---|
| Name | **GLORY FIGHT CLUB** — slogan **NO PAIN – NO GLORY** |
| Disciplines | MMA · Kudo · Muay Thai / Kickboxing · BJJ (Jiujitsu) / Grappling · Boxing · Open mat – Sparring (Sun) |
| Location 1 | 125/9/18 Nguyễn Thị Nhuần, An Phú Đông Ward, Ho Chi Minh City |
| Location 2 | Sport House sports centre — A1.06 Dream Home Residence, 148/21 Street 59, An Hội Tây Ward (Gò Vấp), Ho Chi Minh City |
| Hotline | 0793 182 218 · 0382 998 538 (Zalo) |
| Social | facebook.com/gloryfightclubvn · Instagram @glory.fight.club |
| Logo | Hexagon + "GL" letters, white on black |
| Repo | github.com/nhuutrong203/gloryfightclub |
| Public site | `gloryfightclub.huutrong203.id.vn` |
| CMS | `cms-gloryfightclub.huutrong203.id.vn` |

### Coaching team (source: gloryfightclub.vn)

| Coach | Role / disciplines | Achievements |
|---|---|---|
| **Lê Thành Trung** | Owner · Head Coach · MMA – Kudo – BJJ | Kudo black belt from the World Kudo Federation · Active MMA fighter · Gold, National Kudo Championship 2024 · 5+ years of coaching |
| **Nguyễn Tiến Đăng Phong** | Jiujitsu coach | Silver, National Jujitsu Clubs Championship · Silver & Bronze, Mekong Delta Sports Games · Gold, Cần Thơ Open Jiujitsu |
| **Ninh Văn Tỉnh** | Striking – Kudo – Boxing – Kickboxing coach | *(not provided yet)* |
| **Huỳnh Minh Đức** | Striking – Kudo – Boxing – Kickboxing coach | *(not provided yet)* |
| **Nguyễn Huy Vĩnh Tâm** | Striking – Kudo – Boxing – Kickboxing coach | *(not provided yet)* |
| **Nguyễn Trương Nhi Thảo** | Kudo Kids coach | *(not provided yet)* |

Discipline descriptions (Kudo, MMA, Muay Thai – Kickboxing, Judo – Wrestling – Jiujitsu) and the "Kudo National Cup Championship 2025" event were also taken from the old site as starting content.

The **location 1** weekly schedule from the image is loaded as real data (not sample data):

| Time | Mon · Wed · Fri (class **246**) | Tue · Thu · Sat (class **357**) |
|---|---|---|
| 08:30–09:30, 09:30–10:30, 10:30–11:30 | MMA | Boxing |
| 17:00–18:30 | Muay Thai / Kickboxing | — |
| 18:30–20:00 | MMA | MMA / Muay Thai |
| 20:00–21:30 | Jiujitsu / Grappling | Kudo |
| **Sun 18:00–21:00** | Open mat – Sparring | |

---

## 1. Stack (unchanged from v1)

Astro SSR on **Cloudflare Workers** (planned on Astro 5, built on Astro 7) · React for the CMS · Hono for the API · **D1** + Drizzle · **R2** for images · Tailwind v4 · Turnstile against form spam (planned).

D1 fits well (small data, the free tier is plenty, Time Travel restores up to 30 days back). "Local D1" is just a SQLite file Wrangler creates — no database to install.

```bash
npm run dev                                          # run locally, D1/R2 emulated in .wrangler/
npm run dev:remote                                   # run locally but read/write the real cloud D1 + R2
npx wrangler d1 migrations apply glory-db --local    # create tables locally
npx wrangler d1 migrations apply glory-db --remote   # create tables in the cloud
npm run deploy                                       # build + deploy to Cloudflare
```

### Two subdomains, one app
A single Worker serves both hosts; the middleware routes by hostname:
- `gloryfightclub.…` → public site. Visiting `/admin` here redirects to the CMS.
- `cms-gloryfightclub.…` → CMS + admin API only. The login cookie belongs to this host only.
- Locally: public is `http://localhost:4321`, CMS is `http://localhost:4321/admin` (no need to emulate 2 domains).

**Domains at deploy time (phase 5):** `huutrong203.id.vn` **already uses Cloudflare nameservers** (checked 2026-11-02) → only 2 Worker Custom Domains are needed in the Cloudflare dashboard (or in `wrangler.jsonc`). Cloudflare creates DNS records for exactly these 2 subdomains; other projects' records/CNAMEs are untouched.

---

## 2. Architecture

```
 Visitors (phone)                         Head coach / coaches (phone)
 gloryfightclub.huutrong203.id.vn         cms-gloryfightclub.huutrong203.id.vn
        │                                          │
        ▼                                          ▼
 ┌──────────────── Cloudflare Worker (one Astro app) ────────────────┐
 │ middleware.ts: route by host + require login for the CMS          │
 │ Public pages (Astro SSR)    /admin/* (React SPA)    /api/* (Hono)  │
 │ /media/*  public images from R2 (long cache)                       │
 └──────────────┬──────────────────────────────────┬─────────────────┘
                ▼                                  ▼
          D1 (glory-db)                      R2 (glory-media)
                                    coach, news, gallery, achievement images
```

- **No student photos** → R2 holds public images only, simpler than v1 (no private images).
- Login: username + password (PBKDF2 via WebCrypto), sessions in D1, `HttpOnly; Secure` cookie.
- Images are compressed on the phone before upload (≤1600px, WebP). Videos are YouTube/Facebook links.
- Scheduled posts use `published_at`, no cron needed. Time zone `Asia/Ho_Chi_Minh`.
- Excel export = CSV with a UTF-8 BOM.

---

## 3. Folder structure

```
gloryfightclub/
├─ CLAUDE.md · README.md · docs/PLAN.md
├─ wrangler.jsonc · astro.config.mjs · drizzle.config.ts · package.json
├─ migrations/               # SQL generated by drizzle-kit
├─ seed/seed.sql             # real data (locations, schedule, disciplines); demo data lives in seed/sample.sql
├─ public/                   # logo.svg, favicon, default OG image
└─ src/
   ├─ db/schema.ts
   ├─ lib/                   # auth, utils, public queries, import parsing
   ├─ middleware.ts
   ├─ api/                   # Hono: index.ts + one file per area
   ├─ layouts/PublicLayout.astro
   ├─ components/
   ├─ styles/global.css
   ├─ admin/                 # React SPA
   └─ pages/                 # public pages (section 5) + api/[...path].ts + admin/[...path].astro + media/[...key].ts
```

---

## 4. Database schema (D1)

Conventions: auto-increment `id`; dates `YYYY-MM-DD`; timestamps unix ms; `is_public` show/hide; `sort` order; images stored as R2 keys.
**Weekdays are stored as a Vietnamese-style digit string**: `"246"` = Mon·Wed·Fri, `"357"` = Tue·Thu·Sat, `"8"` = Sunday — exactly how the club names its classes.

### System
| Table | Main columns |
|---|---|
| `users` | id, username, password_hash, full_name, role (`owner` \| `coach`), permissions (JSON list ticked by the owner), coach_id, is_active |
| `sessions` | id, user_id, expires_at |
| `settings` | key, value (JSON) — hotline, Zalo, Facebook, Instagram, hero content, About page |

### Public content
| Table | Main columns |
|---|---|
| `locations` | id, name, address, map_url, phone, schedule_image_key (optional schedule image), sort |
| `disciplines` | id, slug, name (MMA, Kudo…), summary, description, cover_key, has_belts, is_public, sort |
| `classes` | id, name (e.g. "Evening MMA"), discipline_ids (may be 2, e.g. "MMA / Muay Thai"), location_id, days (`"246"`), start_time, end_time, coach_id, level, note, is_public, is_active |
| `coaches` | id, slug, full_name, photo_key, title, bio, achievements, discipline_ids, is_featured, is_public, sort |
| `belts` (only for belt disciplines: Kudo, BJJ) | id, discipline_id, name, color, rank, requirements, min_months |
| `fee_plans` (monthly fees) | id, name, headline, condition, price_per_month, features, badge, is_featured, is_public, sort |
| `posts`, `post_images` | feed-style news: content, published_at, is_public · multiple images |
| `gallery_items` | type (photo \| video), key / video_url, caption, album, is_public, sort |
| `testimonials` · `faqs` · `achievements` | as in v1 |

**Bilingual:** every publicly displayed text column has an `_en` column (e.g. `name` + `name_en`, `description` + `description_en`); EN pages use `_en`, falling back to Vietnamese when empty. Fixed UI strings (menu, buttons) live in one dictionary file, `src/i18n.ts`.

The public **Schedule** page is generated from the `classes` table (a `"246"` class shows under Mon, Wed, Fri) → editing a class in the CMS updates the schedule; nothing is entered twice.

### Students (private — no photos)
| Table | Main columns |
|---|---|
| `students` | id, code (GF0001), full_name, phone, birth_year, parent_name, parent_phone, location_id, fee_plan_id, joined_at, status (`active` \| `paused` \| `quit`), note |
| `student_classes` | student_id, class_id (one person can take MMA 246 + Kudo 357) |
| `payments` | id, student_id, month (`2026-11`), amount, paid_at, method (cash / transfer), note, created_by |
| `trial_registrations` | full_name, phone, discipline_id, location_id, preferred_time, note, status (`new` \| `contacted` \| `enrolled` \| `rejected`), student_id |

**Monthly fees:** each payment = 1 `payments` row for 1 month. The "Fees for November" screen lists active students as **paid** / **unpaid**, with one button to record a payment. The dashboard counts who has not paid this month.

---

## 5. Pages

### Public site
| URL | Content |
|---|---|
| `/` | Large hero image + "NO PAIN – NO GLORY" + **Book a trial class** button; disciplines; **"Fighters of Glory"** strip (coaches / featured fighters); today's classes; latest news; testimonials; 2 locations; CTA |
| `/gioi-thieu` | History, philosophy, values, key achievements |
| `/mon-hoc`, `/mon-hoc/[slug]` | MMA, Kudo, Muay Thai, BJJ, Boxing: description, audience, coaches, that discipline's schedule, fees |
| `/lich-hoc` | Weekly schedule, **choose a location**, filter by discipline; per-day tabs (Mon…Sun) on mobile, a table like the image on desktop |
| `/huan-luyen-vien`, `/huan-luyen-vien/[slug]` | Coach list + detail |
| `/tin-tuc`, `/tin-tuc/[slug]` | Facebook-style feed |
| `/thu-vien` | Photos + videos |
| `/cap-dai` | Kudo / BJJ belt system |
| `/hoc-phi` | Monthly fee table |
| `/thanh-tich` · `/cam-nhan` · `/hoi-dap` | Achievements · testimonials · FAQ |
| `/lien-he` | 2 locations, each with Google Maps, call button, Zalo, Facebook, Instagram |
| `/dang-ky-hoc-thu` | Name, phone, discipline of interest, location, preferred time → goes to the CMS |
| Every page | Floating **Call** + **Zalo** buttons; SEO, Open Graph, sitemap |

### CMS (`cms-gloryfightclub…`)
Mobile-first, bottom navigation bar: **Dashboard · Students · Fees · Trial classes · More**.

- **Dashboard**: active students (per location), new students this month, students who have not paid this month, new trial sign-ups, today's classes.
- **Students**: name, phone, birth year, parent (name + phone), location, classes; list, search by name/phone, filter by location / class / status, add–edit–delete; the detail page shows payment history.
- **Fees**: choose a month → paid / unpaid list → tap "Received".
- **Trial classes**: list, change status, one-tap **"Convert to student"**.
- **More**: Classes & schedule, Disciplines, Coaches, Locations, News, Gallery, Fee plans, Testimonials, FAQ, Achievements, Settings, Accounts, CSV export.

Permissions: **Owner** (full access, with an "Accounts" screen to create coach accounts and tick permissions) and **Coach** (whatever the owner grants; default: students + posts).

---

## 6. Design

- **Colours follow the club's existing identity** (schedule image): black `#0A0A0A`, white, dark grey `#1A1A1A`, **red `#E10600`** as the accent.
- Fonts: headings **Anton** (uppercase, bold), body **Be Vietnam Pro** — both have full Vietnamese diacritics.
- Logo: the hexagon "GL" logo redrawn as a **crisp SVG** (the original is a raster image with a black blot at the top of the L); used in the header, favicon and share image.
- Full-width dark hero image, large uppercase type, generous whitespace, square corners, solid red buttons. Style inspiration only from yibuko.com.
- Images: placeholders until real photos arrive (or the owner uploads them in the CMS).

---

## 7. Phases

| Phase | Content | What the owner can check |
|---|---|---|
| **0 — Foundation** | `git init` + GitHub remote, project setup, schema + migration, seed (locations, disciplines, real schedule), SVG logo, layout, CLAUDE.md, README | `npm run dev` opens the home page skeleton |
| **1 — Public site MVP** | VI/EN, Home, Disciplines, Schedule, Coaches, News, Fees, FAQ, Contact, Trial class, Call/Zalo buttons, SEO/OG/sitemap | Browse on a phone, submit the trial form |
| **2 — Core CMS** | Login + permissions, Dashboard, Students, Trial → student, Classes & schedule / Disciplines / Coaches / Locations, News + R2 image upload | Add a student, post with photos → visible on the site immediately |
| **3 — Business** | Monthly fees, CSV export, Accounts + coach permissions | Record fees, open the CSV in Excel, create a coach account and tick permissions |
| **4 — Polish** | About, Belts, Gallery, Achievements, Testimonials + CMS, Settings | Every public text is editable from the CMS |
| **5 — Deploy** | Create cloud D1/R2, deploy, attach 2 subdomains (Turnstile still optional) | The site runs on the real domain |

After each phase: test locally, commit + push to the Glory repo, update CLAUDE.md.

---

## 8. Deliberately out of scope
Bilingual CMS (the CMS is Vietnamese only), machine translation, attendance, belt exams, visitor login, likes/comments, student photos, online payment, automatic fee reminders via SMS/Zalo, direct video upload, rich-text editor.

---

## 9. Open questions

Decided: bilingual VI–EN · coach default = option B, the owner sets permissions · no attendance or belt exams · young students supported · location 1 address = 125/9/18 · logo = black–white "GL" image, redrawn as SVG · domain stays `huutrong203.id.vn` (already on Cloudflare).

Still open — **none of these block work**; placeholders stay until the answers arrive:

1. **Location 2 schedule image**: not received yet. Not urgent — the head coach can upload it in the CMS.
2. **Fees**: ✅ 4 plans (Premium / Standard / Kids / Student). No QR/payment on the site — students scan the code at the club. Still to ask: which class is the **"Fighter class"**?
3. **Coaches missing achievements/photos**: Ninh Văn Tỉnh, Huỳnh Minh Đức, Nguyễn Huy Vĩnh Tâm, Nhi Thảo — send them if available; otherwise left empty for the head coach to fill in via the CMS.
4. *(Optional suggestion)* The club already owns `gloryfightclub.vn` (currently on Google Sites). Moving the site there later only needs a new Custom Domain, no code changes.
