// Tạo / đặt lại mật khẩu tài khoản CMS.
//   node scripts/create-user.mjs <username> <mật-khẩu> "<Họ tên>" [owner|coach] [--remote]
// Ví dụ tạo tài khoản chủ CLB trên cloud:
//   node scripts/create-user.mjs trung "MatKhauManh!" "Lê Thành Trung" owner --remote
import { execFileSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';

const args = process.argv.slice(2).filter((a) => a !== '--remote');
const remote = process.argv.includes('--remote');
const [username, password, fullName = username, role = 'owner'] = args;
if (!username || !password || password.length < 8 || !['owner', 'coach'].includes(role)) {
  console.error('Cách dùng: node scripts/create-user.mjs <username> <mật-khẩu ≥8 ký tự> "<Họ tên>" [owner|coach] [--remote]');
  process.exit(1);
}

// Cùng thuật toán với src/lib/auth.ts
const ITER = 100_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
const b64 = (b) => Buffer.from(b).toString('base64');
const hash = `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const perms = role === 'owner' ? '[]' : '["students.view","students.edit","posts"]';
const sql = `INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES (${q(username.toLowerCase())}, ${q(hash)}, ${q(fullName)}, ${q(role)}, ${q(perms)})
ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, is_active = 1;
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ${q(username.toLowerCase())});`;

execFileSync('npx', ['wrangler', 'd1', 'execute', 'glory-db', remote ? '--remote' : '--local', '--command', sql], { stdio: 'inherit', shell: true });
console.log(`\n✔ Đã tạo/cập nhật tài khoản "${username}" (${role}) trên D1 ${remote ? 'CLOUD' : 'local'}.`);
