import { asc, inArray } from 'drizzle-orm';
import { db, schema } from '../db';
import type { TextOverrides } from '../i18n';

export type PolicyGroup = { id: string; title: string; title_en?: string; text: string; text_en?: string };
export type Policy = { fees: string | null; fees_en?: string | null; safety: string | null; safety_en?: string | null; groups?: PolicyGroup[]; updated?: string };

export function hasPolicy(policy: Policy | undefined) {
  return !!(policy?.fees || policy?.fees_en || policy?.safety || policy?.safety_en || policy?.groups?.length);
}

export function policyParts(policy: Policy, lang: 'vi' | 'en', feesTitle: string, safetyTitle: string) {
  const pick = (vi: string | null, en?: string | null) => (lang === 'en' ? en || vi : vi || en);
  return [
    { id: 'hoc-phi', title: feesTitle, text: pick(policy.fees, policy.fees_en) },
    { id: 'an-toan', title: safetyTitle, text: pick(policy.safety, policy.safety_en) },
    ...(policy.groups ?? []).map((group) => ({
      id: `quy-dinh-${group.id}`,
      title: pick(group.title, group.title_en),
      text: pick(group.text, group.text_en),
    })),
  ].filter((part) => part.text);
}

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

/** Shared club settings for public pages and contact actions.
 *  Middleware loads these once per request into Astro.locals.site. */
export async function getSite() {
  const [rows, locations] = await Promise.all([
    db.select().from(schema.settings).where(inArray(schema.settings.key, ['club', 'hero', 'texts', 'policy'])),
    db.select().from(schema.locations).orderBy(asc(schema.locations.sort)),
  ]);
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, any>;
  // Hide the rules page link and trial consent when no rules are configured.
  const policy = settings.policy as Policy | undefined;
  return { club: settings.club as Club, hero: settings.hero ?? {}, texts: settings.texts as TextOverrides | undefined, policy: hasPolicy(policy) ? policy! : null, locations };
}

export const telHref = (phone: string) => `tel:${phone.replace(/\D/g, '')}`;
export const mediaUrl = (key: string | null | undefined) => (key ? `/media/${key}` : null);
/** Use the CMS-generated 800px thumbnail for cards and grids.
 *  An 800px thumbnail keeps wide desktop coach cards sharp.
 *  The media route falls back to the original. Lightboxes use the original URL. */
export const THUMB_W = 800; // Keep this width in sync with the admin upload and regenerate old thumbnails if it changes.
export const THUMB = `.w${THUMB_W}`;
export const thumbUrl = (key: string | null | undefined) => (key ? `/media/${key}?w=${THUMB_W}` : null);
/** Let high-density displays select the original through srcset. */
export const thumbSrcset = (key: string | null | undefined) => (key ? `/media/${key}?w=${THUMB_W} ${THUMB_W}w, /media/${key} 1600w` : undefined);
