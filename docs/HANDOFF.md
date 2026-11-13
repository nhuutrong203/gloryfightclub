# Handoff — where we left off (2026-11-07)

Training-space galleries are live on Worker version `c94ca0b9-44c3-400f-b03a-d76bbcdb91c3` with migration 0008 applied. Each location displays two labeled AI sample images from the preview album. Replace or unpublish the samples in the CMS Gallery when real photos are available.

2026-11-13: The current local build was deployed directly to Cloudflare as Worker version `5a6b32dc-3868-4b91-88a1-981374dbd293`. Migration 0007 is applied and the student location guard is enabled. The production HTTPS redirect, location pages, sitemap, trial page, rules page, and CMS entry point were verified. Submit the sitemap in Search Console, review public test posts in the CMS, and link each Google Business Profile to its location page (`/co-so/1` or `/co-so/2`).

2026-11-13: Rules settings now support adding, editing, and deleting custom groups. They are included in the public rules page and the trial consent dialog. The home heading and shared navigation, image, and card effects were softened. Pending deployment.

2026-11-13: The local security fixes keep database error details out of API logs and prevent in-flight logins from issuing sessions after a password reset or account lock. No migration required for these fixes. Pending deployment.

2026-11-13: The next release applies migration 0007, deploys the compatible Worker, and then enables the student location guard. GitHub Actions runs all three steps. Before rolling back to a Worker that updates the student before removing old class links, disable the guard by deleting the `enforce_student_location` settings row. The local fixes also protect spreadsheet progress, use a single fee snapshot, and skip closed trial classes.

2026-11-13: The follow-up audit fixes are local. Migration `0007_enforce_student_class_location` protects new enrollments and student location changes. Import retries verify the original payload and resume committed batches. Duplicate class IDs are normalized, and diary timestamps are bounded. Apply migration `0007` before deploying the new code. Existing records are not rewritten.

2026-11-13: The audit fixes are local. Student and class deletion protect payment and enrollment history. Converted trials reject stale status edits. Content updates validate merged values. The open import form reuses an import ID after a lost response, and D1 saves progress with each batch. Reselecting a file starts a new import. No migration. Not deployed.

2026-11-12: GitHub Actions run `43180388809` deployed commit `73774c4` to both domains. Worker version `fc4abdc5-5e12-453f-8a57-1107d3e96aa7` serves the interactive partner section. Verified VI/EN Home and About plus the CMS route. All CI checks passed.

2026-11-12: The Partners & Sponsors interaction refresh is local. Home and About use the shared image viewer and retain equal square artwork frames. Website links remain separate from the image action. No schema change. Not deployed.

2026-11-12: Deployed the reviewed local build as Worker `4fdc98d6-bb87-4107-8a9f-b7eabd8c07f4`. Cloud D1 is at migration `0006_polite_lord_tyger`. Both partner entries and R2 images are live on VI/EN Home and About. The CMS route returned 200 and the public admin API returned 404. The entries use the neutral supporter type pending confirmation of their roles.

2026-11-12: The Partners & Sponsors section is wired to CMS content management. It appears on Home and About when at least one entry is public. Migration `0006_polite_lord_tyger` is applied locally. Soi BJJ Tattoo and Team Vô Tri are present in local D1/R2 with the neutral supporter type until their roles are confirmed. Production will need migration `0006` before deployment and the real entries entered through CMS. Not deployed.

2026-11-12: Six audit fixes are local. Student codes are reserved through a persistent counter in the existing settings table, CSV imports check column counts, assigned classes cannot change locations, fee actions wait for the selected month's data, API pagination handles invalid numbers, and the smoke test preserves the request hostname. All 22 unit tests, Astro check, the production build, and the complete disposable D1 smoke suite passed, including the public host cases. Chrome verified that fee actions stay unavailable during a delayed month change and that the fee screen has no horizontal overflow at 375px and 1600px. No migration. Not deployed.

2026-11-12: Five follow-up audit fixes are local. Retry CSVs preserve the source columns, invalid files cannot leave the previous preview active, trial consent checks the displayed policy version, conversion skips classes that moved to another location, and Hero/About settings validate their field types. The CMS has separate About and Contact shortcuts. Public lists use their content resources or Class Diary, and Home and About reuse those records. Hero, About, contact details, club rules, and website text use settings forms. No schema change. Not deployed.

2026-11-12: Three audit fixes are local: reject repeated student codes in imports, cap student birth years at the current Vietnam year, and reject incomplete or invalid content reorder requests. No schema change. Not deployed.

2026-11-11: Latest local fixes cover the `/en/api` public-host guard, partial Excel location changes with existing classes, age-based trial slot checks across public classes, and formula-safe retry CSV. `npm test` passed 21/21, `npm run check` reported 0 errors, and build passed. The new API smoke assertions could not run because Wrangler failed to initialize disposable local D1 after a network fetch failure. Not deployed.
2026-11-11: Four further website audit fixes are local and not deployed: no trial-form GET fallback with personal data, hidden-discipline classes removed from public queries, Excel class matching scoped to location, and hidden discipline/plan IDs rejected by trial API. API smoke assertions were added; verify them on a disposable local D1 when Wrangler is available.
2026-11-11: Public-site audit fixes are local: trial birth date fields now match the server requirement and show an error when blank, birth years follow Vietnam time, and missing English Home hero text falls back to Vietnamese. No schema change; deployment still requires the owner's explicit request.

2026-11-11: Four repo-audit fixes are local and await deployment: partial student imports can export only unsaved rows for correction, student classes are checked against the selected location, trial requests require age or birth date, and public text overrides are request-local. No schema change.

2026-11-11: Deployed Worker version `e8a70b00-a9a2-429e-8c1a-081b65675b43` to the owner's account with Custom Domains `gloryfightclub.vn` and `cms.gloryfightclub.vn`. The public home and CMS login both returned HTTP 200 over HTTPS after certificate activation. Cloudflare denied DNS and redirect rules access to the Wrangler credential. The `www` redirect and GitHub Actions setup remain pending. The destination holds the source D1 snapshot and 53 verified R2 objects. Changes made on the source after the snapshot have not been checked.

Read `CLAUDE.md` first: it holds every rule and convention. This file only says what is **in flight** and what is **next**.

The owner replaced the Google Sites CNAME with a proxied DNS record for `www`. Verified HTTP and HTTPS requests to `www` redirect with status 301 to the apex over HTTPS, preserving paths and query strings.

GitHub Actions deployed commit `b91bd2c` to the club account as Worker version `9470b69c-0280-4740-940c-938f0b6ed82e`. Run `42981827818` passed on attempt 2 after a transient npm connection reset. The API smoke test passed, D1 had no pending migrations, and the public home and CMS login both returned 200 over HTTPS.

## 1. Deploy state

2026-11-07: Audit fixes are local and await deployment: real date validation, partial student imports by code, dashboard permission checks, removal of the misleading Open mat callout and Vietnam date rollover refresh. Location 2 keeps its existing schedule-updating placeholder; no classes were invented. AI chatbot work is deferred until these fixes are complete.

Fee plan prices count up when visible again. The four amounts were checked locally and on the live Fees page and settled at their original values. The HTML contains final prices for reduced-motion and no-JS visitors. Deployed as Worker `0bd6a00a-8a59-4467-b26b-eee29a06fc3f`.

The owner asked for equal visual weight across the Home disciplines. All five cards now share size and styling; the oversized red MMA tile was removed. Checked locally at 375px and 1600px, then deployed as Worker `8866448b-f3c8-4049-b39f-f174abd524fe`. The public home returned HTTP 200 with equal card markup.

The old Home discipline-card wipe effect was removed after it caused low-contrast headings on hover. Deployed as Worker `8c23323e-182e-432c-8613-e904cd24d4dc`; the public home returned HTTP 200 with the new markup and no old wipe class.

The owner requested stronger visual hierarchy for Home's discipline section. A featured red MMA tile and separated dark discipline cards are implemented, checked at 375px and 1600px, and await deployment.

The Home discipline cards were restyled on 2026-11-07 and checked at 375px and 1600px with no horizontal overflow. Deployed as Worker `dec89088-5be1-4558-a5c0-be5f2e964e25`; the public home returned HTTP 200 with the new markup.

The UX/API pass and subsequent audit fixes were deployed to the two temporary domains. The current Worker version is `532a5218-d933-4dda-8434-7c0a9ece4d73`, deployed on 2026-11-07 from commit `e57297a`. Cloud D1 remains at migration `0005_last_saracen`; the audit fixes needed no migration. After deployment, the public home, English home, fees and CMS login returned HTTP 200.

The audit fixes cover the collapsed mobile menu, thumbnail overwrite permission, trial class discipline/location validation, translated skip link, removal of unused animation code and dangerous remote-seed instructions. `npm run test:api` now covers key writes against a disposable D1 and runs in CI. Seven visible test testimonials/posts/FAQ rows in cloud D1 were replaced by clearly labeled example content at the owner's request; no student or fee rows were changed. English fields are empty and correctly fall back to Vietnamese examples.

Verification: `npm run check` had 0 errors, `npm test` passed 19/19, and `npm run build` succeeded. Viewed Home, Fees, Schedule and the trial form at 375px and 1600px with no horizontal overflow; partial birth date and slot-dependent preferred time behaved as intended. On a separate disposable local D1, API conversion returned 201 then 409 on retry, diary creation retained its media, an expired trial slot returned 400 and a future slot returned 200. The disposable database was removed after the check.
After deployment, the public home, fees and English pages and the CMS login page returned HTTP 200 on their configured domains.

Other coding agents (Codex…) start from `AGENTS.md` at the repo root — a one-file briefing that points back here and to `CLAUDE.md`.

CI (`.github/workflows/deploy.yml`) still fails at the first step on every push — expected (no `CLOUDFLARE_API_TOKEN` secret, on hold until the owner's domain).

## 2. Waiting on the owner (content, done in the CMS — no code)

- Upload a real hero photo (CMS → Trang chủ).
- Decide the "GỢI Ý THÊM" club policies (card freeze 15 days, referral, family 5–10% discount, renewal price, martial-arts culture) — not published; once decided, add them in CMS → Quy định CLB.
- Still open from `CLAUDE.md`: schedule image for location 2, coach achievements/photos, which coach leads each class, the "Fighter class", Kudo Kids schedule, Kudo belt stripes.
- Read-only check of remote D1 on 2026-11-06 confirmed `hero.image_key` is null, there are no public gallery photos, location 2 has neither a schedule image nor public classes, and no class is named Fighter or Kids. Seven public coach records have photos; these are portraits, not a class/hero photo. No remote data was changed.

## 3. Open questions to ask the owner

- The owner requested removal of bare decorative number labels (deployed). The large day number on text-only diary cards remains because it communicates the post date.

## 4. Possible next work (proposed, not started)

- Trial form: "Mục tiêu tập" + "Đã từng tập chưa?" fields (2 DB columns); parent name/phone fields that appear under 16; preselect the Kids plan by age (needs an age field on fee plans).
- Cloudflare Turnstile on the trial form (honeypot + rate limit only today).
- Zalo OA / SMS reminder the day before a trial session (paid service).

## 5. Session notes worth keeping

- Owner preferences this session (already in `CLAUDE.md`): no custom cursor; no bare numeric labels; "Buổi học thử có sẵn" with only the 2 nearest sessions; Sunday is "CN", never "8"; a small "schedule may change" note on `/lich-hoc`; the diary is ordered by session date (newest first).
- Image copies: every image uploaded through the CMS also gets `<key>.w800` (best effort). The 13 images that existed on 2026-11-06 were backfilled by hand (copies made in a browser, uploaded with `wrangler r2 object put … --remote`). If `THUMB_W` ever changes, regenerate copies the same way.
- Escaping pitfall when editing through shell/Python here-docs: `\n`, `\\'` and `<` sometimes lose a backslash — re-read the file after such edits (check `u003c` in `PublicLayout.astro` and `dang-ky-hoc-thu.astro` stays `\\u003c`).
- In `.astro`, never put `<!-- -->` directly inside `{cond && (…)}` — compile error.
