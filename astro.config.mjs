// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://gloryfightclub.huutrong203.id.vn',
  output: 'server',
  // Ảnh đã được nén ở trình duyệt trước khi upload R2 → không cần dịch vụ resize (tránh binding IMAGES).
  adapter: cloudflare({ imageService: 'passthrough' }),
  // Session đăng nhập CMS tự quản lý trong D1, không cần KV của Astro.
  session: false,
  // Thanh công cụ dev của Astro che nút ở cuối màn hình điện thoại khi thử CMS.
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
