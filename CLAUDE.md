# CLAUDE.md — Glory Club

## Dự án
Website quảng bá + CMS quản lý võ sinh cho **GLORY FIGHT CLUB** (MMA, Kudo, Muay Thai/Kickboxing, BJJ/Grappling, Boxing), 2 cơ sở ở TP.HCM.
- **Dự án cá nhân, độc lập hoàn toàn với công ty NEAX.** Chỉ làm trong thư mục này, chỉ commit/push lên `https://github.com/nhuutrong203/gloryfightclub`.
- Public (`gloryfightclub.huutrong203.id.vn`): chỉ quảng bá/tuyển sinh, không đăng nhập cho khách, không like/comment.
- CMS (`cms-gloryfightclub.huutrong203.id.vn`): cho chủ CLB và các HLV (không có vai trò "trợ giảng"); ưu tiên dễ dùng trên điện thoại.
- Không lưu ảnh học viên. Lớp gọi theo nhóm ngày: `246` = T2·T4·T6, `357` = T3·T5·T7, `8` = CN.
- Học phí đóng theo tháng, 4 gói: Premium 1.500.000 (mọi môn, trừ lớp trẻ em + lớp Fighter), Standard 1.000.000 (2 môn), Trẻ em 700.000 (6–15 tuổi), HSSV 800.000 (1 môn). Open mat – Sparring CN 18:00–21:00 miễn phí.
- **Không** có thanh toán online / mã QR trên web: học viên quét mã chuyển khoản tại CLB; CMS chỉ ghi nhận đã thu (tiền mặt / chuyển khoản).
- **Không** có điểm danh, **không** có thi lên đai (CMS chỉ quản lý học viên + học phí + nội dung web).
- Web public **song ngữ**: VI ở `/`, EN ở `/en/...`; cột chữ public có cặp `_en`, trống thì fallback VI. CMS chỉ tiếng Việt.
- Vai trò: `owner` (chủ CLB Lê Thành Trung, toàn quyền) và `coach` (quyền do owner tick; mặc định: học viên + đăng tin, không học phí, không xóa).
- Mỗi cơ sở: lịch nhập trong CMS hoặc ảnh lịch (`locations.schedule_image_key`).
- Cơ sở 1: 125/9/18 Nguyễn Thị Nhuần, An Phú Đông. Logo gốc (raster): `docs/logo-source.png`.
- Tên miền `huutrong203.id.vn` đã ở nameserver Cloudflare → deploy chỉ cần thêm 2 Custom Domain cho Worker, không đụng bản ghi DNS khác.
- **Đang chạy thật** tại https://gloryfightclub.huutrong203.id.vn và https://cms-gloryfightclub.huutrong203.id.vn. Deploy lại: `npm run deploy`.

## Trạng thái
- [x] Lập kế hoạch v3 → `docs/PLAN.md` (đã duyệt)
- [x] GĐ 0 — Nền móng: Astro 7 + Cloudflare adapter 14, schema + migration `0000_init`, seed thật/demo, logo SVG, layout public, trang chủ khung (VI/EN)
- [x] GĐ 1 — Website public: 19 trang VI/EN (trang chủ, môn, lịch, HLV, tin tức, thư viện, cấp đai, học phí, thành tích, cảm nhận, hỏi đáp, giới thiệu, liên hệ, học thử, 404, sitemap, robots)
- [x] GĐ 2 — CMS lõi: đăng nhập, tổng quan, học viên, học thử → học viên, tin tức + upload R2, nội dung website
- [x] GĐ 3 — Học phí theo tháng, xuất CSV, tài khoản + phân quyền HLV
- [x] GĐ 4 — Cài đặt CLB (liên hệ, hero, trang giới thiệu), thư viện, thành tích, cảm nhận, FAQ, cấp đai trong CMS
- [x] GĐ 5 — Deploy (2026-11-02): Worker `gloryfightclub` trên tài khoản Cloudflare coftivenist@gmail.com, D1 `glory-db` (APAC), R2 `glory-media`, 2 custom domain. Cloud chỉ có dữ liệu thật (seed.sql). Tài khoản chủ CLB trên cloud: `lethanhtrung1996` (owner, tạo 2026-11-02; mật khẩu do anh Trọng giữ, KHÔNG ghi vào repo).

## Stack
Astro 7 SSR + `@astrojs/cloudflare` 14 (Cloudflare Workers) · React (CMS SPA) · Hono (API trong `/api/*`) · Cloudflare D1 + Drizzle ORM · Cloudflare R2 (ảnh) · Tailwind CSS v4.

## Quy ước
- Giao diện, nội dung, seed: **tiếng Việt**. Code, tên bảng/cột: tiếng Anh, snake_case cho DB.
- Ngày: text `YYYY-MM-DD`; thời điểm: integer unix ms; múi giờ nghiệp vụ `Asia/Ho_Chi_Minh`.
- Ảnh lưu **key R2**, không lưu URL; phục vụ qua `/media/*`. R2 chỉ chứa ảnh công khai.
- Dữ liệu học viên không bao giờ được trả về từ route public hay host public.
- Màu: đen `#0A0A0A`, trắng, đỏ nhấn `#E10600`. Font: Anton (tiêu đề) + Be Vietnam Pro (nội dung).
- **Tiêu đề Anton chữ in hoa tiếng Việt: line-height ≥ 1.12** (dấu chồng Ổ/Ầ/Ấ cao hơn chữ hoa). KHÔNG dùng `leading-none`/`leading-[0.9x]` cho chữ có dấu; chỉ dùng cho số/giá. Tiêu đề có `text-wrap: balance`.
- Chữ đỏ **cỡ nhỏ** trên nền tối dùng `text-glory-bright` (#ff3b30, 5.6:1); `glory` (#E10600) chỉ cho nút/khối/tiêu đề lớn; trên nền sáng dùng `glory-dark`.
- Menu/footer tự ẩn link tới mục chưa có nội dung (tin tức, cảm nhận, FAQ, thư viện, thành tích, cấp đai) — đếm trong `PublicLayout`.
- Điện thoại: thanh hành động cố định dưới đáy (Gọi · Zalo · Học thử), `body` có padding-bottom tương ứng; nút nổi tròn chỉ hiện từ `lg`.
- Chuyển trang: CSS `@view-transition` (không cần JS). Hiệu ứng luôn có nhánh `prefers-reduced-motion`.
- Mọi nội dung public đọc từ D1, không hard-code. Chữ giao diện cố định nằm trong `dict` (`src/i18n.ts`) và **sửa được trong CMS → Chữ trên website** (settings key `texts` = `{vi:{key:chữ}, en:{…}}`, middleware nạp vào `setTextOverrides`, `t()` ưu tiên bản đã sửa). Thêm chữ mới → thêm khoá vào `dict`, KHÔNG viết chuỗi cứng trong trang; nhóm hiển thị ở `src/admin/pages/Texts.tsx` (`GROUPS`).
- Slogan (dải chữ chạy, footer) lấy từ `club.slogan`; dòng tên môn ở đầu trang chủ / Môn học lấy từ bảng `disciplines`.
- Mọi input từ form/API phải validate bằng zod ở phía server.
- **Cập nhật file này sau mỗi lần làm xong việc** (trạng thái, lệnh chạy, cấu trúc thay đổi).

## Cách chạy
```bash
npm install
npm run db:reset   # D1 local: tạo bảng + seed/seed.sql (thật) + seed/sample.sql (demo)
npm run dev        # web http://localhost:4321 (EN /en) · CMS http://localhost:4321/admin
```
Tài khoản demo LOCAL (trong `seed/sample.sql`): `admin` (chủ CLB) và `hlv` (HLV), mật khẩu `glory2026`.
Tạo tài khoản thật: `node scripts/create-user.mjs <username> <mật-khẩu> "<Họ tên>" owner [--remote]`.
**Astro 7 chỉ cho 1 dev server / dự án** — muốn chạy lệnh khác cần DB thì dùng chung server đang chạy, hoặc `npx astro dev stop`.
Chi tiết lệnh, deploy, gắn domain: `README.md`. Trong Claude desktop: `.claude/launch.json` có cấu hình `glory-dev`.

## Ghi chú kỹ thuật (Astro 7 / adapter 14)
- Bindings lấy bằng `import { env } from 'cloudflare:workers'` (KHÔNG còn `Astro.locals.runtime`). DB: `import { db, schema } from '../db'`.
- `astro dev` chạy trong workerd thật; D1/R2 local lưu ở `.wrangler/state`.
- `npm run dev:remote` = `CLOUDFLARE_ENV=remote` → dùng `env.remote` trong `wrangler.jsonc` (bindings `remote: true`).
- Tailwind v4: class dùng chung khai báo bằng `@utility` trong `src/styles/global.css` (không dùng `@layer components` + `@apply`).
- `session: false` (tự quản lý session trong D1), `imageService: 'passthrough'` (ảnh nén sẵn ở trình duyệt).
- Bản EN: middleware rewrite `/en/*` → cùng trang, `Astro.locals.lang = 'en'`. Dùng `t()`, `tr(row, 'field', lang)`, `href(path, lang)` trong `src/i18n.ts`.
- Sửa schema: sửa `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. Chưa deploy lần nào nên GĐ 0–1 có thể gộp lại migration `0000`.
- `db:reset` cần tắt dev server trước (Windows khoá file SQLite) — script `scripts/clear-local-db.mjs` báo lỗi rõ.
- `seed/seed.sql` chỉ chứa dữ liệu thật (được nạp lên cloud); dữ liệu giả để ở `seed/sample.sql`, đánh dấu "(mẫu)".

## Cấu trúc chính
```
src/pages/            trang public (.astro) · api/[...path].ts → Hono · admin/[...path].astro → React CMS · media/[...key].ts (chỉ key public/…)
src/components/public trang trí public: Icon, PageHero, Marquee, PlanCard, CoachCard, PostCard, ClassList, CtaBand
src/lib/              auth.ts (PBKDF2, session, PERMISSIONS) · util.ts (vnNow, slugify, normalizePhone) · site.ts · public.ts (truy vấn public, richText, youtubeEmbed)
src/api/              index.ts (CSRF origin check, auth middleware) · guard.ts (need(), body(), csv()) · auth · public (form học thử) · content (CRUD chung) · students · fees · trials · posts · admin (me, lookups, dashboard, settings, upload, users)
src/admin/            React CMS: App.tsx (router tự viết, khung, menu dưới) · lib.ts (api, useApi, toast, uploadImage nén WebP) · ui.tsx · resources.ts · pages/*
```
- `src/admin/resources.ts` là **nguồn duy nhất** cho các mục nội dung đơn giản: vừa sinh form CMS vừa sinh zod + cột được ghi ở API. Thêm cột nội dung → thêm field ở đây.
- Quyền: `students.view`, `students.edit`, `fees.view`, `fees.edit`, `posts`, `content`, `delete`. Owner luôn đủ quyền; tài khoản chỉ owner quản lý. Kiểm tra quyền ở API bằng `need()`, UI chỉ ẩn/hiện.
- Tìm học viên bỏ dấu làm trong JS (`matchQuery`) — ổn tới vài nghìn học viên.
- Học phí: 1 dòng `payments` / học viên / tháng (unique). Dashboard "chưa đóng" = học viên `active` không có payment tháng hiện tại.
- Upload: client nén ≤1600px WebP (fallback JPEG), server kiểm tra magic bytes, ≤8MB, key `public/YYYY-MM/<uuid>.ext`.
- CMS: tab "Học thử" có huy hiệu đỏ đếm đăng ký mới (tải lại mỗi phút + khi chuyển trang).
- Form học thử: honeypot `website`; trẻ <16 tuổi khi chuyển thành học viên thì SĐT đăng ký thành SĐT phụ huynh.

## Production
- Đăng nhập CMS giới hạn 10 lần/phút/IP bằng binding `LOGIN_LIMITER` (Workers Rate Limiting, `wrangler.jsonc`).
- KHÔNG nạp `seed/sample.sql` lên cloud. Sửa schema → `db:generate` → `db:migrate:remote` TRƯỚC `npm run deploy`.
- D1 local lưu theo `database_id`: đổi id thì phải `npm run db:reset` lại.
- Còn có thể thêm: Cloudflare Turnstile cho form học thử (hiện chỉ có honeypot).

## Còn chờ từ anh Trọng / thầy
- Ảnh lịch cơ sở 2 (hoặc thầy tự nhập/up trong CMS).
- Thành tích + ảnh của HLV Tỉnh, Đức, Vĩnh Tâm, Nhi Thảo; HLV phụ trách từng ca.
- "Lớp Fighter" là lớp nào, lịch ra sao. Lớp Kudo Kids học giờ nào, cơ sở nào.
- Hệ thống đai Kudo trong seed là bản rút gọn — cần thầy xác nhận.
