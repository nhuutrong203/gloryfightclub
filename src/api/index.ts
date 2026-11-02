import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '../db';
import { SESSION_COOKIE, sha256Hex, type SessionUser } from '../lib/auth';
import { authRoutes } from './auth';
import { publicRoutes } from './public';
import { contentRoutes } from './content';
import { studentRoutes } from './students';
import { feeRoutes } from './fees';
import { trialRoutes } from './trials';
import { postRoutes } from './posts';
import { adminRoutes } from './admin';

export type Env = { Variables: { user: SessionUser } };

const app = new Hono<Env>().basePath('/api');

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Lỗi máy chủ, vui lòng thử lại.' }, 500);
});

// Chống CSRF: mọi request ghi dữ liệu phải đến từ chính trang này.
app.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('origin');
    if (origin && new URL(origin).host !== new URL(c.req.url).host) return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.route('/public', publicRoutes);
app.route('/auth', authRoutes);

// Từ đây trở xuống cần đăng nhập.
app.use('/admin/*', async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Chưa đăng nhập' }, 401);
  const row = await db
    .select({ id: schema.users.id, username: schema.users.username, fullName: schema.users.fullName, role: schema.users.role, permissions: schema.users.permissions })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, await sha256Hex(token)), gt(schema.sessions.expiresAt, Date.now()), eq(schema.users.isActive, true)))
    .get();
  if (!row) return c.json({ error: 'Phiên đăng nhập đã hết hạn' }, 401);
  c.set('user', row);
  c.header('cache-control', 'no-store');
  await next();
});

app.route('/admin', adminRoutes);
app.route('/admin/content', contentRoutes);
app.route('/admin/students', studentRoutes);
app.route('/admin/fees', feeRoutes);
app.route('/admin/trials', trialRoutes);
app.route('/admin/posts', postRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
