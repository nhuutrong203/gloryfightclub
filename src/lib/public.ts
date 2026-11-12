import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import { db, schema } from '../db';
import { youtubeId } from './util';

/** Escape plain text, link URLs, and preserve line breaks. */
export function richText(text: string | null | undefined): string {
  if (!text) return '';
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return esc
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow" class="underline decoration-glory underline-offset-4 break-all">${u}</a>`)
    .replace(/\n/g, '<br>');
}

/** Convert a YouTube URL to an embed URL. */
export function youtubeEmbed(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export const lines = (s: string | null | undefined) => (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

// Shared public queries

export const publicDisciplines = () =>
  db.select().from(schema.disciplines).where(eq(schema.disciplines.isPublic, true)).orderBy(asc(schema.disciplines.sort));

/** Attach published achievements to each public coach. */
export async function publicCoaches() {
  const [coaches, awards] = await Promise.all([
    db.select().from(schema.coaches).where(eq(schema.coaches.isPublic, true)).orderBy(asc(schema.coaches.sort)),
    db.select({ coachId: schema.achievements.coachId, title: schema.achievements.title, titleEn: schema.achievements.titleEn, eventName: schema.achievements.eventName, eventDate: schema.achievements.eventDate })
      .from(schema.achievements).where(eq(schema.achievements.isPublic, true)).orderBy(asc(schema.achievements.sort)),
  ]);
  return coaches.map((c) => ({ ...c, awards: awards.filter((a) => a.coachId === c.id) }));
}

export const publicPlans = () =>
  db.select().from(schema.feePlans).where(eq(schema.feePlans.isPublic, true)).orderBy(asc(schema.feePlans.pricePerMonth), asc(schema.feePlans.sort)); // Order by ascending price.

export const publicClasses = () =>
  db.select().from(schema.classes)
    .where(and(eq(schema.classes.isPublic, true), eq(schema.classes.isActive, true)))
    .orderBy(asc(schema.classes.startTime));

export const publicAchievements = () =>
  db.select().from(schema.achievements).where(eq(schema.achievements.isPublic, true))
    .orderBy(asc(schema.achievements.sort), desc(schema.achievements.eventDate)); // Match the CMS sort order.

export const publicTestimonials = () =>
  db.select().from(schema.testimonials).where(eq(schema.testimonials.isPublic, true)).orderBy(asc(schema.testimonials.sort));

export const publicFaqs = () =>
  db.select().from(schema.faqs).where(eq(schema.faqs.isPublic, true)).orderBy(asc(schema.faqs.sort));

const postVisible = () => and(eq(schema.posts.isPublic, true), lte(schema.posts.publishedAt, Date.now()));

/** Return published posts and media, optionally within a half-open date range. */
export async function publishedPosts(limit: number, offset = 0, range?: [number, number]) {
  const p = schema.posts;
  const posts = await db.select().from(p)
    .where(range ? and(postVisible(), gte(p.publishedAt, range[0]), lt(p.publishedAt, range[1])) : postVisible())
    .orderBy(desc(p.publishedAt), desc(p.id)).limit(limit).offset(offset);
  return withMedia(posts);
}

/** Count published diary posts per Vietnam-time month, newest first.
 *  Use the same grouped counts for filters and pagination.
 *  Vietnam uses UTC+7 year-round. */
export const postArchive = () =>
  db.all<{ month: string; n: number }>(sql`select strftime('%Y-%m', published_at / 1000, 'unixepoch', '+7 hours') as month, count(*) as n
    from posts where is_public = 1 and published_at <= ${Date.now()} group by month order by month desc`);

/** Fetch only published slugs for the sitemap to avoid a large media ID query. */
export const publishedSlugs = (limit: number) =>
  db.select({ slug: schema.posts.slug }).from(schema.posts).where(postVisible()).orderBy(desc(schema.posts.publishedAt)).limit(limit);

export async function postBySlug(slug: string) {
  const [post] = await db.select().from(schema.posts)
    .where(and(eq(schema.posts.slug, slug), postVisible())).limit(1);
  return post ? (await withMedia([post]))[0] : null;
}

export type PostMedia = { type: 'image' | 'video' | 'youtube'; key: string };

/** Attach media to each post. Keep each batch within the D1 parameter limit. */
export async function withMedia<T extends { id: number }>(posts: T[]) {
  if (!posts.length) return [];
  const items = await db.select().from(schema.postImages)
    .where(inArray(schema.postImages.postId, posts.map((p) => p.id))).orderBy(asc(schema.postImages.sort));
  return posts.map((p) => ({ ...p, media: items.filter((i) => i.postId === p.id).map((i): PostMedia => ({ type: i.type, key: i.key })) }));
}

/** Render sanitized editor HTML or escaped legacy plain text. */
export const postHtml = (p: { format: 'text' | 'html' }, body: string) => (p.format === 'html' ? body : richText(body));

export type PublicClass = Awaited<ReturnType<typeof publicClasses>>[number];
