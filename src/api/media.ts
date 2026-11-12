import { env } from 'cloudflare:workers';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { THUMB } from '../lib/site';

/** Remove unreferenced R2 files after the database write.
 *  Log cleanup failures without failing a save that already succeeded.
 *  shortcut: abandoned uploads remain; add a periodic scan if they need cleanup. */
export async function deleteMedia(keys: (string | null | undefined)[]) {
  const list = [...new Set(keys.filter((k): k is string => !!k && k.startsWith('public/')))];
  if (!list.length) return;
  try {
    // Pass keys as one JSON argument to stay below D1's parameter limit.
    // Use EXISTS predicates to avoid D1's UNION limits.
    const used = await db.all<{ k: string }>(sql`select j.value as k from json_each(${JSON.stringify(list)}) j where
      exists (select 1 from post_images where key = j.value) or exists (select 1 from coaches where photo_key = j.value)
      or exists (select 1 from disciplines where cover_key = j.value) or exists (select 1 from locations where schedule_image_key = j.value)
      or exists (select 1 from gallery_items where key = j.value) or exists (select 1 from testimonials where photo_key = j.value)
      or exists (select 1 from achievements where image_key = j.value)
      or exists (select 1 from settings where key = 'hero' and json_extract(value, '$.image_key') = j.value)`);
    const free = list.filter((k) => !used.some((u) => u.k === k));
    if (free.length) await env.MEDIA.delete([...free, ...free.map((k) => k + THUMB)]); // Delete the 800px thumbnail when present.
  } catch (e) {
    console.error('Dọn file R2 lỗi', list, e);
  }
}
