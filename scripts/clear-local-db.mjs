// Remove local D1 state before rebuilding it with npm run db:reset.
import { rmSync } from 'node:fs';

try {
  rmSync('.wrangler/state', { recursive: true, force: true });
} catch (e) {
  console.error(`\nCould not remove the local database (${e.code}).`);
  console.error('Stop the dev server with Ctrl+C or `npx astro dev stop`, then retry.\n');
  process.exit(1);
}
