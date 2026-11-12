import { Hono } from 'hono';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { z } from 'zod';
import { db, schema } from '../db';
import { normalizePhone, vnNow } from '../lib/util';
import { STATUS_IN, byName, fixPhone, fold, parseDate, updatableColumns } from '../lib/import';
import { can } from '../lib/auth';
import { body, csv, idParam, issueText, need, pageNumber } from './guard';
import { owesIn } from './fees';
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
  birthYear: z.coerce.number().int().min(1940, 'Năm sinh từ 1940 trở đi')
    .refine((year) => year <= Number(vnNow().date.slice(0, 4)), 'Năm sinh không được ở tương lai')
    .nullish().transform((v) => v ?? null),
  parentName: z.string().trim().max(100).nullish().transform((v) => v || null),
  parentPhone: phone,
  locationId: z.number().int().positive().nullish().transform((v) => v ?? null),
  feePlanId: z.number().int().positive().nullish().transform((v) => v ?? null),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => parseDate(v) === v, 'Ngày không tồn tại'),
  status: z.enum(['active', 'paused', 'quit']),
  note: z.string().trim().max(2000).nullish().transform((v) => v || null),
  classIds: z.array(z.number().int().positive()).max(20).default([]),
});

export const STUDENT_LABELS = {
  fullName: 'Họ tên', phone: 'SĐT', birthYear: 'Năm sinh', parentName: 'Tên phụ huynh', parentPhone: 'SĐT phụ huynh',
  locationId: 'Cơ sở', feePlanId: 'Gói học phí', joinedAt: 'Ngày nhập học', status: 'Trạng thái', note: 'Ghi chú', classIds: 'Lớp',
};

/** Assign classes by student code so creation and assignment can share a batch. */
const classesByCode = (code: string, classIds: number[]) => db.insert(schema.studentClasses).select(
  db.select({ studentId: s.id, classId: schema.classes.id }).from(s).innerJoin(schema.classes, inArray(schema.classes.id, classIds)).where(eq(s.code, code)),
);

async function invalidClasses(classIds: number[], locationId: number | null) {
  if (!classIds.length) return false;
  const rows = await db.select({ id: schema.classes.id, locationId: schema.classes.locationId }).from(schema.classes).where(inArray(schema.classes.id, classIds));
  return rows.length !== new Set(classIds).size || rows.some((row) => row.locationId !== locationId);
}

export const isUnique = (e: unknown) => /UNIQUE constraint failed/.test(String((e as any)?.cause?.message ?? e));

/** Create the student and class links atomically. Retry on a duplicate code. */
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

const studentCode = (n: number) => `GF${String(n).padStart(4, '0')}`;

/** Reserve a range in one write so deletions and concurrent imports cannot recycle codes. */
async function reserveStudentCodes(count: number) {
  const floor = sql`max(
    (select coalesce(max(cast(substr(code, 3) as integer)), 0) from students),
    coalesce((select seq from sqlite_sequence where name = 'students'), 0)
  )`;
  const [row] = await db.insert(schema.settings)
    .values({ key: 'student_code_sequence', value: sql`${floor} + ${count}` })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: sql`max(cast(${schema.settings.value} as integer), ${floor}) + ${count}` },
    })
    .returning({ last: sql<number>`cast(${schema.settings.value} as integer)` });
  return row.last - count + 1;
}

export const nextStudentCode = async () => studentCode(await reserveStudentCodes(1));

function filters(q: Record<string, string | undefined>) {
  const w: SQL[] = [];
  if (q.status) w.push(eq(s.status, q.status as 'active'));
  if (q.location) w.push(eq(s.locationId, Number(q.location)));
  if (q.plan) w.push(eq(s.feePlanId, Number(q.plan)));
  if (q.class) w.push(inArray(s.id, db.select({ id: schema.studentClasses.studentId }).from(schema.studentClasses).where(eq(schema.studentClasses.classId, Number(q.class)))));
  return w.length ? and(...w) : undefined;
}

/** Match names without accents in JavaScript.
 *  shortcut: scan filtered students; add a normalized search column beyond a few thousand rows. */
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
  const page = pageNumber(q.page);
  const where = filters(q);
  const all = matchQuery(await db.select().from(s).where(where).orderBy(SORTS[q.sort as keyof typeof SORTS] ?? SORTS.name), q.q);
  const rows = all.slice((page - 1) * 50, page * 50);
  const { month } = vnNow();
  const ids = rows.map((r) => r.id);
  const fees = can(c.get('user'), 'fees.view');
  const [links, due] = ids.length
    ? await Promise.all([
        db.select().from(schema.studentClasses).where(inArray(schema.studentClasses.studentId, ids)),
        // Show fee badges only for eligible students and users with fee view permission.
        fees
          ? db.select({ id: s.id, paid: sql<number>`exists (select 1 from payments p where p.student_id = students.id and p.month = ${month})` }) // Qualify students.id to distinguish it from payments.id.
              .from(s).where(and(inArray(s.id, ids), owesIn(month)))
          : [],
      ])
    : [[], []];
  const fee = new Map(due.map((d) => [d.id, d.paid ? 'paid' : 'unpaid']));
  return c.json({
    total: all.length,
    page,
    rows: rows.map((r) => ({ ...r, classIds: links.filter((l) => l.studentId === r.id).map((l) => l.classId), fee: fee.get(r.id) ?? null })),
  });
});

// Import spreadsheet rows using the same columns as the export.
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
  const [locations, plans, classes, existing, links] = await Promise.all([
    db.select().from(schema.locations), db.select().from(schema.feePlans), db.select().from(schema.classes),
    db.select({ id: s.id, code: s.code, fullName: s.fullName, locationId: s.locationId }).from(s),
    db.select().from(schema.studentClasses),
  ]);
  // Use the exported format for class names, days, and start times.
  const classMatches = (x: string, locationId: number | null) => classes.filter((k) => k.locationId === locationId && fold(`${k.name} ${k.days} ${k.startTime}`) === fold(x));
  const studentsByCode = new Map(existing.map((e) => [e.code.toUpperCase(), e]));
  const codeCounts = new Map<string, number>();
  for (const row of data.rows) {
    const code = row.code?.toUpperCase();
    if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  const newRows = data.rows.filter((row) => !row.code).length;
  let next = newRows ? await reserveStudentCodes(newRows) : 0;
  const errors: { row: number; error: string }[] = [];
  const todo: { row: number; isNew: boolean; stmts: BatchItem<'sqlite'>[] }[] = [];

  for (const [i, r] of data.rows.entries()) {
    const rowNo = i + 2; // Row 1 contains headers.
    const code = r.code?.toUpperCase();
    if (code && (codeCounts.get(code) ?? 0) > 1) {
      errors.push({ row: rowNo, error: `mã học viên "${code}" xuất hiện nhiều lần trong file` });
      continue;
    }
    // Reject unrecognized input so it cannot overwrite existing data with defaults.
    const locationId = byName(locations, r.location);
    const feePlanId = byName(plans, r.plan);
    const joinedAt = parseDate(r.joinedAt);
    const status = STATUS_IN[fold(r.status ?? '')];
    const classNames = (r.classes ?? '').split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
    const previous = code ? studentsByCode.get(code) : undefined;
    const effectiveLocation = r.location === undefined ? previous?.locationId ?? null : locationId;
    const badClass = classNames.find((x) => classMatches(x, effectiveLocation).length !== 1);
    const miss = r.location && !locationId ? `không thấy cơ sở "${r.location}"`
      : r.plan && !feePlanId ? `không thấy gói học phí "${r.plan}"`
      : r.joinedAt && !joinedAt ? `ngày nhập học "${r.joinedAt}" chưa đúng (ghi dạng ngày/tháng/năm, vd. 15/08/2026)`
      : r.status && !status ? `trạng thái "${r.status}" chưa đúng (ghi Đang học, Tạm nghỉ hoặc Đã nghỉ)`
      : badClass ? `không tìm thấy đúng một lớp "${badClass}" ở cơ sở đã chọn (ghi dạng: Tên lớp + thứ + giờ, vd. "MMA 246 18:30")` : null;
    if (miss) { errors.push({ row: rowNo, error: miss }); continue; }
    const parsed = studentSchema.safeParse({
      fullName: r.fullName ?? previous?.fullName ?? '',
      phone: fixPhone(r.phone),
      birthYear: r.birthYear ? Number(r.birthYear) : null,
      parentName: r.parentName || null,
      parentPhone: fixPhone(r.parentPhone),
      locationId,
      feePlanId,
      joinedAt: joinedAt ?? vnNow().date,
      status: status ?? 'active',
      note: r.note || null,
      classIds: [...new Set(classNames.map((x) => classMatches(x, effectiveLocation)[0].id))],
    });
    if (!parsed.success) {
      const iss = parsed.error.issues[0];
      errors.push({ row: rowNo, error: issueText(iss, STUDENT_LABELS) });
      continue;
    }
    const { classIds: cls, ...values } = parsed.data;
    const id = previous?.id;
    // Reject unknown codes so retrying an import cannot silently create a new student.
    if (r.code && !id) { errors.push({ row: rowNo, error: `không thấy mã học viên "${r.code}" — học viên mới thì để trống ô Mã` }); continue; }
    if (id && r.location !== undefined && r.classes === undefined && links.some((link) => link.studentId === id && classes.find((k) => k.id === link.classId)?.locationId !== locationId)) {
      errors.push({ row: rowNo, error: 'đổi cơ sở cần cập nhật cột Lớp để lớp thuộc cơ sở mới' });
      continue;
    }
    if (id) {
      // Update only supplied columns. A present but blank Classes column removes all class links.
      const stmts: BatchItem<'sqlite'>[] = [db.update(s).set({ ...updatableColumns(values, r), updatedAt: Date.now() }).where(eq(s.id, id))];
      if (r.classes !== undefined) stmts.push(db.delete(schema.studentClasses).where(eq(schema.studentClasses.studentId, id)));
      if (r.classes !== undefined && cls.length) stmts.push(db.insert(schema.studentClasses).values(cls.map((classId) => ({ studentId: id, classId }))));
      todo.push({ row: rowNo, isNew: false, stmts });
    } else {
      // Use the reserved code to assign classes in the same batch as student creation.
      const code = studentCode(next++);
      todo.push({ row: rowNo, isNew: true, stmts: [db.insert(s).values({ ...values, code }), ...(cls.length ? [classesByCode(code, cls)] : [])] });
    }
  }
  // Write 60 rows per D1 transaction to stay within the request query budget.
  // Stop at the first failed batch and report only rows that were not committed.
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
    // Enforce fee history visibility in the API.
    can(c.get('user'), 'fees.view') ? db.select().from(schema.payments).where(eq(schema.payments.studentId, id)).orderBy(desc(schema.payments.month)) : [],
  ]);
  return c.json({ ...row, classIds: links.map((l) => l.classId), payments });
});

studentRoutes.post('/', need('students.edit'), async (c) => {
  const [data, err] = await body(c, studentSchema, STUDENT_LABELS);
  if (err) return err;
  const { classIds, ...values } = data;
  if (await invalidClasses(classIds, values.locationId)) return c.json({ error: 'Lớp không thuộc cơ sở đã chọn' }, 400);
  return c.json(await createStudent(values, classIds), 201);
});

studentRoutes.put('/:id', need('students.edit'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, studentSchema, STUDENT_LABELS);
  if (err) return err;
  const { classIds, ...values } = data;
  if (await invalidClasses(classIds, values.locationId)) return c.json({ error: 'Lớp không thuộc cơ sở đã chọn' }, 400);
  // Return a clear 404 if the student was already deleted.
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
  // Reset the linked trial to contacted so it can be converted again.
  const tr = schema.trialRegistrations;
  await db.batch([
    db.update(tr).set({ status: 'contacted', studentId: null }).where(eq(tr.studentId, id)),
    db.delete(s).where(eq(s.id, id)),
  ]);
  return c.json({ ok: true });
});
