// Passwords use Web Crypto PBKDF2-SHA256 with 100,000 iterations.
// Store a random token in an HttpOnly cookie and only its hash in D1.

export const SESSION_COOKIE = 'glory_session';
export const SESSION_DAYS = 30;
const ITERATIONS = 100_000;

export const PERMISSIONS = {
  'students.view': 'Xem học viên',
  'students.edit': 'Thêm / sửa học viên',
  'fees.view': 'Xem học phí',
  'fees.edit': 'Ghi nhận học phí',
  posts: 'Đăng tin tức',
  content: 'Sửa nội dung website (lớp, lịch, HLV, ảnh…)',
  delete: 'Xoá dữ liệu',
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const DEFAULT_COACH_PERMISSIONS: Permission[] = ['students.view', 'students.edit', 'posts'];

export type SessionUser = { id: number; username: string; fullName: string; role: 'owner' | 'coach'; permissions: string[] };

export const can = (u: SessionUser, p: Permission) => u.role === 'owner' || u.permissions.includes(p);

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: BufferSource, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, iter, salt, hash] = stored.split('$');
  if (algo !== 'pbkdf2' || !salt || !hash) return false;
  const actual = new Uint8Array(await derive(password, unb64(salt), Number(iter)));
  const expected = unb64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function newToken() {
  return b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
}

export async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
