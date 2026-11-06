# Handoff — where we left off (2026-11-06)

Read `CLAUDE.md` first: it holds every rule and convention. This file only says what is **in flight** and what is **next**.

## 1. Not deployed yet (do this first)

The live site runs commit `ab70bd1` (Worker version `53bc60a0`). Two commits are waiting:

| Commit | What | State |
|---|---|---|
| `05fab71` | Schedule legend shows Sunday as "CN" (78 → "7·CN"), never "8" | pushed, **not deployed** |
| `7aa19b9` | CMS fields that did nothing now show: Home shows only coaches ticked "Nổi bật ở trang chủ" (4 on the live data) + "Xem tất cả"; class level badge + class note on `/lich-hoc` and in class lists | **not pushed, not deployed** |

Why: Cloudflare had an outage ("Network Performance Issues in Singapore") — `wrangler deploy` got `503 Service Unavailable` from the API. The owner chose to deploy later.

Steps (no migration needed — `0003` and `0004` are already applied on the cloud DB):

```bash
curl -s https://www.cloudflarestatus.com/api/v2/status.json   # wait until no Singapore incident
git push origin main
npm run deploy
```

Then check on the live site:
- `/lich-hoc`: legend chips read "246 · 357 · CN" (and "7·CN" if a 78 class exists); classes with a level ≠ "Mọi trình độ" show a badge, notes show under the name.
- `/`: the coaches section shows the 4 featured coaches + "Xem tất cả".

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
