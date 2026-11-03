import { Hono } from 'hono';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { slugify, youtubeId } from '../lib/util';
import { sanitizeHtml, toText } from '../lib/html';
import { body, idParam, need } from './guard';
import type { Env } from '.';

const p = schema.posts;
const img = schema.postImages;
export const postRoutes = new Hono<Env>();

const r2Key = z.string().regex(/^public\/[\w\-/.]+$/);
const mediaItem = z.discriminatedUnion('type', [
  z.object({ type: z.literal('image'), key: r2Key }),
  z.object({ type: z.literal('video'), key: r2Key }),
  z.object({ type: z.literal('youtube'), key: z.string().trim().max(500).refine((u) => !!youtubeId(u), 'Link YouTube chưa đúng') }),
]);

// Nội dung là HTML từ trình soạn thảo → lọc ở server trước khi lưu (không tin client).
const postSchema = z.object({
  title: z.string().trim().max(200).nullish().transform((v) => v || null),
  titleEn: z.string().trim().max(200).nullish().transform((v) => v || null),
  content: z.string().max(50000).default(''),
  contentEn: z.string().max(50000).nullish(),
  publishedAt: z.number().int().positive(), // > bây giờ = hẹn giờ đăng
  isPublic: z.boolean(),
  media: z.array(mediaItem).max(24, 'Tối đa 24 ảnh / video mỗi bài').default([]), // 24 × 4 cột < 100 tham số D1
});

const POST_LABELS = { title: 'Tiêu đề', titleEn: 'Title (English)', content: 'Nội dung', contentEn: 'Content (English)', publishedAt: 'Ngày đăng', media: 'Ảnh / video' };

async function clean(data: z.infer<typeof postSchema>) {
  const { media, content, contentEn, ...rest } = data;
  const html = await sanitizeHtml(content);
  const htmlEn = contentEn ? await sanitizeHtml(contentEn) : '';
  return { media, values: { ...rest, content: html, contentEn: toText(htmlEn) ? htmlEn : null, format: 'html' as const } };
}

const mediaRows = (postId: number, media: z.infer<typeof mediaItem>[]) => media.map((m, sort) => ({ postId, type: m.type, key: m.key, sort }));

const PER_PAGE = 50; // ≤ 100: danh sách id bài đi vào inArray (giới hạn tham số D1)
const withMedia = async (rows: (typeof p.$inferSelect)[]) => {
  const items = rows.length ? await db.select().from(img).where(inArray(img.postId, rows.map((r) => r.id))).orderBy(asc(img.sort)) : [];
  return rows.map((r) => ({ ...r, media: items.filter((i) => i.postId === r.id).map((i) => ({ type: i.type, key: i.key })) }));
};

postRoutes.get('/', need('posts'), async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const rows = await db.select().from(p).orderBy(desc(p.publishedAt), desc(p.id)).limit(PER_PAGE + 1).offset((page - 1) * PER_PAGE);
  return c.json({ page, hasMore: rows.length > PER_PAGE, rows: await withMedia(rows.slice(0, PER_PAGE)) });
});

postRoutes.get('/:id', need('posts'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const row = await db.select().from(p).where(eq(p.id, id)).get();
  return row ? c.json((await withMedia([row]))[0]) : c.notFound();
});

postRoutes.post('/', need('posts'), async (c) => {
  const [data, err] = await body(c, postSchema, POST_LABELS);
  if (err) return err;
  const { media, values } = await clean(data);
  if (!toText(values.content) && !media.length) return c.json({ error: 'Viết vài dòng hoặc thêm ảnh / video' }, 400);
  const slug = `${slugify(values.title || toText(values.content).slice(0, 60) || 'nhat-ky')}-${crypto.randomUUID().slice(0, 6)}`;
  const [row] = await db.insert(p).values({ ...values, slug, createdBy: c.get('user').id }).returning();
  if (media.length) await db.insert(img).values(mediaRows(row.id, media));
  return c.json(row, 201);
});

postRoutes.put('/:id', need('posts'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, postSchema, POST_LABELS);
  if (err) return err;
  const { media, values } = await clean(data);
  if (!toText(values.content) && !media.length) return c.json({ error: 'Viết vài dòng hoặc thêm ảnh / video' }, 400);
  await db.batch([
    db.update(p).set({ ...values, updatedAt: Date.now() }).where(eq(p.id, id)),
    db.delete(img).where(eq(img.postId, id)),
    ...(media.length ? [db.insert(img).values(mediaRows(id, media))] : []),
  ]);
  return c.json({ ok: true });
});

postRoutes.delete('/:id', need('posts'), need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  await db.delete(p).where(eq(p.id, id));
  return c.json({ ok: true });
});
