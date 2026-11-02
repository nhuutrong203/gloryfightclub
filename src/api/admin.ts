import { Hono } from 'hono';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { db, schema } from '../db';
import { DEFAULT_COACH_PERMISSIONS, PERMISSIONS, can, hashPassword } from '../lib/auth';
import { vnNow } from '../lib/util';
import { body, idParam, need, ownerOnly } from './guard';
import type { Env } from '.';

export const adminRoutes = new Hono<Env>();

adminRoutes.get('/me', (c) => c.json(c.get('user')));

/** Danh mục nhỏ dùng cho các ô chọn trong CMS (ai đăng nhập cũng xem được). */
adminRoutes.get('/lookups', async (c) => {
  const [locations, disciplines, classes, coaches, feePlans] = await Promise.all([
    db.select({ id: schema.locations.id, name: schema.locations.name }).from(schema.locations).orderBy(asc(schema.locations.sort)),
    db.select({ id: schema.disciplines.id, name: schema.disciplines.name }).from(schema.disciplines).orderBy(asc(schema.disciplines.sort)),
    db.select({ id: schema.classes.id, name: schema.classes.name, days: schema.classes.days, startTime: schema.classes.startTime, endTime: schema.classes.endTime, locationId: schema.classes.locationId, isActive: schema.classes.isActive })
      .from(schema.classes).orderBy(asc(schema.classes.locationId), asc(schema.classes.startTime)),
    db.select({ id: schema.coaches.id, name: schema.coaches.fullName }).from(schema.coaches).orderBy(asc(schema.coaches.sort)),
    db.select({ id: schema.feePlans.id, name: schema.feePlans.name, pricePerMonth: schema.feePlans.pricePerMonth }).from(schema.feePlans).orderBy(asc(schema.feePlans.sort)),
  ]);
  return c.json({ locations, disciplines, classes, coaches, feePlans });
});

adminRoutes.get('/dashboard', async (c) => {
  const u = c.get('user');
  const { date, month, weekday } = vnNow();
  const st = schema.students;
  const [byLocation, newThisMonth, trialsNew, todayClasses, unpaid] = await Promise.all([
    db.select({ locationId: st.locationId, n: sql<number>`count(*)` }).from(st).where(eq(st.status, 'active')).groupBy(st.locationId),
    db.select({ n: sql<number>`count(*)` }).from(st).where(gte(st.joinedAt, `${month}-01`)).get(),
    db.select({ n: sql<number>`count(*)` }).from(schema.trialRegistrations).where(eq(schema.trialRegistrations.status, 'new')).get(),
    db.select().from(schema.classes).where(and(eq(schema.classes.isActive, true), sql`instr(${schema.classes.days}, ${weekday}) > 0`)).orderBy(asc(schema.classes.startTime)),
    can(u, 'fees.view')
      ? db.select({ n: sql<number>`count(*)` }).from(st)
          .where(and(eq(st.status, 'active'), sql`not exists (select 1 from payments p where p.student_id = ${st.id} and p.month = ${month})`)).get()
      : null,
  ]);
  const revenue = can(u, 'fees.view')
    ? await db.select({ sum: sql<number>`coalesce(sum(amount), 0)`, n: sql<number>`count(*)` }).from(schema.payments).where(eq(schema.payments.month, month)).get()
    : null;
  return c.json({
    date, month,
    activeTotal: byLocation.reduce((a, r) => a + r.n, 0),
    byLocation,
    newThisMonth: newThisMonth?.n ?? 0,
    trialsNew: trialsNew?.n ?? 0,
    unpaid: unpaid?.n ?? null,
    revenue,
    todayClasses,
  });
});

// ── Cài đặt chung (key/value JSON) ──
const SETTING_KEYS = ['club', 'hero', 'about', 'texts'] as const;
// texts = { vi: { key: 'chữ' }, en: {...} } — chỉ chuỗi, để trang public render an toàn.
const textsSchema = z.object({ vi: z.record(z.string().max(64), z.string().max(1000)), en: z.record(z.string().max(64), z.string().max(1000)) });
adminRoutes.get('/settings', need('content'), async (c) => {
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, [...SETTING_KEYS]));
  return c.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});
adminRoutes.put('/settings/:key', need('content'), async (c) => {
  const key = c.req.param('key') ?? '';
  if (!SETTING_KEYS.includes(key as any)) return c.notFound();
  const [value, err] = await body(c, key === 'texts' ? textsSchema : z.record(z.string(), z.unknown()));
  if (err) return err;
  if (JSON.stringify(value).length > 50_000) return c.json({ error: 'Nội dung quá dài' }, 400);
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  return c.json({ ok: true });
});

// ── Upload ảnh lên R2 (ảnh đã nén ở trình duyệt) ──
const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
adminRoutes.post('/upload', need('posts', 'content'), async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: 'Không có file' }, 400);
  const ext = TYPES[file.type];
  if (!ext) return c.json({ error: 'Chỉ nhận ảnh JPG, PNG, WebP' }, 400);
  if (file.size > 8 * 1024 * 1024) return c.json({ error: 'Ảnh quá lớn (tối đa 8MB)' }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isImage(bytes, ext)) return c.json({ error: 'File không phải ảnh hợp lệ' }, 400);
  const key = `public/${vnNow().month}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: file.type } });
  return c.json({ key }, 201);
});

/** Kiểm tra chữ ký file (magic bytes) để không nhận file giả đuôi ảnh. */
function isImage(b: Uint8Array, ext: string) {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ext === 'jpg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === 'png') return b[0] === 0x89 && ascii(1, 4) === 'PNG';
  return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
}

// ── Tài khoản (chỉ chủ CLB) ──
const permEnum = z.enum(Object.keys(PERMISSIONS) as [keyof typeof PERMISSIONS, ...(keyof typeof PERMISSIONS)[]]);
const userCols = { id: schema.users.id, username: schema.users.username, fullName: schema.users.fullName, role: schema.users.role, permissions: schema.users.permissions, coachId: schema.users.coachId, isActive: schema.users.isActive };

adminRoutes.get('/users', ownerOnly, async (c) => c.json({
  users: await db.select(userCols).from(schema.users).orderBy(asc(schema.users.id)),
  permissions: PERMISSIONS,
  defaults: DEFAULT_COACH_PERMISSIONS,
}));

adminRoutes.post('/users', ownerOnly, async (c) => {
  const [data, err] = await body(c, z.object({
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, 'Tên đăng nhập 3–32 ký tự: chữ không dấu, số, . _ -'),
    fullName: z.string().trim().min(2).max(100),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(200),
    role: z.enum(['owner', 'coach']),
    permissions: z.array(permEnum).default(DEFAULT_COACH_PERMISSIONS),
    coachId: z.number().int().positive().nullish().transform((v) => v ?? null),
  }));
  if (err) return err;
  const dup = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, data.username)).get();
  if (dup) return c.json({ error: 'Tên đăng nhập đã tồn tại' }, 409);
  const { password, ...rest } = data;
  const [row] = await db.insert(schema.users).values({ ...rest, passwordHash: await hashPassword(password) }).returning(userCols);
  return c.json(row, 201);
});

adminRoutes.put('/users/:id', ownerOnly, async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    role: z.enum(['owner', 'coach']).optional(),
    permissions: z.array(permEnum).optional(),
    coachId: z.number().int().positive().nullish(),
    isActive: z.boolean().optional(),
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(200).optional(),
  }));
  if (err) return err;
  // Không cho tự khoá / tự hạ quyền chính mình (tránh mất quyền chủ CLB).
  if (id === c.get('user').id && (data.isActive === false || data.role === 'coach')) {
    return c.json({ error: 'Không thể tự khoá hoặc tự hạ quyền tài khoản đang dùng' }, 400);
  }
  const { password, ...rest } = data;
  const set: Record<string, unknown> = { ...rest };
  if (password) set.passwordHash = await hashPassword(password);
  await db.batch([
    db.update(schema.users).set(set).where(eq(schema.users.id, id)),
    // Đổi mật khẩu / khoá tài khoản → đăng xuất mọi thiết bị của người đó.
    ...(password || data.isActive === false ? [db.delete(schema.sessions).where(eq(schema.sessions.userId, id))] : []),
  ]);
  return c.json({ ok: true });
});
