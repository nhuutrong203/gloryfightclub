# GLORY FIGHT CLUB — Website + CMS

Website quảng bá (song ngữ Việt–Anh) và hệ thống quản lý học viên cho Glory Fight Club.
Chạy trên **Cloudflare Workers** · **D1** (database) · **R2** (ảnh). Framework: Astro 7 + React + Tailwind v4 + Drizzle.

Kế hoạch chi tiết: [`docs/PLAN.md`](docs/PLAN.md) · Bối cảnh cho AI/dev: [`CLAUDE.md`](CLAUDE.md)

---

## 1. Chạy ở máy (local)

Yêu cầu: **Node.js 22+** (đang dùng 24). Không cần cài database — D1 local là một file SQLite do Wrangler tự tạo trong `.wrangler/`.

```bash
npm install
npm run db:reset     # tạo bảng + nạp dữ liệu (thật + demo) vào D1 local
npm run dev          # mở http://localhost:4321  (bản EN: http://localhost:4321/en)
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server, D1/R2 **giả lập ở máy** (chạy bằng runtime thật của Cloudflare – workerd) |
| `npm run dev:remote` | Dev server nhưng đọc/ghi **D1 + R2 thật trên cloud** (cẩn thận: sửa là sửa dữ liệu thật) |
| `npm run db:reset` | Xoá D1 local, tạo lại bảng, nạp `seed/seed.sql` + `seed/sample.sql`. **Tắt `npm run dev` trước** (Windows không xoá được file DB đang mở) |
| `npm run db:generate` | Sau khi sửa `src/db/schema.ts`: sinh file migration mới vào `migrations/` |
| `npm run db:migrate` | Áp migration vào D1 local |
| `npm run build` / `npm run preview` | Build production / chạy thử bản build |
| `npm run check` | Kiểm tra TypeScript |

Dữ liệu seed:
- `seed/seed.sql` — **dữ liệu thật** (2 cơ sở, môn, HLV, lịch cơ sở 1, gói học phí, thành tích). Nạp lên cloud được.
- `seed/sample.sql` — **dữ liệu demo** (tin tức, cảm nhận, FAQ, học viên…, có chữ "mẫu"). **Chỉ dùng ở local.**

## 2. Đưa lên Cloudflare (lần đầu)

```bash
npx wrangler login                       # đăng nhập tài khoản Cloudflare (mở trình duyệt)
npx wrangler d1 create glory-db          # in ra database_id
npx wrangler r2 bucket create glory-media
```

1. Chép `database_id` vừa in ra vào **cả 2 chỗ** trong `wrangler.jsonc` (mục gốc và mục `env.remote`).
2. Tạo bảng + nạp dữ liệu thật lên cloud:
   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```
3. Deploy:
   ```bash
   npm run deploy
   ```
   Wrangler in ra địa chỉ `https://gloryfightclub.<tài-khoản>.workers.dev` để xem thử.

## 3. Gắn tên miền

`huutrong203.id.vn` đã dùng nameserver Cloudflare nên chỉ cần:

Cloudflare Dashboard → **Workers & Pages** → `gloryfightclub` → **Settings → Domains & Routes → Add → Custom domain**, thêm lần lượt:
- `gloryfightclub.huutrong203.id.vn` (website)
- `cms-gloryfightclub.huutrong203.id.vn` (CMS)

Cloudflare tự tạo bản ghi DNS + chứng chỉ HTTPS cho đúng 2 tên miền con này; các bản ghi khác của tên miền không bị ảnh hưởng.
Muốn đổi sang tên miền khác (vd. `gloryfightclub.vn`): thêm Custom domain mới và sửa `PUBLIC_HOST` / `CMS_HOST` trong `wrangler.jsonc`, rồi deploy lại.

## 4. Sao lưu / khôi phục

D1 có **Time Travel**: khôi phục database về bất kỳ thời điểm nào trong 30 ngày qua.
```bash
npx wrangler d1 time-travel info glory-db
npx wrangler d1 time-travel restore glory-db --timestamp=2026-11-02T10:00:00+07:00
```
Xuất bản sao ra file: `npx wrangler d1 export glory-db --remote --output=backup.sql`

## 5. Cấu trúc thư mục

```
src/db/schema.ts        schema database (nguồn duy nhất) → migrations/ do drizzle-kit sinh
src/middleware.ts       phân luồng host public/CMS + bản tiếng Anh /en/*
src/i18n.ts             từ điển giao diện VI/EN + helper chọn cột *_en
src/lib/site.ts         thông tin CLB dùng chung (settings, cơ sở)
src/layouts/            layout trang public (header, footer, SEO, nút Gọi/Zalo)
src/components/         Logo (SVG) và các khối giao diện
src/pages/              trang public; media/[...key].ts phục vụ ảnh từ R2
seed/                   dữ liệu thật + demo
docs/                   kế hoạch, logo gốc
```
