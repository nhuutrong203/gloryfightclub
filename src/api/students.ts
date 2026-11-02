import { Hono } from 'hono';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { normalizePhone, vnNow } from '../lib/util';
import { body, csv, idParam, need } from './guard';
import type { Env } from '.';

const s = schema.students;
export const studentRoutes = new Hono<Env>();

const phone = z.string().trim().max(20).nullish().transform((v, ctx) => {
  if (!v) return null;
  const p = normalizePhone(v);
  if (!p) ctx.addIssue({ code: 'custom', message: 'Số điện thoại chưa đúng' });
  return p;
});

export const studentSchema = z.object({
  fullName: z.string().trim().min(2, 'Nhập họ tên').max(100),
  phone,
  birthYear: z.coerce.number().int().min(1940).max(2030).nullish().transform((v) => v ?? null),
  parentName: z.string().trim().max(100).nullish().transform((v) => v || null),
  parentPhone: phone,
  locationId: z.number().int().positive().nullish().transform((v) => v ?? null),
  feePlanId: z.number().int().positive().nullish().transform((v) => v ?? null),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'paused', 'quit']),
  note: z.string().trim().max(2000).nullish().transform((v) => v || null),
  classIds: z.array(z.number().int().positive()).max(20).default([]),
});

/** Mã học viên kế tiếp: GF0001, GF0002… */
export async function nextStudentCode() {
  const r = await db.select({ m: sql<number>`coalesce(max(cast(substr(${s.code}, 3) as integer)), 0)` }).from(s).get();
  return `GF${String((r?.m ?? 0) + 1).padStart(4, '0')}`;
}

function filters(q: Record<string, string | undefined>) {
  const w: SQL[] = [];
  if (q.status) w.push(eq(s.status, q.status as 'active'));
  if (q.location) w.push(eq(s.locationId, Number(q.location)));
  if (q.plan) w.push(eq(s.feePlanId, Number(q.plan)));
  if (q.class) w.push(inArray(s.id, db.select({ id: schema.studentClasses.studentId }).from(schema.studentClasses).where(eq(schema.studentClasses.classId, Number(q.class)))));
  return w.length ? and(...w) : undefined;
}

/** Bỏ dấu để "nguyen van a" tìm ra "Nguyễn Văn A". */
const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Lọc theo ô tìm kiếm (tên không dấu, mã, SĐT) — làm trong JS vì SQLite không bỏ dấu được.
 *  shortcut: tải mọi học viên khớp bộ lọc khác rồi lọc; ổn tới vài nghìn học viên, nhiều hơn thì thêm cột search_text. */
function matchQuery<T extends { fullName: string; code: string; phone: string | null; parentPhone: string | null; parentName: string | null }>(rows: T[], q?: string) {
  const term = fold(q?.trim() ?? '');
  if (!term) return rows;
  const digits = term.replace(/\D/g, '');
  return rows.filter((r) => fold(r.fullName).includes(term) || r.code.toLowerCase().includes(term) || fold(r.parentName ?? '').includes(term)
    || (digits.length >= 3 && ((r.phone ?? '').includes(digits) || (r.parentPhone ?? '').includes(digits))));
}

const SORTS = { name: asc(s.fullName), code: asc(s.code), joined: desc(s.joinedAt), newest: desc(s.id) } as const;

studentRoutes.get('/', need('students.view'), async (c) => {
  const q = c.req.query();
  const page = Math.max(1, Number(q.page) || 1);
  const where = filters(q);
  const all = matchQuery(await db.select().from(s).where(where).orderBy(SORTS[q.sort as keyof typeof SORTS] ?? SORTS.name), q.q);
  const rows = all.slice((page - 1) * 50, page * 50);
  const total = { n: all.length };
  const { month } = vnNow();
  const ids = rows.map((r) => r.id);
  const [links, paid] = ids.length
    ? await Promise.all([
        db.select().from(schema.studentClasses).where(inArray(schema.studentClasses.studentId, ids)),
        db.select({ studentId: schema.payments.studentId }).from(schema.payments).where(and(eq(schema.payments.month, month), inArray(schema.payments.studentId, ids))),
      ])
    : [[], []];
  const paidSet = new Set(paid.map((p) => p.studentId));
  return c.json({
    total: total?.n ?? 0,
    page,
    rows: rows.map((r) => ({ ...r, classIds: links.filter((l) => l.studentId === r.id).map((l) => l.classId), paidThisMonth: paidSet.has(r.id) })),
  });
});

studentRoutes.get('/export.csv', need('students.view'), async (c) => {
  const [rows, links, classes, locations, plans] = await Promise.all([
    db.select().from(s).where(filters(c.req.query())).orderBy(asc(s.code)).then((r) => matchQuery(r, c.req.query('q'))),
    db.select().from(schema.studentClasses),
    db.select().from(schema.classes),
    db.select().from(schema.locations),
    db.select().from(schema.feePlans),
  ]);
  const name = (list: { id: number; name: string }[], id: number | null) => list.find((x) => x.id === id)?.name ?? '';
  const STATUS = { active: 'Đang học', paused: 'Tạm nghỉ', quit: 'Đã nghỉ' };
  return csv(`hoc-vien-${vnNow().date}.csv`,
    ['Mã', 'Họ tên', 'SĐT', 'Năm sinh', 'Phụ huynh', 'SĐT phụ huynh', 'Cơ sở', 'Lớp', 'Gói học phí', 'Ngày nhập học', 'Trạng thái', 'Ghi chú'],
    rows.map((r) => [
      r.code, r.fullName, r.phone, r.birthYear, r.parentName, r.parentPhone, name(locations, r.locationId),
      links.filter((l) => l.studentId === r.id).map((l) => { const k = classes.find((x) => x.id === l.classId); return k ? `${k.name} ${k.days} ${k.startTime}` : ''; }).join('; '),
      name(plans, r.feePlanId), r.joinedAt, STATUS[r.status], r.note,
    ]));
});

studentRoutes.get('/:id', need('students.view'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const row = await db.select().from(s).where(eq(s.id, id)).get();
  if (!row) return c.notFound();
  const [links, payments] = await Promise.all([
    db.select().from(schema.studentClasses).where(eq(schema.studentClasses.studentId, id)),
    db.select().from(schema.payments).where(eq(schema.payments.studentId, id)).orderBy(desc(schema.payments.month)),
  ]);
  return c.json({ ...row, classIds: links.map((l) => l.classId), payments });
});

studentRoutes.post('/', need('students.edit'), async (c) => {
  const [data, err] = await body(c, studentSchema);
  if (err) return err;
  const { classIds, ...values } = data;
  const [row] = await db.insert(s).values({ ...values, code: await nextStudentCode() }).returning();
  if (classIds.length) await db.insert(schema.studentClasses).values(classIds.map((classId) => ({ studentId: row.id, classId })));
  return c.json(row, 201);
});

studentRoutes.put('/:id', need('students.edit'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, studentSchema);
  if (err) return err;
  const { classIds, ...values } = data;
  await db.batch([
    db.update(s).set({ ...values, updatedAt: Date.now() }).where(eq(s.id, id)),
    db.delete(schema.studentClasses).where(eq(schema.studentClasses.studentId, id)),
    ...(classIds.length ? [db.insert(schema.studentClasses).values(classIds.map((classId) => ({ studentId: id, classId })))] : []),
  ]);
  return c.json({ ok: true });
});

studentRoutes.delete('/:id', need('students.edit'), need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await db.delete(s).where(eq(s.id, id));
  return c.json({ ok: true });
});
