import { asc } from 'drizzle-orm';
import { db, schema } from '../db';
import type { TextOverrides } from '../i18n';

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
  return { club: settings.club as Club, hero: settings.hero ?? {}, texts: settings.texts as TextOverrides | undefined, locations };
}

export const telHref = (phone: string) => `tel:${phone.replace(/\D/g, '')}`;
export const mediaUrl = (key: string | null | undefined) => (key ? `/media/${key}` : null);
