import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { eq, lt, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { db, schema } from '../db';
import { SESSION_COOKIE, SESSION_DAYS, newToken, sha256Hex, verifyPassword } from '../lib/auth';
import { body } from './guard';

export const authRoutes = new Hono();

export const cookieOpts = (c: { req: { url: string } }) => ({
  httpOnly: true,
  secure: new URL(c.req.url).protocol === 'https:',
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: SESSION_DAYS * 86400,
});

authRoutes.post('/login', async (c) => {
  // Limit password attempts to 10 per minute per IP.
  const ip = c.req.header('cf-connecting-ip') ?? 'local';
  if (!(await env.LOGIN_LIMITER.limit({ key: ip })).success) return c.json({ error: 'Thử quá nhiều lần, đợi 1 phút rồi thử lại' }, 429);
  const [data, err] = await body(c, z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) }));
  if (err) return err;
  const user = await db.select().from(schema.users).where(eq(schema.users.username, data.username.toLowerCase())).get();
  // Hash a placeholder even for unknown users to reduce timing differences.
  const ok = await verifyPassword(data.password, user?.passwordHash ?? 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  if (!user || !ok || !user.isActive) return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);

  const token = newToken();
  const sessionId = await sha256Hex(token);
  const now = Date.now();
  const [, created] = await db.batch([
    db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now)),
    // A password reset or account lock can happen while password verification is running.
    db.insert(schema.sessions).select(sql`
      SELECT ${sessionId}, ${schema.users.id}, ${now + SESSION_DAYS * 86400_000}
      FROM ${schema.users}
      WHERE ${schema.users.id} = ${user.id}
        AND ${schema.users.passwordHash} = ${user.passwordHash}
        AND ${schema.users.isActive} = 1
    `).returning({ id: schema.sessions.id }),
  ]);
  if (!created.length) return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
  setCookie(c, SESSION_COOKIE, token, cookieOpts(c));
  return c.json({ ok: true });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, await sha256Hex(token)));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});
