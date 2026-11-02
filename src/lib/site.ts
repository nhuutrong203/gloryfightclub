import { asc } from 'drizzle-orm';
import { db, schema } from '../db';

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

/** Thông tin chung dùng ở mọi trang public (header, footer, nút gọi/Zalo). */
export async function getSite() {
  const [rows, locations] = await Promise.all([
    db.select().from(schema.settings),
    db.select().from(schema.locations).orderBy(asc(schema.locations.sort)),
  ]);
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, any>;
  return { club: settings.club as Club, hero: settings.hero ?? {}, locations };
}

export const telHref = (phone: string) => `tel:${phone.replace(/\D/g, '')}`;
export const mediaUrl = (key: string | null | undefined) => (key ? `/media/${key}` : null);
