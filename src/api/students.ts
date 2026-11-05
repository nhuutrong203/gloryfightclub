import { Hono } from 'hono';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { z } from 'zod';
import { db, schema } from '../db';
import { normalizePhone, vnNow } from '../lib/util';
import { STATUS_IN, byName, fixPhone, fold, parseDate, updatableColumns } from '../lib/import';
import { body, csv, idParam, issueText, need } from './guard';
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
  birthYear: z.coerce.number().int().min(1940, 'Năm sinh từ 1940 trở đi').max(2030, 'Năm sinh chưa đúng').nullish().transform((v) => v ?? null),
  parentName: z.string().trim().max(100).nullish().transform((v) => v || null),
  parentPhone: phone,
  locationId: z.number().int().positive().nullish().transform((v) => v ?? null),
  feePlanId: z.number().int().positive().nullish().transform((v) => v ?? null),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'paused', 'quit']),
  note: z.string().trim().max(2000).nullish().transform((v) => v || null),
  classIds: z.array(z.number().int().positive()).max(20).default([]),
});

export const STUDENT_LABELS = {
  fullName: 'Họ tên', phone: 'SĐT', birthYear: 'Năm sinh', parentName: 'Tên phụ huynh', parentPhone: 'SĐT phụ huynh',
  locationId: 'Cơ sở', feePlanId: 'Gói học phí', joinedAt: 'Ngày nhập học', status: 'Trạng thái', note: 'Ghi chú', classIds: 'Lớp',
};

/** Ghi lớp cho học viên theo mã (dùng được trong cùng batch với lệnh tạo học viên, khi chưa biết id). */
const classesByCode = (code: string, classIds: number[]) => db.insert(schema.studentClasses).select(
  db.select({ studentId: s.id, classId: schema.classes.id }).from(s).innerJoin(schema.classes, inArray(schema.classes.id, classIds)).where(eq(s.code, code)),
);

export const isUnique = (e: unknown) => /UNIQUE constraint failed/.test(String((e as any)?.cause?.message ?? e));

/** Tạo học viên + lớp trong 1 lần ghi. Hai người thêm cùng lúc trùng mã → lấy mã mới, thử lại. */
export async function createStudent(values: Omit<typeof s.$inferInsert, 'code'>, classIds: number[] = []) {
  for (let attempt = 0; ; attempt++) {
    const code = await nextStudentCode();
    try {
      const [rows] = await db.batch([db.insert(s).values({ ...values, code }).returning(), ...(classIds.length ? [classesByCode(code, classIds)] : [])]);
      return rows[0];
    } catch (e) {
      if (attempt >= 2 || !isUnique(e)) throw e;
    }
  }
}

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
    total: all.length,
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

studentRoutes.post('/import', need('students.edit'), async (c) => {
  const [data, err] = await body(c, z.object({ rows: z.array(importRow).min(1).max(2000) }));
  if (err) return err;
  const [locations, plans, classes, existing] = await Promise.all([
    db.select().from(schema.locations), db.select().from(schema.feePlans), db.select().from(schema.classes),
    db.select({ id: s.id, code: s.code }).from(s),
  ]);
  // Lớp ghi giống file xuất: "MMA 246 18:30; Kudo 357 20:00"
  const classOf = (x: string) => classes.find((k) => fold(`${k.name} ${k.days} ${k.startTime}`) === fold(x))?.id;
  const codes = new Map<string, number>(existing.map((e) => [e.code.toUpperCase(), e.id]));
  let next = Number((await nextStudentCode()).slice(2));
  const errors: { row: number; error: string }[] = [];
  const todo: { row: number; isNew: boolean; stmts: BatchItem<'sqlite'>[] }[] = [];

  for (const [i, r] of data.rows.entries()) {
    const rowNo = i + 2; // dòng 1 là tiêu đề
    // Chữ gõ sai thì báo lỗi, không ghi đè bằng "trống" / hôm nay / Đang học (mất dữ liệu cũ).
    const locationId = byName(locations, r.location);
    const feePlanId = byName(plans, r.plan);
    const joinedAt = parseDate(r.joinedAt);
    const status = STATUS_IN[fold(r.status ?? '')];
    const classNames = (r.classes ?? '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
    const badClass = classNames.find((x) => !classOf(x));
    const miss = r.location && !locationId ? `không thấy cơ sở "${r.location}"`
      : r.plan && !feePlanId ? `không thấy gói học phí "${r.plan}"`
      : r.joinedAt && !joinedAt ? `ngày nhập học "${r.joinedAt}" chưa đúng (ghi dạng ngày/tháng/năm, vd. 15/08/2026)`
      : r.status && !status ? `trạng thái "${r.status}" chưa đúng (ghi Đang học, Tạm nghỉ hoặc Đã nghỉ)`
      : badClass ? `không thấy lớp "${badClass}" (ghi đúng dạng: Tên lớp + thứ + giờ, vd. "MMA 246 18:30")` : null;
    if (miss) { errors.push({ row: rowNo, error: miss }); continue; }
    const parsed = studentSchema.safeParse({
      fullName: r.fullName ?? '',
      phone: fixPhone(r.phone),
      birthYear: r.birthYear ? Number(r.birthYear) : null,
      parentName: r.parentName || null,
      parentPhone: fixPhone(r.parentPhone),
      locationId,
      feePlanId,
      joinedAt: joinedAt ?? vnNow().date,
      status: status ?? 'active',
      note: r.note || null,
      classIds: [...new Set(classNames.map((x) => classOf(x)!))],
    });
    if (!parsed.success) {
      const iss = parsed.error.issues[0];
      errors.push({ row: rowNo, error: issueText(iss, STUDENT_LABELS) });
      continue;
    }
    const { classIds: cls, ...values } = parsed.data;
    const id = r.code ? codes.get(r.code.toUpperCase()) : undefined;
    if (id) {
      // Cập nhật: chỉ đổi cột có trong file (quy tắc + test ở updatableColumns). Cột Lớp có mà ô trống = bỏ hết lớp.
      const stmts: BatchItem<'sqlite'>[] = [db.update(s).set({ ...updatableColumns(values, r), updatedAt: Date.now() }).where(eq(s.id, id))];
      if (r.classes !== undefined) stmts.push(db.delete(schema.studentClasses).where(eq(schema.studentClasses.studentId, id)));
      if (r.classes !== undefined && cls.length) stmts.push(db.insert(schema.studentClasses).values(cls.map((classId) => ({ studentId: id, classId }))));
      todo.push({ row: rowNo, isNew: false, stmts });
    } else {
      // Học viên mới chưa có id → nối lớp qua mã học viên ngay trong cùng đợt ghi.
      const code = `GF${String(next++).padStart(4, '0')}`;
      todo.push({ row: rowNo, isNew: true, stmts: [db.insert(s).values({ ...values, code }), ...(cls.length ? [classesByCode(code, cls)] : [])] });
    }
  }
  // Ghi theo đợt 60 dòng (≤ 180 lệnh), mỗi đợt là 1 transaction và chỉ tính 1 lần gọi D1 (gói Free: 50 lần / request → đủ 2000 dòng).
  // Một đợt lỗi (vd. trùng mã vì có người vừa thêm học viên) → dừng, báo các dòng chưa ghi để nhập lại riêng, không nhân đôi dòng đã ghi.
  let created = 0, updated = 0;
  for (let k = 0; k < todo.length; k += 60) {
    const part = todo.slice(k, k + 60);
    const [first, ...rest] = part.flatMap((x) => x.stmts);
    try {
      await db.batch([first, ...rest]);
    } catch (e) {
      console.error('Nhập học viên lỗi', e);
      for (const x of todo.slice(k)) errors.push({ row: x.row, error: 'chưa ghi được (lỗi khi lưu) — nhập lại riêng các dòng chưa ghi' });
      break;
    }
    for (const x of part) x.isNew ? created++ : updated++;
  }
  errors.sort((a, b) => a.row - b.row);
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
  const [data, err] = await body(c, studentSchema, STUDENT_LABELS);
  if (err) return err;
  const { classIds, ...values } = data;
  return c.json(await createStudent(values, classIds), 201);
});

studentRoutes.put('/:id', need('students.edit'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, studentSchema, STUDENT_LABELS);
  if (err) return err;
  const { classIds, ...values } = data;
  // Người khác vừa xoá học viên này → báo rõ thay vì lỗi khoá ngoại 500.
  if (!(await db.select({ id: s.id }).from(s).where(eq(s.id, id)).get())) return c.json({ error: 'Học viên này đã bị xoá' }, 404);
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
  // Đăng ký học thử đã chuyển thành học viên này → về "Đã liên hệ", để chuyển lại được (không kẹt ở "Đã nhập học").
  const tr = schema.trialRegistrations;
  await db.batch([
    db.update(tr).set({ status: 'contacted', studentId: null }).where(eq(tr.studentId, id)),
    db.delete(s).where(eq(s.id, id)),
  ]);
  return c.json({ ok: true });
});
