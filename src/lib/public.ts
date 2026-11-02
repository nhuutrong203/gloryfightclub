import { and, asc, count, desc, eq, inArray, lte } from 'drizzle-orm';
import { db, schema } from '../db';

/** Chữ số ngày hôm nay theo giờ VN: '2'..'7', '8' = Chủ nhật. */
export function todayDigit(now = new Date()): string {
  const wd = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
  const i = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
  return i === 0 ? '8' : String(i + 1);
}

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
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export const lines = (s: string | null | undefined) => (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

// ───── Truy vấn dùng chung ─────

export const publicDisciplines = () =>
  db.select().from(schema.disciplines).where(eq(schema.disciplines.isPublic, true)).orderBy(asc(schema.disciplines.sort));

export const publicCoaches = () =>
  db.select().from(schema.coaches).where(eq(schema.coaches.isPublic, true)).orderBy(asc(schema.coaches.sort));

export const publicPlans = () =>
  db.select().from(schema.feePlans).where(eq(schema.feePlans.isPublic, true)).orderBy(asc(schema.feePlans.sort));

export const publicClasses = () =>
  db.select().from(schema.classes)
    .where(and(eq(schema.classes.isPublic, true), eq(schema.classes.isActive, true)))
    .orderBy(asc(schema.classes.startTime));

export const publicAchievements = () =>
  db.select().from(schema.achievements).where(eq(schema.achievements.isPublic, true))
    .orderBy(desc(schema.achievements.eventDate), asc(schema.achievements.sort));

export const publicTestimonials = () =>
  db.select().from(schema.testimonials).where(eq(schema.testimonials.isPublic, true)).orderBy(asc(schema.testimonials.sort));

export const publicFaqs = () =>
  db.select().from(schema.faqs).where(eq(schema.faqs.isPublic, true)).orderBy(asc(schema.faqs.sort));

const postVisible = () => and(eq(schema.posts.isPublic, true), lte(schema.posts.publishedAt, Date.now()));

/** Bài đã đăng (mới nhất trước) kèm ảnh. */
export async function publishedPosts(limit: number, offset = 0) {
  const posts = await db.select().from(schema.posts).where(postVisible())
    .orderBy(desc(schema.posts.publishedAt)).limit(limit).offset(offset);
  return withImages(posts);
}

export async function postBySlug(slug: string) {
  const [post] = await db.select().from(schema.posts)
    .where(and(eq(schema.posts.slug, slug), postVisible())).limit(1);
  return post ? (await withImages([post]))[0] : null;
}

export async function countPublishedPosts() {
  const [row] = await db.select({ n: count() }).from(schema.posts).where(postVisible());
  return row.n;
}

async function withImages<T extends { id: number }>(posts: T[]) {
  if (!posts.length) return [];
  const imgs = await db.select().from(schema.postImages)
    .where(inArray(schema.postImages.postId, posts.map((p) => p.id))).orderBy(asc(schema.postImages.sort));
  return posts.map((p) => ({ ...p, images: imgs.filter((i) => i.postId === p.id).map((i) => i.key) }));
}

export type PublicClass = Awaited<ReturnType<typeof publicClasses>>[number];
