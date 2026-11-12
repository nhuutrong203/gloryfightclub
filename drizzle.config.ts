import { defineConfig } from 'drizzle-kit';

// Generate SQL in migrations/. Apply it with Wrangler.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});
