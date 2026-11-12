// Create a CMS account or reset its password.
//   node scripts/create-user.mjs <username> <password> "<Full name>" [owner|coach] [--remote]
// Keep real credentials out of this public repository.
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Reuse the Worker's password hashing and default coach permissions via Node 24 TypeScript support.
import { DEFAULT_COACH_PERMISSIONS, hashPassword } from '../src/lib/auth.ts';

const args = process.argv.slice(2).filter((a) => a !== '--remote');
const remote = process.argv.includes('--remote');
const [username, password, fullName = username, role = 'owner'] = args;
if (!username || !password || password.length < 8 || !['owner', 'coach'].includes(role)) {
  console.error('Usage: node scripts/create-user.mjs <username> <password of at least 8 characters> "<Full name>" [owner|coach] [--remote]');
  process.exit(1);
}

const hash = await hashPassword(password);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const perms = JSON.stringify(role === 'owner' ? [] : DEFAULT_COACH_PERMISSIONS);
const sql = `INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES (${q(username.toLowerCase())}, ${q(hash)}, ${q(fullName)}, ${q(role)}, ${q(perms)})
ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, is_active = 1;
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ${q(username.toLowerCase())});`;

// Use a temporary SQL file to preserve quotes and line breaks on Windows.
const dir = mkdtempSync(join(tmpdir(), 'glory-'));
const file = join(dir, 'user.sql');
writeFileSync(file, sql);
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'glory-db', remote ? '--remote' : '--local', `--file=${file}`, '--yes'], { stdio: 'inherit', shell: true });
} finally {
  rmSync(dir, { recursive: true, force: true }); // The file contains a password hash.
}
console.log(`\n✔ Created or updated account "${username}" (${role}) in ${remote ? 'remote' : 'local'} D1.`);
