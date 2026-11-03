import { Hono } from 'hono';
import { asc, eq, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { z, type ZodType } from 'zod';
import { db, schema } from '../db';
import { RESOURCES, fieldLabels, writableColumns, type Field, type ResourceKey } from '../admin/resources';
import { slugify } from '../lib/util';
import { body, idParam, need } from './guard';
import { deleteMedia } from './media';
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
    case 'url': return z.string().trim().max(1000).regex(/^https?:\/\/\S+$/i, 'Link phải bắt đầu bằng https://').nullish().or(z.literal('')).transform((v) => v || null);
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
/** Giá trị các ô ảnh của 1 dòng (để dọn file R2 khi đổi ảnh / xoá mục). */
const imagesOf = (key: ResourceKey, row: Record<string, any> | undefined) =>
  row ? RESOURCES[key].fields.filter((f) => f.type === 'image').map((f) => row[f.name] as string | null) : [];

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
  const [data, err] = await body(c, schemas[key], fieldLabels(RESOURCES[key]));
  if (err) return err;
  const missing = RESOURCES[key].fields.find((f) => f.required && (data[f.name] == null || data[f.name] === ''));
  if (missing) return c.json({ error: `${missing.label} là bắt buộc` }, 400);
  const bad = RESOURCES[key].check?.(data);
  if (bad) return c.json({ error: bad }, 400);
  const values: Record<string, unknown> = pick(data, writableColumns(RESOURCES[key]));
  const slugFrom = RESOURCES[key].slugFrom;
  if (slugFrom) values.slug = `${slugify(String(data[slugFrom]))}-${crypto.randomUUID().slice(0, 4)}`;
  // Thứ tự hiển thị không nhập tay: mục mới nằm cuối (thư viện: đầu) danh sách, đổi bằng nút ↑↓.
  const t = TABLES[key];
  if (t.sort) {
    const r = await db.select({ n: RESOURCES[key].newFirst ? sql<number>`coalesce(min(${t.sort}), 1) - 1` : sql<number>`coalesce(max(${t.sort}), 0) + 1` }).from(t).get();
    values.sort = r?.n ?? 0;
  }
  const [row] = await db.insert(t).values(values as any).returning();
  return c.json(row, 201);
});

// Sắp xếp lại: client gửi id theo thứ tự mới → sort = 1, 2, 3… (luôn khác nhau).
contentRoutes.put('/:res/order', need('content'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  if (!key || RESOURCES[key].orderBy !== 'sort') return c.notFound();
  const [data, err] = await body(c, z.object({ ids: z.array(z.number().int().positive()).min(1).max(1000) }));
  if (err) return err;
  const t = TABLES[key];
  const [first, ...rest] = data.ids.map((id, i) => db.update(t).set({ sort: i + 1 } as any).where(eq(t.id, id)));
  await db.batch([first, ...rest]);
  return c.json({ ok: true });
});

contentRoutes.put('/:res/:id', need('content'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  const id = idParam(c);
  if (!key || !id) return c.notFound();
  const [data, err] = await body(c, schemas[key], fieldLabels(RESOURCES[key]));
  if (err) return err;
  const bad = RESOURCES[key].check?.(data);
  if (bad) return c.json({ error: bad }, 400);
  const values = pick(data, writableColumns(RESOURCES[key]));
  if (!Object.keys(values).length) return c.json({ error: 'Không có gì để lưu' }, 400);
  const old = await db.select().from(TABLES[key]).where(eq(TABLES[key].id, id)).get();
  const [row] = await db.update(TABLES[key]).set(values as any).where(eq(TABLES[key].id, id)).returning();
  if (row) await deleteMedia(imagesOf(key, old).filter((k) => k && !imagesOf(key, row).includes(k)));
  return row ? c.json(row) : c.notFound();
});

contentRoutes.delete('/:res/:id', need('content'), need('delete'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  const id = idParam(c);
  if (!key || !id) return c.notFound();
  // Môn học: xoá sẽ kéo theo mọi cấp đai (cascade) và để lại lớp trỏ tới môn không còn → chặn, gợi ý ẩn.
  if (key === 'disciplines') {
    const u = await db.get<{ belts: number; classes: number }>(sql`select
      (select count(*) from belts where discipline_id = ${id}) as belts,
      (select count(*) from classes, json_each(classes.discipline_ids) j where j.value = ${id}) as classes`);
    if (u && (u.belts || u.classes)) {
      const what = [u.belts && `${u.belts} cấp đai`, u.classes && `${u.classes} lớp`].filter(Boolean).join(' và ');
      return c.json({ error: `Môn này đang có ${what}. Tắt "Hiện trên website" để ẩn môn, hoặc xoá/đổi các mục đó trước.` }, 409);
    }
  }
  const old = await db.select().from(TABLES[key]).where(eq(TABLES[key].id, id)).get();
  try {
    await db.delete(TABLES[key]).where(eq(TABLES[key].id, id));
  } catch {
    return c.json({ error: 'Không xoá được vì mục này đang được dùng ở nơi khác (vd. cơ sở đang có lớp).' }, 409);
  }
  await deleteMedia(imagesOf(key, old));
  return c.json({ ok: true });
});

const pick = (o: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
