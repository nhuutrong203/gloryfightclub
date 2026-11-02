import { Hono } from 'hono';
import { asc, eq } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { z, type ZodType } from 'zod';
import { db, schema } from '../db';
import { RESOURCES, writableColumns, type Field, type ResourceKey } from '../admin/resources';
import { slugify } from '../lib/util';
import { body, idParam, need } from './guard';
import type { Env } from '.';

// CRUD chung cho các mục nội dung khai báo trong src/admin/resources.ts.
const TABLES: Record<ResourceKey, SQLiteTable & Record<string, any>> = {
  locations: schema.locations,
  disciplines: schema.disciplines,
  classes: schema.classes,
  coaches: schema.coaches,
  belts: schema.belts,
  feePlans: schema.feePlans,
  gallery: schema.galleryItems,
  testimonials: schema.testimonials,
  faqs: schema.faqs,
  achievements: schema.achievements,
};

const optStr = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

function fieldSchema(f: Field): ZodType {
  const req = (s: z.ZodString) => (f.required ? s.trim().min(1, `${f.label} là bắt buộc`) : s);
  switch (f.type) {
    case 'number': return f.required ? z.coerce.number().int().min(0) : z.coerce.number().int().min(0).nullish().transform((v) => v ?? null);
    case 'bool': return z.boolean();
    case 'multi': return z.array(z.number().int().positive()).max(20);
    case 'select':
      if (f.options) return z.enum(f.options.map((o) => o.value) as [string, ...string[]]);
      return f.required ? z.number().int().positive() : z.number().int().positive().nullish().transform((v) => v ?? null);
    case 'time': return z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ dạng HH:MM');
    case 'days': return z.string().regex(/^[2-8]{1,7}$/, 'Chọn ít nhất một ngày');
    case 'color': return z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu dạng #RRGGBB');
    case 'date': return z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal('')).transform((v) => v || null);
    case 'image': return z.string().regex(/^public\/[\w\-/.]+$/).nullish().or(z.literal('')).transform((v) => v || null);
    case 'textarea': return f.required ? req(z.string().max(10000)) : optStr(10000);
    default: return f.required ? req(z.string().max(500)) : optStr(500);
  }
}

const schemas = Object.fromEntries(
  Object.values(RESOURCES).map((r) => {
    const shape: Record<string, ZodType> = {};
    for (const f of r.fields) {
      shape[f.name] = fieldSchema(f);
      if (f.en) shape[`${f.name}En`] = optStr(f.type === 'textarea' ? 10000 : 500);
    }
    return [r.key, z.object(shape).partial()];
  }),
) as unknown as Record<ResourceKey, ZodType<Record<string, unknown>>>;

export const contentRoutes = new Hono<Env>();

const resolve = (key: string) => (key in RESOURCES ? (key as ResourceKey) : null);

contentRoutes.get('/:res', async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  if (!key) return c.notFound();
  const t = TABLES[key];
  const order = RESOURCES[key].orderBy;
  const rows = await db.select().from(t).orderBy(...(order ? [asc(t[order])] : []), asc(t.id));
  return c.json(rows);
});

contentRoutes.post('/:res', need('content'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  if (!key) return c.notFound();
  const [data, err] = await body(c, schemas[key]);
  if (err) return err;
  const missing = RESOURCES[key].fields.find((f) => f.required && (data[f.name] == null || data[f.name] === ''));
  if (missing) return c.json({ error: `${missing.label} là bắt buộc` }, 400);
  const values: Record<string, unknown> = pick(data, writableColumns(RESOURCES[key]));
  const slugFrom = RESOURCES[key].slugFrom;
  if (slugFrom) values.slug = `${slugify(String(data[slugFrom]))}-${crypto.randomUUID().slice(0, 4)}`;
  const [row] = await db.insert(TABLES[key]).values(values as any).returning();
  return c.json(row, 201);
});

contentRoutes.put('/:res/:id', need('content'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  const id = idParam(c);
  if (!key || !id) return c.notFound();
  const [data, err] = await body(c, schemas[key]);
  if (err) return err;
  const values = pick(data, writableColumns(RESOURCES[key]));
  if (!Object.keys(values).length) return c.json({ error: 'Không có gì để lưu' }, 400);
  const [row] = await db.update(TABLES[key]).set(values as any).where(eq(TABLES[key].id, id)).returning();
  return row ? c.json(row) : c.notFound();
});

contentRoutes.delete('/:res/:id', need('content'), need('delete'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  const id = idParam(c);
  if (!key || !id) return c.notFound();
  try {
    await db.delete(TABLES[key]).where(eq(TABLES[key].id, id));
  } catch {
    return c.json({ error: 'Không xoá được vì mục này đang được dùng ở nơi khác (vd. cơ sở đang có lớp).' }, 409);
  }
  return c.json({ ok: true });
});

const pick = (o: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
