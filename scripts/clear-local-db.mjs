// Xoá database D1 local (.wrangler/state) trước khi tạo lại bằng `npm run db:reset`.
import { rmSync } from 'node:fs';

try {
  rmSync('.wrangler/state', { recursive: true, force: true });
} catch (e) {
  console.error(`\nKhông xoá được database local (${e.code}).`);
  console.error('Database đang bị dev server giữ. Tắt `npm run dev` (Ctrl+C) hoặc chạy `npx astro dev stop`, rồi chạy lại.\n');
  process.exit(1);
}
