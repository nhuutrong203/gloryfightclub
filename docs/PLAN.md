# GLORY FIGHT CLUB — Kế hoạch triển khai (v3, chờ duyệt)

> Trạng thái: **CHỜ DUYỆT**. Chưa có code. Câu hỏi còn mở ở mục 9.
> v2: 2 cơ sở, lịch thật, bỏ ảnh học viên, bỏ "trợ giảng", 2 tên miền con, repo GitHub.
> v3: **song ngữ Việt–Anh**; lịch cơ sở 2 nhập qua CMS hoặc up ảnh; chủ CLB tự phân quyền cho HLV; **bỏ điểm danh và thi lên đai**; thêm thông tin phụ huynh cho học viên nhỏ; dữ liệu HLV + thành tích thật từ gloryfightclub.vn.

## Thay đổi v3 (tóm tắt)

| Hạng mục | Quyết định |
|---|---|
| Ngôn ngữ | Tiếng Việt mặc định ở `/`, tiếng Anh ở `/en/...`, nút chuyển VI/EN trên header. Các ô nội dung trong CMS có thêm ô "English" (bỏ trống thì trang EN hiện bản tiếng Việt). CMS giữ tiếng Việt. |
| Lịch cơ sở 2 | Mỗi cơ sở có 2 cách: nhập lớp trong CMS (ra bảng lịch tự động) **hoặc** up 1 ảnh lịch tập. Có ảnh thì trang Lịch học hiện ảnh của cơ sở đó. |
| Phân quyền | Chủ CLB có toàn quyền và tự bật/tắt quyền cho từng HLV bằng các ô tick: *Xem học viên · Sửa học viên · Xem học phí · Ghi học phí · Đăng tin · Sửa nội dung web · Xóa dữ liệu*. Mặc định cho HLV mới = phương án B (học viên + đăng tin, không học phí, không xóa). |
| Điểm danh, thi lên đai | **Bỏ.** Chỉ còn danh sách học viên + học phí. Trang public "Hệ thống đai" (giới thiệu đai Kudo/BJJ) vẫn giữ. |
| Học viên nhỏ tuổi | Thêm năm sinh, tên + SĐT phụ huynh. |
| HLV | Lấy từ gloryfightclub.vn (xem mục 0). Thành tích hiện rõ ở trang chủ, trang HLV, trang Thành tích để tăng uy tín. |

---

## 0. Thông tin CLB đã có

| | |
|---|---|
| Tên | **GLORY FIGHT CLUB** — slogan **NO PAIN – NO GLORY** |
| Môn | MMA · Kudo · Muay Thai / Kickboxing · BJJ (Jiujitsu) / Grappling · Boxing · Open mat – Sparring (CN) |
| Cơ sở 1 | 125/9/18 Nguyễn Thị Nhuần, P. An Phú Đông, TP.HCM |
| Cơ sở 2 | Trung tâm thể thao Sport House — A1.06 Chung cư Dream Home Residence, 148/21 Đường số 59, P. An Hội Tây (Gò Vấp), TP.HCM |
| Hotline | 0793 182 218 · 0382 998 538 (Zalo) |
| Mạng xã hội | facebook.com/gloryfightclubvn · Instagram @glory.fight.club |
| Logo | Lục giác + chữ "GL", trắng trên nền đen |
| Repo | github.com/nhuutrong203/gloryfightclub (repo đang trống) |
| Web public | `gloryfightclub.huutrong203.id.vn` |
| CMS | `cms-gloryfightclub.huutrong203.id.vn` |

### Đội ngũ HLV (nguồn: gloryfightclub.vn)

| HLV | Vai trò / môn | Thành tích |
|---|---|---|
| **Lê Thành Trung** | Chủ CLB · Head Coach · MMA – Kudo – BJJ | Đai đen Kudo do Liên đoàn Kudo thế giới cấp · Võ sĩ MMA đang thi đấu · HCV giải Kudo quốc gia 2024 · Hơn 5 năm kinh nghiệm huấn luyện |
| **Nguyễn Tiến Đăng Phong** | HLV Jiujitsu | HCB giải các CLB Jujitsu quốc gia · HCB, HCĐ Đại hội TDTT ĐBSCL · HCV Open Jiujitsu Cần Thơ |
| **Ninh Văn Tỉnh** | HLV Striking – Kudo – Boxing – Kickboxing | *(chưa có — câu 4)* |
| **Huỳnh Minh Đức** | HLV Striking – Kudo – Boxing – Kickboxing | *(chưa có)* |
| **Nguyễn Huy Vĩnh Tâm** | HLV Striking – Kudo – Boxing – Kickboxing | *(chưa có)* |
| **Nguyễn Trương Nhi Thảo** | HLV Kudo Kids | *(chưa có)* |

Mô tả môn (Kudo, MMA, Muay Thái – Kickboxing, Judo – Wrestling – Jiujitsu) và sự kiện "Giải vô địch Kudo Cúp Quốc gia 2025" cũng lấy từ website cũ làm nội dung ban đầu.

Lịch tuần **cơ sở 1** trong ảnh sẽ được nạp làm dữ liệu thật (không phải dữ liệu mẫu):

| Giờ | T2 · T4 · T6 (lớp **246**) | T3 · T5 · T7 (lớp **357**) |
|---|---|---|
| 08:30–09:30, 09:30–10:30, 10:30–11:30 | MMA | Boxing |
| 17:00–18:30 | Muay Thai / Kickboxing | — |
| 18:30–20:00 | MMA | MMA / Muay Thai |
| 20:00–21:30 | Jiujitsu / Grappling | Kudo |
| **CN 18:00–21:00** | Open mat – Sparring | |

---

## 1. Stack (giữ như v1)

Astro 5 SSR trên **Cloudflare Workers** · React cho CMS · Hono cho API · **D1** + Drizzle · **R2** cho ảnh · Tailwind v4 · Turnstile chống spam form.

D1 phù hợp (dữ liệu nhỏ, free tier dư dùng, có Time Travel khôi phục 30 ngày). "D1 local" chỉ là file SQLite Wrangler tự tạo, không phải cài database.

```bash
npm run dev                                          # chạy local, D1/R2 giả lập trong .wrangler/
npm run dev:remote                                   # chạy local nhưng đọc/ghi D1 + R2 thật trên cloud
npx wrangler d1 migrations apply glory-db --local    # tạo bảng ở local
npx wrangler d1 migrations apply glory-db --remote   # tạo bảng trên cloud
npm run deploy                                       # build + deploy lên Cloudflare
```

### Hai tên miền con, một ứng dụng
Một Worker duy nhất phục vụ cả hai host; middleware phân luồng theo hostname:
- `gloryfightclub.…` → website public. Truy cập `/admin` ở đây sẽ bị chuyển sang CMS.
- `cms-gloryfightclub.…` → chỉ có CMS + API admin. Cookie đăng nhập chỉ gắn cho host này.
- Ở local: public là `http://localhost:4321`, CMS là `http://localhost:4321/admin` (không cần giả lập 2 tên miền).

**Tên miền khi deploy (GĐ 5):** `huutrong203.id.vn` **đã dùng nameserver Cloudflare** (đã kiểm tra 2026-11-02) → chỉ cần thêm 2 Custom Domain cho Worker trong Cloudflare dashboard (hoặc khai báo trong `wrangler.jsonc`). Cloudflare tự tạo bản ghi DNS cho đúng 2 tên miền con này; các bản ghi/CNAME của project khác không bị đụng tới.

---

## 2. Kiến trúc

```
 Khách (điện thoại)                       Thầy / HLV (điện thoại)
 gloryfightclub.huutrong203.id.vn         cms-gloryfightclub.huutrong203.id.vn
        │                                          │
        ▼                                          ▼
 ┌───────────────── Cloudflare Worker (1 app Astro) ─────────────────┐
 │ middleware.ts: phân luồng theo host + kiểm tra đăng nhập cho CMS   │
 │ Trang public (Astro SSR)     /admin/* (React SPA)    /api/* (Hono) │
 │ /media/*  ảnh public từ R2 (cache dài)                             │
 └──────────────┬──────────────────────────────────┬─────────────────┘
                ▼                                  ▼
          D1 (glory-db)                      R2 (glory-media)
                                    ảnh HLV, tin tức, thư viện, thành tích
```

- **Không lưu ảnh học viên** → R2 chỉ chứa ảnh công khai, đơn giản hơn v1 (bỏ phần ảnh riêng tư).
- Đăng nhập: tên đăng nhập + mật khẩu (PBKDF2 qua WebCrypto), session trong D1, cookie `HttpOnly; Secure`.
- Ảnh nén trên điện thoại trước khi upload (≤1600px, WebP). Video dùng link YouTube/Facebook.
- Lên lịch đăng bài bằng `published_at`, không cần cron. Múi giờ `Asia/Ho_Chi_Minh`.
- Xuất Excel = CSV có BOM UTF-8.

---

## 3. Cấu trúc thư mục

```
gloryfightclub/
├─ CLAUDE.md · README.md · docs/PLAN.md
├─ wrangler.jsonc · astro.config.mjs · drizzle.config.ts · package.json
├─ migrations/               # SQL do drizzle-kit sinh
├─ seed/seed.sql             # dữ liệu thật (cơ sở, lịch, môn) + dữ liệu mẫu (tin, cảm nhận…)
├─ public/                   # logo.svg, favicon, ảnh OG mặc định
└─ src/
   ├─ db/schema.ts
   ├─ lib/                   # auth, media, csv, dates, slug, fees
   ├─ middleware.ts
   ├─ api/                   # Hono: index.ts + routes/*
   ├─ layouts/PublicLayout.astro
   ├─ components/
   ├─ styles/global.css
   ├─ admin/                 # React SPA
   └─ pages/                 # trang public (mục 5) + api/[...path].ts + admin/[...path].astro + media/[...key].ts
```

---

## 4. Schema database (D1)

Quy ước: `id` tự tăng; ngày `YYYY-MM-DD`; thời điểm unix ms; `is_public` ẩn/hiện; `sort` thứ tự; ảnh lưu key R2.
**Ngày trong tuần lưu dạng chuỗi số kiểu Việt Nam**: `"246"` = T2·T4·T6, `"357"` = T3·T5·T7, `"8"` = Chủ nhật — đúng cách CLB đang gọi lớp.

### Hệ thống
| Bảng | Cột chính |
|---|---|
| `users` | id, username, password_hash, full_name, role (`owner` \| `coach`), permissions (JSON, danh sách quyền chủ CLB tick cho HLV), coach_id, is_active |
| `sessions` | id, user_id, expires_at |
| `settings` | key, value (JSON) — hotline, Zalo, Facebook, Instagram, nội dung hero, trang Giới thiệu |

### Nội dung public
| Bảng | Cột chính |
|---|---|
| `locations` (cơ sở) | id, name, address, map_url, phone, schedule_image_key (ảnh lịch, tùy chọn), sort |
| `disciplines` (môn) | id, slug, name (MMA, Kudo…), summary, description, cover_key, has_belts, is_public, sort |
| `classes` (lớp / ca tập) | id, name (vd. "MMA tối"), discipline_ids (môn, có thể 2 môn như "MMA / Muay Thai"), location_id, days (`"246"`), start_time, end_time, coach_id, level, note, is_public, is_active |
| `coaches` (HLV) | id, slug, full_name, photo_key, title, bio, achievements, discipline_ids, is_featured, is_public, sort |
| `belts` (chỉ cho môn có đai: Kudo, BJJ) | id, discipline_id, name, color, rank, requirements, min_months |
| `fee_plans` (học phí tháng) | id, name, discipline_id / class_id, price_per_month, description, is_public, sort — *chờ ảnh học phí của anh để chốt cấu trúc* |
| `posts`, `post_images` | tin tức dạng feed: content, published_at, is_public · ảnh nhiều tấm |
| `gallery_items` | type (photo \| video), key / video_url, caption, album, is_public, sort |
| `testimonials` · `faqs` · `achievements` | như v1 |

**Song ngữ:** mỗi cột chữ hiển thị public có thêm cột `_en` (vd. `name` + `name_en`, `description` + `description_en`); trang EN dùng `_en`, trống thì lấy bản tiếng Việt. Chữ cố định của giao diện (menu, nút) nằm trong 1 file từ điển `src/i18n.ts`.

Trang **Lịch học** public được dựng tự động từ bảng `classes` (mỗi lớp `"246"` hiện ở cột T2, T4, T6) → sửa lớp trong CMS là lịch đổi theo, không phải nhập 2 nơi.

### Học viên (riêng tư — không có ảnh)
| Bảng | Cột chính |
|---|---|
| `students` | id, code (GF0001), full_name, phone, birth_year, parent_name, parent_phone, location_id, joined_at, status (`active` \| `paused` \| `quit`), note |
| `student_classes` | student_id, class_id (một người có thể học MMA 246 + Kudo 357) |
| `payments` | id, student_id, month (`2026-11`), amount, paid_at, method (tiền mặt / chuyển khoản), note, created_by |
| `trial_registrations` | full_name, phone, discipline_id, location_id, preferred_time, note, status (`new` \| `contacted` \| `enrolled` \| `rejected`), student_id |

**Học phí theo tháng:** mỗi lần thu = 1 dòng `payments` cho 1 tháng. Màn hình "Học phí tháng 11" liệt kê học viên đang học: ai **đã đóng** / **chưa đóng**, bấm 1 nút để ghi nhận. Dashboard đếm số người chưa đóng tháng này.

---

## 5. Danh sách trang

### Website public
| URL | Nội dung |
|---|---|
| `/` | Hero ảnh lớn + "NO PAIN – NO GLORY" + nút **Đăng ký học thử**; các môn; dải **"Fighters of Glory"** (HLV / võ sinh tiêu biểu); lịch hôm nay; tin mới; cảm nhận; 2 cơ sở; CTA |
| `/gioi-thieu` | Lịch sử, triết lý, giá trị, thành tích nổi bật |
| `/mon-hoc`, `/mon-hoc/[slug]` | MMA, Kudo, Muay Thai, BJJ, Boxing: mô tả, đối tượng, HLV, lịch của môn đó, học phí |
| `/lich-hoc` | Lịch tuần, **chọn cơ sở**, lọc theo môn; mobile hiện theo từng ngày (tab T2…CN), desktop dạng bảng như ảnh |
| `/huan-luyen-vien`, `/huan-luyen-vien/[slug]` | Danh sách + chi tiết HLV |
| `/tin-tuc`, `/tin-tuc/[slug]` | Feed kiểu Facebook |
| `/thu-vien` | Ảnh + video |
| `/cap-dai` | Hệ thống đai Kudo / BJJ |
| `/hoc-phi` | Bảng học phí tháng |
| `/thanh-tich` · `/cam-nhan` · `/hoi-dap` | |
| `/lien-he` | 2 cơ sở, mỗi cơ sở có Google Maps, nút gọi, Zalo, Facebook, Instagram |
| `/dang-ky-hoc-thu` | Tên, SĐT, môn quan tâm, cơ sở, giờ mong muốn → vào CMS |
| Mọi trang | Nút **Gọi** + **Zalo** nổi; SEO, Open Graph, sitemap |

### CMS (`cms-gloryfightclub…`)
Mobile-first, thanh điều hướng dưới đáy: **Tổng quan · Học viên · Học phí · Học thử · Thêm**.

- **Tổng quan**: số học viên đang học (theo cơ sở), học viên mới tháng này, số người chưa đóng học phí tháng này, đăng ký học thử mới, các ca tập hôm nay.
- **Học viên**: tên, SĐT, năm sinh, phụ huynh (tên + SĐT), cơ sở, lớp; danh sách, tìm theo tên/SĐT, lọc theo cơ sở / lớp / trạng thái, thêm–sửa–xóa; trang chi tiết có lịch sử đóng tiền.
- **Học phí**: chọn tháng → danh sách đã đóng / chưa đóng → bấm "Đã thu".
- **Học thử**: danh sách, đổi trạng thái, **"Chuyển thành học viên"** 1 click.
- **Thêm**: Lớp & lịch, Môn, HLV, Cơ sở, Tin tức, Thư viện, Học phí, Cảm nhận, FAQ, Thành tích, Cài đặt, Tài khoản, Xuất CSV.

Phân quyền: **Chủ CLB** (toàn quyền, có màn hình "Tài khoản" để tạo tài khoản HLV và tick quyền) và **HLV** (theo quyền chủ CLB cấp; mặc định: học viên + đăng tin).

---

## 6. Thiết kế

- **Màu theo đúng nhận diện hiện có của CLB** (ảnh lịch tập): đen `#0A0A0A`, trắng, xám đậm `#1A1A1A`, **đỏ `#E10600`** làm màu nhấn.
- Font: tiêu đề **Anton** (in hoa, đậm), nội dung **Be Vietnam Pro** — cả hai đủ dấu tiếng Việt.
- Logo: vẽ lại logo "GL" lục giác thành **SVG sắc nét** (ảnh hiện tại có một vết đen ở đầu chữ L và là ảnh raster); dùng cho header, favicon, ảnh share.
- Hero full-width ảnh tối, chữ in hoa cỡ lớn, khoảng trắng rộng, góc vuông, nút đỏ khối đặc. Chỉ lấy cảm hứng phong cách từ yibuko.com.
- Ảnh: dùng ảnh placeholder cho đến khi anh gửi ảnh thật (hoặc anh tự upload qua CMS).

---

## 7. Các giai đoạn

| GĐ | Nội dung | Anh kiểm tra được |
|---|---|---|
| **0 — Nền móng** | `git init` + nối repo GitHub, khởi tạo dự án, schema + migration, seed (cơ sở, môn, lịch thật), logo SVG, layout, CLAUDE.md, README | `npm run dev` mở trang chủ khung |
| **1 — Web public MVP** | Song ngữ VI/EN, Trang chủ, Môn học, Lịch học, HLV, Tin tức, Học phí, FAQ, Liên hệ, Học thử, nút Gọi/Zalo, SEO/OG/sitemap | Xem trên điện thoại, gửi form học thử |
| **2 — CMS lõi** | Đăng nhập + phân quyền, Tổng quan, Học viên, Học thử → học viên, Lớp & lịch / Môn / HLV / Cơ sở, Tin tức + upload ảnh R2 | Thêm học viên, đăng bài có ảnh → thấy ngay trên web |
| **3 — Nghiệp vụ** | Học phí tháng, Xuất CSV, Tài khoản + phân quyền HLV | Ghi nhận học phí, xuất CSV mở bằng Excel, tạo tài khoản HLV và tick quyền |
| **4 — Hoàn thiện** | Giới thiệu, Cấp đai, Thư viện, Thành tích, Cảm nhận + CMS, Cài đặt | Mọi nội dung public sửa được từ CMS |
| **5 — Deploy** | Tạo D1/R2 cloud, Turnstile, deploy, gắn 2 tên miền con | Web chạy trên tên miền thật |

Mỗi giai đoạn xong: chạy thử local, commit + push lên repo Glory, cập nhật CLAUDE.md.

---

## 8. Cố ý không làm
CMS song ngữ (CMS chỉ tiếng Việt), dịch tự động, điểm danh, thi lên đai, đăng nhập cho khách, like/comment, ảnh học viên, thanh toán online, nhắc học phí tự động qua SMS/Zalo, upload video trực tiếp, trình soạn thảo rich-text.

---

## 9. Câu hỏi còn mở

Đã chốt: song ngữ VI–EN · HLV mặc định phương án B, chủ CLB tự phân quyền · bỏ điểm danh + thi đai · có học viên nhỏ tuổi.

Còn lại — **không chặn việc bắt đầu**, tôi để dữ liệu mẫu và thay khi anh gửi:

Đã chốt thêm: địa chỉ cơ sở 1 = 125/9/18 · logo = ảnh "GL" đen–trắng, tôi vẽ lại thành SVG · tên miền giữ `huutrong203.id.vn` (đã ở Cloudflare).

1. **Ảnh lịch tập cơ sở 2**: chưa nhận được. Không gấp — thầy có thể tự up trong CMS.
2. **Học phí**: ✅ đã có 4 gói (Premium / Standard / Trẻ em / HSSV). Không làm QR/thanh toán trên web — học viên quét mã tại CLB. Còn hỏi: **"lớp Fighter"** là lớp nào?
3. **HLV còn thiếu thành tích/ảnh**: Ninh Văn Tỉnh, Huỳnh Minh Đức, Nguyễn Huy Vĩnh Tâm, Nhi Thảo — anh có thì gửi, không thì để trống, thầy tự bổ sung trong CMS.
4. *(Gợi ý, không bắt buộc)* CLB có sẵn `gloryfightclub.vn` (đang chạy Google Sites). Sau này muốn chuyển web sang tên miền đó chỉ cần thêm Custom Domain, không phải sửa code.
