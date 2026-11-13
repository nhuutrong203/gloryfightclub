import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { routePath } from 'hono/route';
import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '../db';
import { SESSION_COOKIE, SESSION_DAYS, sha256Hex, type SessionUser } from '../lib/auth';
import { authRoutes, cookieOpts } from './auth';
import { publicRoutes } from './public';
import { contentRoutes } from './content';
import { studentRoutes } from './students';
import { feeRoutes } from './fees';
import { trialRoutes } from './trials';
import { postRoutes } from './posts';
import { adminRoutes } from './admin';

export type Env = { Variables: { user: SessionUser } };

const app = new Hono<Env>().basePath('/api');

app.onError((_err, c) => {
  // Database errors can contain SQL parameters with personal data.
  console.error('Unhandled API error', c.req.method, routePath(c), c.req.header('cf-ray'));
  return c.json({ error: 'Lỗi máy chủ, vui lòng thử lại.' }, 500);
});

// Check the request origin for writes to protect against CSRF.
app.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('origin');
    // Treat an opaque origin from a sandbox or file URL as external.
    const host = origin ? URL.parse(origin)?.host : undefined;
    if (origin && host !== new URL(c.req.url).host) return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.route('/public', publicRoutes);
app.route('/auth', authRoutes);

// Require authentication for the following routes.
app.use('/admin/*', async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Chưa đăng nhập' }, 401);
  const sid = await sha256Hex(token);
  const row = await db
    .select({ id: schema.users.id, username: schema.users.username, fullName: schema.users.fullName, role: schema.users.role, permissions: schema.users.permissions, expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sid), gt(schema.sessions.expiresAt, Date.now()), eq(schema.users.isActive, true)))
    .get();
  if (!row) return c.json({ error: 'Phiên đăng nhập đã hết hạn' }, 401);
  // Renew sessions with less than 15 days left to keep regular users signed in.
  if (row.expiresAt - Date.now() < 15 * 86400_000) {
    await db.update(schema.sessions).set({ expiresAt: Date.now() + SESSION_DAYS * 86400_000 }).where(eq(schema.sessions.id, sid));
    setCookie(c, SESSION_COOKIE, token, cookieOpts(c));
  }
  const { expiresAt: _, ...user } = row;
  c.set('user', user);
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
