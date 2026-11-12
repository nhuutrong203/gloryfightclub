// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://gloryfightclub.vn',
  output: 'server',
  // The browser compresses images before upload, so no IMAGES binding is needed.
  adapter: cloudflare({ imageService: 'passthrough' }),
  // CMS sessions live in D1 and do not need Astro KV.
  session: false,
  // The dev toolbar covers the CMS bottom actions on phones.
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
