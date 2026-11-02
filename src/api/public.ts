import { Hono } from 'hono';
import { z } from 'zod';
import { db, schema } from '../db';
import { normalizePhone } from '../lib/util';
import { body } from './guard';

export const publicRoutes = new Hono();

const trialSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20),
  age: z.coerce.number().int().min(3).max(90).nullish(),
  disciplineId: z.coerce.number().int().positive().nullish(),
  locationId: z.coerce.number().int().positive().nullish(),
  preferredTime: z.string().trim().max(100).nullish(),
  note: z.string().trim().max(1000).nullish(),
  website: z.string().max(200).optional(), // honeypot: người thật không thấy ô này
});

// Form đăng ký học thử trên website → bảng trial_registrations (hiện trong CMS).
// shortcut: chống spam chỉ bằng honeypot; khi deploy thêm Cloudflare Turnstile.
publicRoutes.post('/trial', async (c) => {
  const [data, err] = await body(c, trialSchema);
  if (err) return c.json({ ok: false, error: 'Thông tin chưa hợp lệ.' }, 400);
  if (data.website) return c.json({ ok: true }); // bot: giả vờ thành công
  const phone = normalizePhone(data.phone);
  if (!phone) return c.json({ ok: false, error: 'Số điện thoại chưa đúng.' }, 400);

  // Bỏ id không tồn tại thay vì báo lỗi khóa ngoại.
  const [d, l] = await Promise.all([
    data.disciplineId ? db.query.disciplines.findFirst({ where: (t, { eq }) => eq(t.id, data.disciplineId!), columns: { id: true } }) : null,
    data.locationId ? db.query.locations.findFirst({ where: (t, { eq }) => eq(t.id, data.locationId!), columns: { id: true } }) : null,
  ]);
  await db.insert(schema.trialRegistrations).values({
    fullName: data.fullName,
    phone,
    age: data.age ?? null,
    disciplineId: d?.id ?? null,
    locationId: l?.id ?? null,
    preferredTime: data.preferredTime || null,
    note: data.note || null,
  });
  return c.json({ ok: true });
});
