import { Hono } from 'hono';
import { env } from 'cloudflare:workers';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { policyVersionText, vnNow } from '../lib/util';
import { ageOn } from '../lib/schedule';
import { body, idParam, need } from './guard';
import { isUnique, nextStudentCode } from './students';
import type { Env } from '.';

const t = schema.trialRegistrations;
export const trialRoutes = new Hono<Env>();

trialRoutes.get('/', need('students.view'), async (c) => {
  const status = c.req.query('status');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const perPage = 50;
  const rows = await db.select().from(t)
    .where(status ? eq(t.status, status as 'new') : undefined)
    .orderBy(sql`${t.status} = 'new' desc`, desc(t.createdAt), desc(t.id))
    .limit(perPage + 1).offset((page - 1) * perPage);
  return c.json({ rows: rows.slice(0, perPage), hasMore: rows.length > perPage, page });
});

/** Số đăng ký mới cho huy hiệu tab "Học thử" (CMS hỏi mỗi phút → chỉ trả con số). */
trialRoutes.get('/count', need('students.view'), async (c) => {
  const r = await db.select({ n: sql<number>`count(*)` }).from(t).where(eq(t.status, 'new')).get();
  return c.json({ n: r?.n ?? 0 });
});

trialRoutes.put('/:id', need('students.edit'), async (c) => {
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
  const age = trial.birthDate ? ageOn(trial.birthDate, date) : trial.age; // tuổi hôm nay (đăng ký cũ chỉ có tuổi lúc đăng ký)
  const kid = age != null && age < 16;
  const note = [trial.birthDate && `Ngày sinh: ${trial.birthDate.split('-').reverse().join('/')}`, trial.preferredTime && `Giờ mong muốn: ${trial.preferredTime}`,
    trial.agreedAt && `Đã đồng ý Quy định CLB${trial.policyVersion ? ` (bản ${policyVersionText(trial.policyVersion)})` : ''} khi đăng ký học thử${age != null && age < 18 ? ' — phụ huynh xác nhận' : ''}`, trial.note]
    .filter(Boolean).join('\n') || null;
  for (let attempt = 0; ; attempt++) {
    const code = await nextStudentCode();
    try {
      // D1 batch là một transaction: chỉ tạo học viên khi đơn còn chưa chuyển, rồi gán lớp và liên kết đơn cùng lúc.
      const [inserted] = await env.DB.batch([
        env.DB.prepare(`INSERT INTO students (code, full_name, phone, parent_phone, birth_year, location_id, fee_plan_id, joined_at, status, note)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?
          WHERE EXISTS (SELECT 1 FROM trial_registrations WHERE id = ? AND student_id IS NULL AND status != 'enrolled') RETURNING id`)
          .bind(code, trial.fullName, kid ? null : trial.phone, kid ? trial.phone : null,
            trial.birthDate ? Number(trial.birthDate.slice(0, 4)) : trial.age != null ? Number(date.slice(0, 4)) - trial.age : null,
            trial.locationId, trial.feePlanId, date, note, id),
        ...(trial.classId ? [env.DB.prepare(`INSERT INTO student_classes (student_id, class_id)
          SELECT id, ? FROM students WHERE code = ?`).bind(trial.classId, code)] : []),
        env.DB.prepare(`UPDATE trial_registrations SET status = 'enrolled', student_id = (SELECT id FROM students WHERE code = ?)
          WHERE id = ? AND student_id IS NULL AND status != 'enrolled'`).bind(code, id),
      ]);
      const studentId = (inserted.results?.[0] as { id: number } | undefined)?.id;
      return studentId ? c.json({ studentId }, 201) : c.json({ error: 'Đăng ký đã được chuyển thành học viên, tải lại trang để xem' }, 409);
    } catch (e) {
      if (attempt >= 2 || !isUnique(e)) throw e;
    }
  }
});

trialRoutes.delete('/:id', need('students.edit'), need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await db.delete(t).where(eq(t.id, id));
  return c.json({ ok: true });
});
