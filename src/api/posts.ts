import { Hono } from 'hono';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db';
import { slugify, youtubeId } from '../lib/util';
import { sanitizeHtml, toText } from '../lib/html';
import { withMedia } from '../lib/public';
import { body, idParam, need, pageNumber } from './guard';
import { deleteMedia } from './media';
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

// Sanitize editor HTML on the server before saving.
const postSchema = z.object({
  title: z.string().trim().max(200).nullish().transform((v) => v || null),
  titleEn: z.string().trim().max(200).nullish().transform((v) => v || null),
  content: z.string().max(50000).default(''),
  contentEn: z.string().max(50000).nullish(),
  publishedAt: z.number().int().positive().max(253402300799999, 'Ngày đăng không hợp lệ'),
  isPublic: z.boolean(),
  media: z.array(mediaItem).max(24, 'Tối đa 24 ảnh / video mỗi bài').default([]), // Four parameters per item, below D1's limit of 100.
});

const POST_LABELS = { title: 'Tiêu đề', titleEn: 'Title (English)', content: 'Nội dung', contentEn: 'Content (English)', publishedAt: 'Ngày đăng', media: 'Ảnh / video' };

async function clean(data: z.infer<typeof postSchema>) {
  const { media, content, contentEn, ...rest } = data;
  const html = await sanitizeHtml(content);
  const htmlEn = contentEn ? await sanitizeHtml(contentEn) : '';
  return { media, values: { ...rest, content: html, contentEn: toText(htmlEn) ? htmlEn : null, format: 'html' as const } };
}

/** Collect existing media keys for cleanup after updating or deleting a post. */
const fileKeys = async (postId: number) =>
  (await db.select({ key: img.key, type: img.type }).from(img).where(eq(img.postId, postId))).filter((m) => m.type !== 'youtube').map((m) => m.key);

const mediaRows = (postId: number, media: z.infer<typeof mediaItem>[]) => media.map((m, sort) => ({ postId, type: m.type, key: m.key, sort }));

const PER_PAGE = 50; // Keep the withMedia ID list below the D1 parameter limit.

postRoutes.get('/', need('posts'), async (c) => {
  const page = pageNumber(c.req.query('page'));
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
  const insert = db.insert(p).values({ ...values, slug, createdBy: c.get('user').id }).returning();
  const [rows] = media.length
    ? await db.batch([insert, db.insert(img).values(media.map((m, sort) => ({ postId: sql`(select id from posts where slug = ${slug})`, type: m.type, key: m.key, sort })))])
    : [await insert];
  const [row] = rows;
  return c.json(row, 201);
});

postRoutes.put('/:id', need('posts'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const [data, err] = await body(c, postSchema, POST_LABELS);
  if (err) return err;
  const { media, values } = await clean(data);
  if (!toText(values.content) && !media.length) return c.json({ error: 'Viết vài dòng hoặc thêm ảnh / video' }, 400);
  // Return a clear 404 if the post was already deleted.
  if (!(await db.select({ id: p.id }).from(p).where(eq(p.id, id)).get())) return c.json({ error: 'Bài này đã bị xoá' }, 404);
  const before = await fileKeys(id);
  await db.batch([
    db.update(p).set({ ...values, updatedAt: Date.now() }).where(eq(p.id, id)),
    db.delete(img).where(eq(img.postId, id)),
    ...(media.length ? [db.insert(img).values(mediaRows(id, media))] : []),
  ]);
  await deleteMedia(before); // Preserve keys still referenced by another record.
  return c.json({ ok: true });
});

postRoutes.delete('/:id', need('posts'), need('delete'), async (c) => {
  const id = idParam(c);
  if (!id) return c.notFound();
  const files = await fileKeys(id);
  await db.delete(p).where(eq(p.id, id));
  await deleteMedia(files);
  return c.json({ ok: true });
});
