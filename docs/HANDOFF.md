# Handoff — where we left off (2026-11-06)

Read `CLAUDE.md` first: it holds every rule and convention. This file only says what is **in flight** and what is **next**.

## 1. Deploy state

Everything up to `f0efb1e` is pushed and live (deployed 2026-11-06, Worker version `12022669`). Checked on the live site: `/lich-hoc` legend reads "246 · 357 · 7·CN · CN"; Home shows the 4 featured coaches + "Xem tất cả". Nothing is waiting.

CI (`.github/workflows/deploy.yml`) still fails at the first step on every push — expected (no `CLOUDFLARE_API_TOKEN` secret, on hold until the owner's domain).

## 2. Waiting on the owner (content, done in the CMS — no code)

- Delete test data on the live site: testimonials "Nhi Thao" (supercalifragilistic…), "test tên học viên", "test tên người 1" (maybe also "Trung Trực"); diary posts "Test Nhật kí" and "Test ngày quá khứ". Deleting in the CMS also removes their images (+ 800px copies).
- Upload a real hero photo (CMS → Trang chủ).
- Decide the "GỢI Ý THÊM" club policies (card freeze 15 days, referral, family 5–10% discount, renewal price, martial-arts culture) — not published; once decided, add them in CMS → Quy định CLB.
- Still open from `CLAUDE.md`: schedule image for location 2, coach achievements/photos, which coach leads each class, the "Fighter class", Kudo Kids schedule, Kudo belt stripes.

## 3. Open questions to ask the owner

- Remove the remaining decorative numbers too? (big outline "01, 02…" on discipline cards and the contact page; small grey numbers in the phone menu). The bare "01/02/03" labels on `/gioi-thieu` are already gone.

## 4. Possible next work (proposed, not started)

- Trial form: "Mục tiêu tập" + "Đã từng tập chưa?" fields (2 DB columns); parent name/phone fields that appear under 16; preselect the Kids plan by age (needs an age field on fee plans).
- Cloudflare Turnstile on the trial form (honeypot + rate limit only today).
- `srcset` (800px copy + original) for diary covers / gallery / achievement tiles like CoachCard has, if they look soft on retina screens.
- Zalo OA / SMS reminder the day before a trial session (paid service).

## 5. Session notes worth keeping

- Owner preferences this session (already in `CLAUDE.md`): no custom cursor; no bare numeric labels; "Buổi học thử có sẵn" with only the 2 nearest sessions; Sunday is "CN", never "8"; a small "schedule may change" note on `/lich-hoc`; the diary is ordered by session date (newest first).
- Image copies: every image uploaded through the CMS also gets `<key>.w800` (best effort). The 13 images that existed on 2026-11-06 were backfilled by hand (copies made in a browser, uploaded with `wrangler r2 object put … --remote`). If `THUMB_W` ever changes, regenerate copies the same way.
- Escaping pitfall when editing through shell/Python here-docs: `\n`, `\\'` and `<` sometimes lose a backslash — re-read the file after such edits (check `u003c` in `PublicLayout.astro` and `dang-ky-hoc-thu.astro` stays `\\u003c`).
- In `.astro`, never put `<!-- -->` directly inside `{cond && (…)}` — compile error.
