// Tạo / đặt lại mật khẩu tài khoản CMS.
//   node scripts/create-user.mjs <username> <mật-khẩu> "<Họ tên>" [owner|coach] [--remote]
// Repo public: không ghi tên đăng nhập / mật khẩu thật vào ví dụ.
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Dùng chung với Worker (Node 24 đọc thẳng file .ts): cùng cách băm mật khẩu, cùng quyền mặc định của HLV.
import { DEFAULT_COACH_PERMISSIONS, hashPassword } from '../src/lib/auth.ts';

const args = process.argv.slice(2).filter((a) => a !== '--remote');
const remote = process.argv.includes('--remote');
const [username, password, fullName = username, role = 'owner'] = args;
if (!username || !password || password.length < 8 || !['owner', 'coach'].includes(role)) {
  console.error('Cách dùng: node scripts/create-user.mjs <username> <mật-khẩu ≥8 ký tự> "<Họ tên>" [owner|coach] [--remote]');
  process.exit(1);
}

const hash = await hashPassword(password);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const perms = JSON.stringify(role === 'owner' ? [] : DEFAULT_COACH_PERMISSIONS);
const sql = `INSERT INTO users (username, password_hash, full_name, role, permissions) VALUES (${q(username.toLowerCase())}, ${q(hash)}, ${q(fullName)}, ${q(role)}, ${q(perms)})
ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, is_active = 1;
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ${q(username.toLowerCase())});`;

// Ghi SQL ra file tạm: truyền qua --command bị shell Windows cắt mất dấu nháy/xuống dòng.
const dir = mkdtempSync(join(tmpdir(), 'glory-'));
const file = join(dir, 'user.sql');
writeFileSync(file, sql);
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'glory-db', remote ? '--remote' : '--local', `--file=${file}`, '--yes'], { stdio: 'inherit', shell: true });
} finally {
  rmSync(dir, { recursive: true, force: true }); // file chứa hash mật khẩu
}
console.log(`\n✔ Đã tạo/cập nhật tài khoản "${username}" (${role}) trên D1 ${remote ? 'CLOUD' : 'local'}.`);
