import { asc } from 'drizzle-orm';
import { db, schema } from '../db';
import type { TextOverrides } from '../i18n';

export type Policy = { fees: string | null; fees_en?: string | null; safety: string | null; safety_en?: string | null; updated?: string };

export type Club = {
  name: string;
  slogan: string;
  tagline: string;
  tagline_en?: string;
  hotlines: string[];
  zalo: string;
  facebook?: string;
  instagram?: string;
};

/** Thông tin chung dùng ở mọi trang public (header, footer, nút gọi/Zalo).
 *  Middleware gọi 1 lần mỗi request và để ở Astro.locals.site — trang / component đọc từ đó, không gọi lại. */
export async function getSite() {
  const [rows, locations] = await Promise.all([
    db.select().from(schema.settings),
    db.select().from(schema.locations).orderBy(asc(schema.locations.sort)),
  ]);
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, any>;
  // policy: null khi chưa có chữ nào → trang /quy-dinh, link chân trang và ô đồng ý ở form học thử cùng ẩn.
  const policy = settings.policy as Policy | undefined;
  return { club: settings.club as Club, hero: settings.hero ?? {}, texts: settings.texts as TextOverrides | undefined, policy: policy?.fees || policy?.safety ? policy : null, locations };
}

export const telHref = (phone: string) => `tel:${phone.replace(/\D/g, '')}`;
export const mediaUrl = (key: string | null | undefined) => (key ? `/media/${key}` : null);
/** Bản nhỏ 800px của ảnh (lưu cạnh ảnh gốc: `<key>.w800`, CMS tạo khi upload) cho thẻ / lưới ảnh.
 *  800px (không phải 480): thẻ HLV trên máy tính rộng ~500px → 480px bị mờ; 800 vẫn nhẹ hơn ảnh gốc nhiều.
 *  Chưa có bản nhỏ (ảnh cũ) thì /media tự trả ảnh gốc → không bao giờ vỡ ảnh. Ảnh lớn / mở lightbox vẫn dùng mediaUrl. */
export const THUMB_W = 800; // đổi số này thì đổi cả shrink(file, 800) trong src/admin/lib.ts và tạo lại bản nhỏ cho ảnh cũ
export const THUMB = `.w${THUMB_W}`;
export const thumbUrl = (key: string | null | undefined) => (key ? `/media/${key}?w=${THUMB_W}` : null);
/** srcset cho ảnh có thể hiện to hơn 800px điểm ảnh (màn hình nét): trình duyệt tự chọn ảnh gốc khi cần. */
export const thumbSrcset = (key: string | null | undefined) => (key ? `/media/${key}?w=${THUMB_W} ${THUMB_W}w, /media/${key} 1600w` : undefined);
