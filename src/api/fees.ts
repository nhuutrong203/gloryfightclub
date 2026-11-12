import { Hono } from 'hono';
import { and, asc, eq, inArray, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { parseDate } from '../lib/import';
import { vnNow } from '../lib/util';
import { body, csv, idParam, need } from './guard';
import type { Env } from '.';

export const feeRoutes = new Hono<Env>();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** Shared fee eligibility rule for the dashboard, fees, and student badges.
 *  Include active students who joined by month end. ISO date comparison makes day 31 a valid upper bound. */
export const owesIn = (m: string) => and(eq(schema.students.status, 'active'), lte(schema.students.joinedAt, `${m}-31`));

/** List students who owe fees or already paid in the selected month. */
feeRoutes.get('/', need('fees.view'), async (c) => {
  const m = month.safeParse(c.req.query('month')).data ?? vnNow().month;
  const paidThisMonth = db.select({ id: schema.payments.studentId }).from(schema.payments).where(eq(schema.payments.month, m));
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.month, m));
  const students = await db
    .select({ id: schema.students.id, code: schema.students.code, fullName: schema.students.fullName, phone: schema.students.phone, parentPhone: schema.students.parentPhone, locationId: schema.students.locationId, feePlanId: schema.students.feePlanId, status: schema.students.status })
    .from(schema.students)
    // Use a subquery to stay below D1's 100 bound parameters.
    // A listed student with no payment is unpaid.
    .where(or(owesIn(m), inArray(schema.students.id, paidThisMonth)))
    .orderBy(asc(schema.students.fullName));
  return c.json({ month: m, students, payments });
});

const paySchema = z.object({
  studentId: z.number().int().positive(),
  month,
  amount: z.number().int().min(0).max(100_000_000),
  feePlanId: z.number().int().positive().nullish().transform((v) => v ?? null),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => parseDate(v) === v, 'Ngày không tồn tại'),
  method: z.enum(['cash', 'transfer']),
  note: z.string().trim().max(500).nullish().transform((v) => v || null),
});

feeRoutes.post('/', need('fees.edit'), async (c) => {
  const [data, err] = await body(c, paySchema, { amount: 'Số tiền', paidAt: 'Ngày đóng', method: 'Hình thức', note: 'Ghi chú', month: 'Tháng', feePlanId: 'Gói' });
  if (err) return err;
  // The unique student and month pair prevents duplicate payments.
  const [row] = await db.insert(schema.payments).values({ ...data, createdBy: c.get('user').id }).onConflictDoNothing().returning();
  if (!row) return c.json({ error: 'Học viên này đã được ghi nhận đóng tháng này rồi' }, 409);
  return c.json(row, 201);
});

// Cancelling a payment requires both fee edit and delete permissions.
feeRoutes.delete('/:id', need('fees.edit'), need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await db.delete(schema.payments).where(eq(schema.payments.id, id));
  return c.json({ ok: true });
});

feeRoutes.get('/export.csv', need('fees.view'), async (c) => {
  const m = month.safeParse(c.req.query('month')).data;
  const rows = await db
    .select({ p: schema.payments, code: schema.students.code, name: schema.students.fullName, plan: schema.feePlans.name })
    .from(schema.payments)
    .innerJoin(schema.students, eq(schema.students.id, schema.payments.studentId))
    .leftJoin(schema.feePlans, eq(schema.feePlans.id, schema.payments.feePlanId))
    .where(m ? eq(schema.payments.month, m) : undefined)
    .orderBy(asc(schema.payments.month), asc(schema.students.code));
  return csv(`hoc-phi-${m ?? 'tat-ca'}.csv`,
    ['Tháng', 'Mã HV', 'Họ tên', 'Gói', 'Số tiền', 'Ngày đóng', 'Hình thức', 'Ghi chú'],
    rows.map((r) => [r.p.month, r.code, r.name, r.plan, r.p.amount, r.p.paidAt, r.p.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản', r.p.note]));
});
