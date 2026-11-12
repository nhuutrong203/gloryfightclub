import { Hono } from 'hono';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { db, schema } from '../db';
import { normalizePhone, vnNow } from '../lib/util';
import { parseDate } from '../lib/import';
import { ageOn, upcomingSessions } from '../lib/schedule';
import { body } from './guard';
import { eq } from 'drizzle-orm';
import type { Policy } from '../lib/site';

export const publicRoutes = new Hono();

const trialSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20),
  age: z.coerce.number().int().min(3).max(90).nullish(), // Compatibility with older forms that only sent age.
  birthDate: z.string().max(10).nullish(),
  classId: z.coerce.number().int().positive().nullish(), // Trial session chosen from the suggestions.
  trialDate: z.string().max(10).nullish(),
  agree: z.boolean().optional(), // Consent to the club rules.
  disciplineId: z.coerce.number().int().positive().nullish(),
  locationId: z.coerce.number().int().positive().nullish(),
  feePlanId: z.coerce.number().int().positive().nullish(),
  preferredTime: z.string().trim().max(100).nullish(),
  note: z.string().trim().max(1000).nullish(),
  website: z.string().max(200).optional(), // Honeypot hidden from visitors.
});

// Public trial requests are stored for the CMS.
// Honeypot and per-IP limit. shortcut: add Turnstile if rotating IPs bypass them.
publicRoutes.post('/trial', async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'local';
  if (!(await env.TRIAL_LIMITER.limit({ key: ip })).success) return c.json({ ok: false, code: 'too_many' }, 429);
  const [data, err] = await body(c, trialSchema);
  if (err) return c.json({ ok: false, code: 'invalid' }, 400);
  if (data.website) return c.json({ ok: true }); // Return apparent success for the honeypot.
  const phone = normalizePhone(data.phone);
  if (!phone) return c.json({ ok: false, code: 'phone' }, 400);
  // Accept real birth dates and ages 3 to 90. The client translates error codes.
  const today = vnNow().date;
  const birthDate = data.birthDate ? parseDate(data.birthDate) : null;
  const age = birthDate ? ageOn(birthDate, today) : (data.age ?? null);
  if ((data.birthDate && !birthDate) || (age != null && (age < 3 || age > 90))) return c.json({ ok: false, code: 'birth' }, 400);
  // Require consent when rules exist and record the accepted version and time.
  const policyRow = await db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, 'policy')).get();
  const policy = policyRow?.value as Policy | undefined;
  const hasPolicy = !!(policy?.fees || policy?.safety);
  if (hasPolicy && data.agree !== true) return c.json({ ok: false, code: 'agree' }, 400);

  // Validate the selected IDs before inserting.
  const [d, l, p, k] = await Promise.all([
    data.disciplineId ? db.query.disciplines.findFirst({ where: (t, { eq }) => eq(t.id, data.disciplineId!), columns: { id: true } }) : null,
    data.locationId ? db.query.locations.findFirst({ where: (t, { eq }) => eq(t.id, data.locationId!), columns: { id: true } }) : null,
    data.feePlanId ? db.query.feePlans.findFirst({ where: (t, { eq }) => eq(t.id, data.feePlanId!), columns: { id: true } }) : null,
    data.classId ? db.query.classes.findFirst({ where: (t, { and, eq }) => and(eq(t.id, data.classId!), eq(t.isPublic, true), eq(t.isActive, true)) }) : null,
  ]);
  // Use the same 60-minute booking cutoff as the form.
  const trialDate = data.trialDate ? parseDate(data.trialDate) : null;
  const slot = k && trialDate && upcomingSessions([k], new Date(), { age }).some((s) => s.date === trialDate)
    ? { classId: k.id, trialDate } : null;
  if ((data.classId || data.trialDate) && !slot) return c.json({ ok: false, code: 'slot' }, 400);
  if (slot && ((data.locationId && data.locationId !== k!.locationId) || (data.disciplineId && !k!.disciplineIds.includes(data.disciplineId)))) {
    return c.json({ ok: false, code: 'slot' }, 400);
  }
  await db.insert(schema.trialRegistrations).values({
    fullName: data.fullName,
    phone,
    age,
    birthDate,
    // Infer missing discipline and location from the selected class.
    disciplineId: d?.id ?? (slot ? k!.disciplineIds[0] ?? null : null),
    locationId: l?.id ?? (slot ? k!.locationId : null),
    classId: slot?.classId ?? null,
    trialDate: slot?.trialDate ?? null,
    feePlanId: p?.id ?? null,
    agreedAt: hasPolicy ? Date.now() : null,
    policyVersion: hasPolicy ? (policy?.updated ?? null) : null,
    preferredTime: data.preferredTime || null,
    note: data.note || null,
  });
  return c.json({ ok: true });
});
