# Handoff — where we left off (2026-11-07)

Read `CLAUDE.md` first: it holds every rule and convention. This file only says what is **in flight** and what is **next**.

## 1. Deploy state

Fee plan prices count up when visible again. The four amounts were checked in a browser and settled at their original values. The HTML contains final prices for reduced-motion and no-JS visitors. Awaiting deployment.

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
