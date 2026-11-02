import { Hono } from 'hono';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { vnNow } from '../lib/util';
import { body, idParam, need } from './guard';
import { nextStudentCode } from './students';
import type { Env } from '.';

const t = schema.trialRegistrations;
export const trialRoutes = new Hono<Env>();

trialRoutes.get('/', need('students.view'), async (c) => {
  const status = c.req.query('status');
  const rows = await db.select().from(t)
    .where(status ? eq(t.status, status as 'new') : undefined)
    .orderBy(sql`${t.status} = 'new' desc`, desc(t.createdAt))
    .limit(200);
  return c.json(rows);
});

trialRoutes.put('/:id', need('students.view'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, z.object({ status: z.enum(['new', 'contacted', 'rejected']), note: z.string().trim().max(1000).nullish() }));
  if (err) return err;
  await db.update(t).set({ status: data.status, ...(data.note !== undefined ? { note: data.note || null } : {}) }).where(eq(t.id, id));
  return c.json({ ok: true });
});

/** 1 click: tạo học viên từ đăng ký học thử. Trẻ dưới 16 tuổi → SĐT đăng ký là của phụ huynh. */
trialRoutes.post('/:id/convert', need('students.edit'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const trial = await db.select().from(t).where(eq(t.id, id)).get();
  if (!trial) return c.notFound();
  if (trial.studentId) return c.json({ error: 'Đã chuyển thành học viên rồi', studentId: trial.studentId }, 409);
  const { date } = vnNow();
  const kid = trial.age != null && trial.age < 16;
  const [student] = await db.insert(schema.students).values({
    code: await nextStudentCode(),
    fullName: trial.fullName,
    phone: kid ? null : trial.phone,
    parentPhone: kid ? trial.phone : null,
    birthYear: trial.age != null ? Number(date.slice(0, 4)) - trial.age : null,
    locationId: trial.locationId,
    joinedAt: date,
    status: 'active',
    note: [trial.preferredTime && `Giờ mong muốn: ${trial.preferredTime}`, trial.note].filter(Boolean).join('\n') || null,
  }).returning();
  await db.update(t).set({ status: 'enrolled', studentId: student.id }).where(eq(t.id, id));
  return c.json({ studentId: student.id }, 201);
});

trialRoutes.delete('/:id', need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await db.delete(t).where(eq(t.id, id));
  return c.json({ ok: true });
});
