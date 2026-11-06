import { Hono } from 'hono';
import { and, asc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { db, schema } from '../db';
import { DEFAULT_COACH_PERMISSIONS, PERMISSIONS, SESSION_COOKIE, can, hashPassword, sha256Hex, verifyPassword } from '../lib/auth';
import { vnNow } from '../lib/util';
import { body, idParam, need, ownerOnly } from './guard';
import { deleteMedia } from './media';
import { owesIn } from './fees';
import type { Env } from '.';

export const adminRoutes = new Hono<Env>();

adminRoutes.get('/me', (c) => c.json(c.get('user')));

/** Đổi mật khẩu của chính mình (cần mật khẩu cũ). Đăng xuất các thiết bị khác.
 *  Nằm sau middleware đăng nhập: phiên hết hạn / tài khoản bị khoá thì không đổi được. */
adminRoutes.post('/password', async (c) => {
  const [data, err] = await body(c, z.object({ current: z.string().min(1), next: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự').max(200) }));
  if (err) return err;
  const me = c.get('user');
  const row = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, me.id)).get();
  if (!row || !(await verifyPassword(data.current, row.hash))) return c.json({ error: 'Mật khẩu hiện tại không đúng' }, 400);
  const sid = await sha256Hex(getCookie(c, SESSION_COOKIE)!);
  await db.batch([
    db.update(schema.users).set({ passwordHash: await hashPassword(data.next) }).where(eq(schema.users.id, me.id)),
    db.delete(schema.sessions).where(and(eq(schema.sessions.userId, me.id), ne(schema.sessions.id, sid))),
  ]);
  return c.json({ ok: true });
});

/** Danh mục nhỏ dùng cho các ô chọn trong CMS (ai đăng nhập cũng xem được). */
adminRoutes.get('/lookups', async (c) => {
  const [locations, disciplines, classes, coaches, feePlans] = await Promise.all([
    db.select({ id: schema.locations.id, name: schema.locations.name }).from(schema.locations).orderBy(asc(schema.locations.sort)),
    db.select({ id: schema.disciplines.id, name: schema.disciplines.name, hasBelts: schema.disciplines.hasBelts, isPublic: schema.disciplines.isPublic }).from(schema.disciplines).orderBy(asc(schema.disciplines.sort)),
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
  const fees = can(u, 'fees.view');
  const [byLocation, newThisMonth, trialsNew, todayClasses, unpaid, revenue] = await Promise.all([
    db.select({ locationId: st.locationId, n: sql<number>`count(*)` }).from(st).where(eq(st.status, 'active')).groupBy(st.locationId),
    db.select({ n: sql<number>`count(*)` }).from(st).where(and(gte(st.joinedAt, `${month}-01`), lte(st.joinedAt, `${month}-31`))).get(),
    db.select({ n: sql<number>`count(*)` }).from(schema.trialRegistrations).where(eq(schema.trialRegistrations.status, 'new')).get(),
    db.select().from(schema.classes).where(and(eq(schema.classes.isActive, true), sql`instr(${schema.classes.days}, ${weekday}) > 0`)).orderBy(asc(schema.classes.startTime)),
    // Cùng quy tắc với trang Học phí (owesIn).
    fees
      ? db.select({ n: sql<number>`count(*)` }).from(st)
          .where(and(owesIn(month), sql`not exists (select 1 from payments p where p.student_id = ${st.id} and p.month = ${month})`)).get()
      : null,
    fees ? db.select({ sum: sql<number>`coalesce(sum(amount), 0)`, n: sql<number>`count(*)` }).from(schema.payments).where(eq(schema.payments.month, month)).get() : null,
  ]);
  return c.json({
    date, month,
    activeTotal: byLocation.reduce((a, r) => a + r.n, 0),
    byLocation,
    newThisMonth: newThisMonth?.n ?? 0,
    trialsNew: trialsNew?.n ?? 0,
    unpaid: unpaid?.n ?? null,
    revenue: revenue ?? null,
    todayClasses,
  });
});

// ── Cài đặt chung (key/value JSON) ──
const SETTING_KEYS = ['club', 'hero', 'about', 'texts', 'policy'] as const;
// texts = { vi: { key: 'chữ' }, en: {...} } — chỉ chuỗi, để trang public render an toàn.
const textsSchema = z.object({ vi: z.record(z.string().max(64), z.string().max(1000)), en: z.record(z.string().max(64), z.string().max(1000)) });
// club: mọi trang public dùng name/slogan/hotlines → thiếu là sập cả web, nên bắt buộc ở đây.
const required = (label: string) => z.string({ error: `Nhập ${label}` }).trim().min(1, `Nhập ${label}`).max(500);
const link = z.string().trim().max(500).regex(/^https?:\/\//i, 'Link phải bắt đầu bằng https://').nullish().or(z.literal('')).transform((v) => v || null);
const clubSchema = z.looseObject({
  name: required('tên CLB'),
  slogan: required('slogan'),
  hotlines: z.array(z.string().trim().min(1).max(20)).min(1, 'Nhập ít nhất 1 hotline'),
  zalo: required('số Zalo'),
  facebook: link,
  instagram: link,
});
// policy: quy định CLB (trang /quy-dinh + ô đồng ý ở form học thử). updated do server đặt mỗi lần lưu = "phiên bản" khách đã đồng ý.
const policyText = z.string().max(20000).nullish().transform((v) => v?.trim() || null);
const policySchema = z.object({ fees: policyText, fees_en: policyText, safety: policyText, safety_en: policyText })
  .transform((v) => ({ ...v, updated: vnNow().date }));
adminRoutes.get('/settings', need('content'), async (c) => {
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, [...SETTING_KEYS]));
  return c.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});
adminRoutes.put('/settings/:key', need('content'), async (c) => {
  const key = c.req.param('key') ?? '';
  if (!SETTING_KEYS.includes(key as any)) return c.notFound();
  const [value, err] = await body(c, key === 'texts' ? textsSchema : key === 'club' ? clubSchema : key === 'policy' ? policySchema : z.record(z.string(), z.unknown()),
    { name: 'Tên CLB', slogan: 'Slogan', hotlines: 'Hotline', zalo: 'Số Zalo', facebook: 'Link Facebook', instagram: 'Link Instagram', fees: 'Quy định học phí', safety: 'Quy định an toàn' });
  if (err) return err;
  if (JSON.stringify(value).length > 50_000) return c.json({ error: 'Nội dung quá dài' }, 400);
  const old = key === 'hero' ? await db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, 'hero')).get() : undefined;
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  if (old) await deleteMedia([(old.value as { image_key?: string })?.image_key]); // ảnh nền trang chủ cũ (còn dùng thì giữ)
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

// ── Upload video cho nhật ký lớp: client gửi thẳng file (không multipart), Worker chuyển luồng sang R2. ──
// Giới hạn request của Workers là 100MB → tối đa 95MB. iPhone .mov (H.264) phát được như MP4.
const VIDEO: Record<string, [ext: string, serveAs: string]> = { 'video/mp4': ['mp4', 'video/mp4'], 'video/quicktime': ['mov', 'video/mp4'], 'video/webm': ['webm', 'video/webm'] };
export const MAX_VIDEO = 95 * 1024 * 1024;
adminRoutes.post('/upload-video', need('posts', 'content'), async (c) => {
  const v = VIDEO[(c.req.header('content-type') ?? '').split(';')[0].trim().toLowerCase()];
  if (!v) return c.json({ error: 'Chỉ nhận video MP4, MOV, WebM' }, 400);
  const size = Number(c.req.header('content-length'));
  if (!size) return c.json({ error: 'Không đọc được dung lượng video' }, 411);
  if (size > MAX_VIDEO) return c.json({ error: 'Video quá lớn (tối đa 95MB) — quay ngắn hơn / 720p, hoặc đăng YouTube rồi dán link' }, 413);
  const key = `public/${vnNow().month}/${crypto.randomUUID()}.${v[0]}`;
  await env.MEDIA.put(key, c.req.raw.body!, { httpMetadata: { contentType: v[1] } });
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
const USER_LABELS = { username: 'Tên đăng nhập', fullName: 'Họ tên', password: 'Mật khẩu', role: 'Vai trò', permissions: 'Quyền', coachId: 'HLV' };
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
  }), USER_LABELS);
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
  }), USER_LABELS);
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
