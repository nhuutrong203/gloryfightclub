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

// ── Nhập học viên từ Excel/CSV (client đọc file, gửi các dòng dạng chữ theo cột của file xuất) ──
const importRow = z.object({
  code: z.string().trim().max(20).optional(),
  fullName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  birthYear: z.string().trim().max(10).optional(),
  parentName: z.string().trim().max(100).optional(),
  parentPhone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(200).optional(),
  classes: z.string().trim().max(1000).optional(),
  plan: z.string().trim().max(100).optional(),
  joinedAt: z.string().trim().max(30).optional(),
  status: z.string().trim().max(30).optional(),
  note: z.string().trim().max(2000).optional(),
});

/** "15/08/2026", "2026-08-15", "2026-08-15T…" → "2026-08-15"; không đọc được → null. */
export function parseDate(v?: string) {
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
/** Excel hay làm mất số 0 đầu SĐT (912345678) → thêm lại. */
const fixPhone = (v?: string) => (v && /^\d{9}$/.test(v.replace(/\D/g, '')) ? '0' + v.replace(/\D/g, '') : v || null);
const STATUS_IN: Record<string, 'active' | 'paused' | 'quit'> = { 'dang hoc': 'active', active: 'active', 'tam nghi': 'paused', paused: 'paused', 'da nghi': 'quit', nghi: 'quit', quit: 'quit' };

studentRoutes.post('/import', need('students.edit'), async (c) => {
  const [data, err] = await body(c, z.object({ rows: z.array(importRow).min(1).max(2000) }));
  if (err) return err;
  const [locations, plans, classes, existing] = await Promise.all([
    db.select().from(schema.locations), db.select().from(schema.feePlans), db.select().from(schema.classes),
    db.select({ id: s.id, code: s.code }).from(s),
  ]);
  // Khớp tên không dấu, hoặc viết tắt chữ cái đầu ("HSSV" = "Học sinh – Sinh viên").
  const initials = (x: string) => fold(x).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0]).join('');
  const byName = <T extends { id: number; name: string }>(list: T[], v?: string) =>
    v ? (list.find((x) => fold(x.name) === fold(v)) ?? list.find((x) => initials(x.name) === fold(v).replace(/[^a-z0-9]/g, '')))?.id ?? null : null;
  // Lớp ghi giống file xuất: "MMA 246 18:30; Kudo 357 20:00"
  const classIds = (v?: string) => (v ?? '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean)
    .map((x) => classes.find((k) => fold(`${k.name} ${k.days} ${k.startTime}`) === fold(x))?.id).filter((x): x is number => !!x);
  const codes = new Map<string, number>(existing.map((e) => [e.code.toUpperCase(), e.id]));
  let next = Number((await nextStudentCode()).slice(2));
  const errors: { row: number; error: string }[] = [];
  let created = 0, updated = 0;

  for (const [i, r] of data.rows.entries()) {
    const rowNo = i + 2; // dòng 1 là tiêu đề
    const parsed = studentSchema.safeParse({
      fullName: r.fullName ?? '',
      phone: fixPhone(r.phone),
      birthYear: r.birthYear ? Number(r.birthYear) : null,
      parentName: r.parentName || null,
      parentPhone: fixPhone(r.parentPhone),
      locationId: byName(locations, r.location),
      feePlanId: byName(plans, r.plan),
      joinedAt: parseDate(r.joinedAt) ?? vnNow().date,
      status: STATUS_IN[fold(r.status ?? '')] ?? 'active',
      note: r.note || null,
      classIds: classIds(r.classes),
    });
    if (!parsed.success) {
      const iss = parsed.error.issues[0];
      errors.push({ row: rowNo, error: `${iss.path.join('.') || 'dòng'}: ${iss.message}` });
      continue;
    }
    const { classIds: cls, ...values } = parsed.data;
    const id = r.code ? codes.get(r.code.toUpperCase()) : undefined;
    if (id) {
      // Cập nhật: chỉ đổi cột có trong file, cột vắng giữ nguyên dữ liệu cũ.
      const has = (k: keyof typeof r) => r[k] !== undefined;
      const COL: Record<string, keyof typeof r> = { locationId: 'location', feePlanId: 'plan' };
      const set = Object.fromEntries(Object.entries(values).filter(([k]) => has(COL[k] ?? (k as keyof typeof r))));
      await db.batch([
        db.update(s).set({ ...set, updatedAt: Date.now() }).where(eq(s.id, id)),
        ...(has('classes') ? [db.delete(schema.studentClasses).where(eq(schema.studentClasses.studentId, id))] : []),
        ...(has('classes') && cls.length ? [db.insert(schema.studentClasses).values(cls.map((classId) => ({ studentId: id, classId })))] : []),
      ]);
      updated++;
    } else {
      const code = `GF${String(next++).padStart(4, '0')}`;
      const [row] = await db.insert(s).values({ ...values, code }).returning({ id: s.id });
      if (cls.length) await db.insert(schema.studentClasses).values(cls.map((classId) => ({ studentId: row.id, classId })));
      codes.set(code, row.id);
      created++;
    }
  }
  return c.json({ created, updated, errors });
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
