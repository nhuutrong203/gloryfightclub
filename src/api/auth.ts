import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { eq, lt } from 'drizzle-orm';
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
  // Chống dò mật khẩu: tối đa 10 lần / phút / IP (cấu hình ở wrangler.jsonc).
  const ip = c.req.header('cf-connecting-ip') ?? 'local';
  if (!(await env.LOGIN_LIMITER.limit({ key: ip })).success) return c.json({ error: 'Thử quá nhiều lần, đợi 1 phút rồi thử lại' }, 429);
  const [data, err] = await body(c, z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) }));
  if (err) return err;
  const user = await db.select().from(schema.users).where(eq(schema.users.username, data.username.toLowerCase())).get();
  // Vẫn băm khi không có user để thời gian phản hồi giống nhau.
  const ok = await verifyPassword(data.password, user?.passwordHash ?? 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  if (!user || !ok || !user.isActive) return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);

  const token = newToken();
  await db.batch([
    db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, Date.now())),
    db.insert(schema.sessions).values({ id: await sha256Hex(token), userId: user.id, expiresAt: Date.now() + SESSION_DAYS * 86400_000 }),
  ]);
  setCookie(c, SESSION_COOKIE, token, cookieOpts(c));
  return c.json({ ok: true });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, await sha256Hex(token)));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});
