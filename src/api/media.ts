import { env } from 'cloudflare:workers';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { THUMB } from '../lib/site';

/** Xoá file R2 không còn dùng (ảnh bị đổi/bỏ, bài hoặc mục bị xoá). Gọi SAU khi đã ghi DB.
 *  Chỉ xoá key không còn ở bảng nào. Mọi lỗi chỉ ghi log: việc lưu chính đã xong, không được báo lỗi theo.
 *  shortcut: file tải lên rồi bỏ form không lưu vẫn sót lại; cần dọn hết thì làm việc quét định kỳ. */
export async function deleteMedia(keys: (string | null | undefined)[]) {
  const list = [...new Set(keys.filter((k): k is string => !!k && k.startsWith('public/')))];
  if (!list.length) return;
  try {
    // 1 tham số JSON (json_each) thay cho danh sách dài (D1 tối đa 100 tham số);
    // EXISTS … OR thay cho UNION (D1 giới hạn số vế UNION trong một câu).
    const used = await db.all<{ k: string }>(sql`select j.value as k from json_each(${JSON.stringify(list)}) j where
      exists (select 1 from post_images where key = j.value) or exists (select 1 from coaches where photo_key = j.value)
      or exists (select 1 from disciplines where cover_key = j.value) or exists (select 1 from locations where schedule_image_key = j.value)
      or exists (select 1 from gallery_items where key = j.value) or exists (select 1 from testimonials where photo_key = j.value)
      or exists (select 1 from achievements where image_key = j.value)
      or exists (select 1 from settings where key = 'hero' and json_extract(value, '$.image_key') = j.value)`);
    const free = list.filter((k) => !used.some((u) => u.k === k));
    if (free.length) await env.MEDIA.delete([...free, ...free.map((k) => k + THUMB)]); // kèm bản nhỏ 800px (không có cũng không sao)
  } catch (e) {
    console.error('Dọn file R2 lỗi', list, e);
  }
}
