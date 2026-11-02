import { defineConfig } from 'drizzle-kit';

// Chỉ dùng để sinh file SQL vào migrations/; áp migration bằng wrangler (xem package.json).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});
