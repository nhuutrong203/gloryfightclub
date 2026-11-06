import { and, asc, count, desc, eq, inArray, lte } from 'drizzle-orm';
import { db, schema } from '../db';
import { youtubeId } from './util';

/** Escape HTML, tự nhận link, giữ xuống dòng — cho nội dung văn bản thường (bài tin, mô tả). */
export function richText(text: string | null | undefined): string {
  if (!text) return '';
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return esc
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow" class="underline decoration-glory underline-offset-4 break-all">${u}</a>`)
    .replace(/\n/g, '<br>');
}

/** Link YouTube → link embed; link khác → null. */
export function youtubeEmbed(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export const lines = (s: string | null | undefined) => (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

// ───── Truy vấn dùng chung ─────

export const publicDisciplines = () =>
  db.select().from(schema.disciplines).where(eq(schema.disciplines.isPublic, true)).orderBy(asc(schema.disciplines.sort));

/** HLV đang hiện + thành tích (bảng Thành tích) gắn với từng người: thẻ HLV dùng khi ô chữ "Thành tích" để trống. */
export async function publicCoaches() {
  const [coaches, awards] = await Promise.all([
    db.select().from(schema.coaches).where(eq(schema.coaches.isPublic, true)).orderBy(asc(schema.coaches.sort)),
    db.select({ coachId: schema.achievements.coachId, title: schema.achievements.title, titleEn: schema.achievements.titleEn, eventName: schema.achievements.eventName, eventDate: schema.achievements.eventDate })
      .from(schema.achievements).where(eq(schema.achievements.isPublic, true)).orderBy(asc(schema.achievements.sort)),
  ]);
  return coaches.map((c) => ({ ...c, awards: awards.filter((a) => a.coachId === c.id) }));
}

export const publicPlans = () =>
  db.select().from(schema.feePlans).where(eq(schema.feePlans.isPublic, true)).orderBy(asc(schema.feePlans.pricePerMonth), asc(schema.feePlans.sort)); // giá thấp → cao

export const publicClasses = () =>
  db.select().from(schema.classes)
    .where(and(eq(schema.classes.isPublic, true), eq(schema.classes.isActive, true)))
    .orderBy(asc(schema.classes.startTime));

export const publicAchievements = () =>
  db.select().from(schema.achievements).where(eq(schema.achievements.isPublic, true))
    .orderBy(asc(schema.achievements.sort), desc(schema.achievements.eventDate)); // thứ tự ↑↓ trong CMS

export const publicTestimonials = () =>
  db.select().from(schema.testimonials).where(eq(schema.testimonials.isPublic, true)).orderBy(asc(schema.testimonials.sort));

export const publicFaqs = () =>
  db.select().from(schema.faqs).where(eq(schema.faqs.isPublic, true)).orderBy(asc(schema.faqs.sort));

const postVisible = () => and(eq(schema.posts.isPublic, true), lte(schema.posts.publishedAt, Date.now()));

/** Bài đã đăng (mới nhất trước) kèm ảnh. */
export async function publishedPosts(limit: number, offset = 0) {
  const posts = await db.select().from(schema.posts).where(postVisible())
    .orderBy(desc(schema.posts.publishedAt)).limit(limit).offset(offset);
  return withMedia(posts);
}

/** Slug bài đã đăng cho sitemap (không lấy ảnh: danh sách id dài vượt giới hạn 100 tham số của D1). */
export const publishedSlugs = (limit: number) =>
  db.select({ slug: schema.posts.slug }).from(schema.posts).where(postVisible()).orderBy(desc(schema.posts.publishedAt)).limit(limit);

export async function postBySlug(slug: string) {
  const [post] = await db.select().from(schema.posts)
    .where(and(eq(schema.posts.slug, slug), postVisible())).limit(1);
  return post ? (await withMedia([post]))[0] : null;
}

export async function countPublishedPosts() {
  const [row] = await db.select({ n: count() }).from(schema.posts).where(postVisible());
  return row.n;
}

export type PostMedia = { type: 'image' | 'video' | 'youtube'; key: string };

/** Gắn ảnh / video của từng bài (dùng cả ở trang public lẫn API CMS). ≤ 100 bài mỗi lần: id đi vào inArray (giới hạn tham số D1). */
export async function withMedia<T extends { id: number }>(posts: T[]) {
  if (!posts.length) return [];
  const items = await db.select().from(schema.postImages)
    .where(inArray(schema.postImages.postId, posts.map((p) => p.id))).orderBy(asc(schema.postImages.sort));
  return posts.map((p) => ({ ...p, media: items.filter((i) => i.postId === p.id).map((i): PostMedia => ({ type: i.type, key: i.key })) }));
}

/** Nội dung bài để render (đã an toàn): bài mới là HTML đã lọc khi lưu, bài cũ là chữ thường. */
export const postHtml = (p: { format: 'text' | 'html' }, body: string) => (p.format === 'html' ? body : richText(body));

export type PublicClass = Awaited<ReturnType<typeof publicClasses>>[number];
