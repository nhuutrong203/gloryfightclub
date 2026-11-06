import { Hono } from 'hono';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { db, schema } from '../db';
import { normalizePhone, vnNow } from '../lib/util';
import { parseDate } from '../lib/import';
import { ageOn, weekdayOf } from '../lib/schedule';
import { body } from './guard';

export const publicRoutes = new Hono();

const trialSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20),
  age: z.coerce.number().int().min(3).max(90).nullish(), // trang cũ còn trong cache (trước khi có ngày sinh)
  birthDate: z.string().max(10).nullish(),
  classId: z.coerce.number().int().positive().nullish(), // buổi học thử chọn trong danh sách gợi ý
  trialDate: z.string().max(10).nullish(),
  disciplineId: z.coerce.number().int().positive().nullish(),
  locationId: z.coerce.number().int().positive().nullish(),
  feePlanId: z.coerce.number().int().positive().nullish(),
  preferredTime: z.string().trim().max(100).nullish(),
  note: z.string().trim().max(1000).nullish(),
  website: z.string().max(200).optional(), // honeypot: người thật không thấy ô này
});

// Form đăng ký học thử trên website → bảng trial_registrations (hiện trong CMS).
// Chống spam: honeypot + tối đa 5 lần / phút / IP (wrangler.jsonc). shortcut: bot đổi IP liên tục vẫn lọt → thêm Cloudflare Turnstile.
publicRoutes.post('/trial', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'local';
  if (!(await env.TRIAL_LIMITER.limit({ key: ip })).success) return c.json({ ok: false, code: 'too_many' }, 429);
  const [data, err] = await body(c, trialSchema);
  if (err) return c.json({ ok: false, code: 'invalid' }, 400);
  if (data.website) return c.json({ ok: true }); // bot: giả vờ thành công
  const phone = normalizePhone(data.phone);
  if (!phone) return c.json({ ok: false, code: 'phone' }, 400);
  // Ngày sinh: ngày có thật, 3–90 tuổi. Client báo lỗi bằng câu đúng ngôn ngữ theo code (server không trả chữ tiếng Việt cho trang EN).
  const today = vnNow().date;
  const birthDate = data.birthDate ? parseDate(data.birthDate) : null;
  const age = birthDate ? ageOn(birthDate, today) : (data.age ?? null);
  if ((data.birthDate && !birthDate) || (age != null && (age < 3 || age > 90))) return c.json({ ok: false, code: 'birth' }, 400);

  // Bỏ id không tồn tại thay vì báo lỗi khóa ngoại.
  const [d, l, p, k] = await Promise.all([
    data.disciplineId ? db.query.disciplines.findFirst({ where: (t, { eq }) => eq(t.id, data.disciplineId!), columns: { id: true } }) : null,
    data.locationId ? db.query.locations.findFirst({ where: (t, { eq }) => eq(t.id, data.locationId!), columns: { id: true } }) : null,
    data.feePlanId ? db.query.feePlans.findFirst({ where: (t, { eq }) => eq(t.id, data.feePlanId!), columns: { id: true } }) : null,
    data.classId ? db.query.classes.findFirst({ where: (t, { and, eq }) => and(eq(t.id, data.classId!), eq(t.isPublic, true), eq(t.isActive, true)) }) : null,
  ]);
  // Buổi học thử chỉ giữ khi lớp có học đúng thứ đó và ngày nằm trong 14 ngày tới (form gửi sai / trang cũ → bỏ, không báo lỗi).
  const trialDate = data.trialDate ? parseDate(data.trialDate) : null;
  const inTwoWeeks = trialDate && trialDate >= today && trialDate <= vnNow(new Date(Date.now() + 14 * 86_400_000)).date;
  const slot = k && trialDate && inTwoWeeks && k.days.includes(weekdayOf(trialDate)) ? { classId: k.id, trialDate } : null;
  await db.insert(schema.trialRegistrations).values({
    fullName: data.fullName,
    phone,
    age,
    birthDate,
    // Chọn buổi học thử mà chưa chọn môn / cơ sở → lấy theo lớp đó.
    disciplineId: d?.id ?? (slot ? k!.disciplineIds[0] ?? null : null),
    locationId: l?.id ?? (slot ? k!.locationId : null),
    classId: slot?.classId ?? null,
    trialDate: slot?.trialDate ?? null,
    feePlanId: p?.id ?? null,
    preferredTime: data.preferredTime || null,
    note: data.note || null,
  });
  return c.json({ ok: true });
});
