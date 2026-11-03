import { Hono } from 'hono';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { slugify } from '../lib/util';
import { body, idParam, need } from './guard';
import type { Env } from '.';

const p = schema.posts;
const img = schema.postImages;
export const postRoutes = new Hono<Env>();

const postSchema = z.object({
  title: z.string().trim().max(200).nullish().transform((v) => v || null),
  titleEn: z.string().trim().max(200).nullish().transform((v) => v || null),
  content: z.string().trim().min(1, 'Nhập nội dung').max(20000),
  contentEn: z.string().trim().max(20000).nullish().transform((v) => v || null),
  publishedAt: z.number().int().positive(), // > bây giờ = hẹn giờ đăng
  isPublic: z.boolean(),
  images: z.array(z.string().regex(/^public\/[\w\-/.]+$/)).max(20).default([]),
});

const POST_LABELS = { title: 'Tiêu đề', titleEn: 'Title (English)', content: 'Nội dung', contentEn: 'Content (English)', publishedAt: 'Thời gian đăng', images: 'Ảnh' };

const PER_PAGE = 50; // ≤ 100: danh sách id bài đi vào inArray (giới hạn tham số D1)
const withImages = async (rows: (typeof p.$inferSelect)[]) => {
  const images = rows.length ? await db.select().from(img).where(inArray(img.postId, rows.map((r) => r.id))).orderBy(asc(img.sort)) : [];
  return rows.map((r) => ({ ...r, images: images.filter((i) => i.postId === r.id).map((i) => i.key) }));
};

postRoutes.get('/', need('posts'), async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const rows = await db.select().from(p).orderBy(desc(p.publishedAt), desc(p.id)).limit(PER_PAGE + 1).offset((page - 1) * PER_PAGE);
  return c.json({ page, hasMore: rows.length > PER_PAGE, rows: await withImages(rows.slice(0, PER_PAGE)) });
});

postRoutes.get('/:id', need('posts'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const row = await db.select().from(p).where(eq(p.id, id)).get();
  return row ? c.json((await withImages([row]))[0]) : c.notFound();
});

postRoutes.post('/', need('posts'), async (c) => {
  const [data, err] = await body(c, postSchema, POST_LABELS);
  if (err) return err;
  const { images, ...values } = data;
  const slug = `${slugify(values.title || values.content.slice(0, 60))}-${crypto.randomUUID().slice(0, 6)}`;
  const [row] = await db.insert(p).values({ ...values, slug, createdBy: c.get('user').id }).returning();
  if (images.length) await db.insert(img).values(images.map((key, sort) => ({ postId: row.id, key, sort })));
  return c.json(row, 201);
});

postRoutes.put('/:id', need('posts'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, postSchema, POST_LABELS);
  if (err) return err;
  const { images, ...values } = data;
  await db.batch([
    db.update(p).set({ ...values, updatedAt: Date.now() }).where(eq(p.id, id)),
    db.delete(img).where(eq(img.postId, id)),
    ...(images.length ? [db.insert(img).values(images.map((key, sort) => ({ postId: id, key, sort })))] : []),
  ]);
  return c.json({ ok: true });
});

postRoutes.delete('/:id', need('posts'), need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await db.delete(p).where(eq(p.id, id));
  return c.json({ ok: true });
});
