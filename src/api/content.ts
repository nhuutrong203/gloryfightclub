import { Hono } from 'hono';
import { asc, eq, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { z, type ZodType } from 'zod';
import { db, schema } from '../db';
import { RESOURCES, fieldLabels, writableColumns, type Field, type ResourceKey } from '../admin/resources';
import { rerank, slugify } from '../lib/util';
import { body, idParam, need } from './guard';
import { deleteMedia } from './media';
import type { Env } from '.';

// Shared CRUD for resources declared in src/admin/resources.ts.
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
  partners: schema.partners,
};

const optStr = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

function fieldSchema(f: Field): ZodType {
  const req = (s: z.ZodString) => (f.required ? s.trim().min(1, `${f.label} là bắt buộc`) : s);
  switch (f.type) {
    case 'number': case 'money': return f.required ? z.coerce.number().int().min(0) : z.coerce.number().int().min(0).nullish().transform((v) => v ?? null);
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
/** Collect R2 keys to clean up after an update or deletion. */
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
  // Assign new items an initial position. Use the list arrows to change it.
  const t = TABLES[key];
  if (t.sort) {
    const r = await db.select({ n: RESOURCES[key].newFirst ? sql<number>`coalesce(min(${t.sort}), 1) - 1` : sql<number>`coalesce(max(${t.sort}), 0) + 1` }).from(t).get();
    values.sort = r?.n ?? 0;
  }
  const [row] = await db.insert(t).values(values as any).returning();
  if (key === 'belts') await rerankBelts(row.disciplineId, row.id);
  return c.json(row, 201);
});

/** Renumber belts when inserting or moving one within a discipline. */
async function rerankBelts(disciplineId: number, editedId = 0, oldRank?: number) {
  const b = schema.belts;
  const changes = rerank(await db.select({ id: b.id, rank: b.rank }).from(b).where(eq(b.disciplineId, disciplineId)), editedId, oldRank);
  if (!changes.length) return;
  const [first, ...rest] = changes.map(([id, rank]) => db.update(b).set({ rank }).where(eq(b.id, id)));
  await db.batch([first, ...rest]);
}

// Assign consecutive sort values in the submitted order.
contentRoutes.put('/:res/order', need('content'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  if (!key || RESOURCES[key].orderBy !== 'sort') return c.notFound();
  const [data, err] = await body(c, z.object({ ids: z.array(z.number().int().positive()).min(1).max(1000) }));
  if (err) return err;
  const t = TABLES[key];
  const ids = new Set(data.ids);
  const current = await db.select({ id: t.id }).from(t);
  if (ids.size !== data.ids.length || current.length !== ids.size || current.some(({ id }) => !ids.has(id))) {
    return c.json({ error: 'Danh sách không khớp. Tải lại rồi thử sắp xếp lại.' }, 409);
  }
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
  const where = key === 'classes' && values.locationId !== undefined
    ? sql`${schema.classes.id} = ${id} and (${schema.classes.locationId} = ${values.locationId}
        or not exists (select 1 from student_classes where class_id = ${id}))`
    : eq(TABLES[key].id, id);
  const [row] = await db.update(TABLES[key]).set(values as any).where(where).returning();
  if (!row && old && key === 'classes' && values.locationId !== undefined) {
    return c.json({ error: 'Không thể đổi cơ sở khi lớp còn học viên. Chuyển học viên sang lớp khác trước.' }, 409);
  }
  if (row) await deleteMedia(imagesOf(key, old).filter((k) => k && !imagesOf(key, row).includes(k)));
  if (row && old && key === 'belts') {
    const sameDiscipline = old.disciplineId === row.disciplineId;
    await rerankBelts(row.disciplineId, id, sameDiscipline ? old.rank : undefined);
    if (!sameDiscipline) await rerankBelts(old.disciplineId); // Close the rank gap in the old discipline after a move.
  }
  return row ? c.json(row) : c.notFound();
});

contentRoutes.delete('/:res/:id', need('content'), need('delete'), async (c) => {
  const key = resolve(c.req.param('res') ?? '');
  const id = idParam(c);
  if (!key || !id) return c.notFound();
  // Block deletion while belts or classes still reference the discipline.
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
    // Migration 0002 omitted ON DELETE SET NULL for trial_registrations.fee_plan_id.
    // Clear trial plan references in the same transaction before deleting the plan.
    const tr = schema.trialRegistrations;
    const del = db.delete(TABLES[key]).where(eq(TABLES[key].id, id));
    if (key === 'feePlans') await db.batch([db.update(tr).set({ feePlanId: null }).where(eq(tr.feePlanId, id)), del]);
    else await del;
  } catch {
    return c.json({ error: 'Không xoá được vì mục này đang được dùng ở nơi khác (vd. cơ sở đang có lớp).' }, 409);
  }
  await deleteMedia(imagesOf(key, old));
  if (key === 'belts' && old) await rerankBelts(old.disciplineId); // Close the gap left by the deleted belt.
  return c.json({ ok: true });
});

const pick = (o: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
