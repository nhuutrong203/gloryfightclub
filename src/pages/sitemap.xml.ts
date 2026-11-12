import type { APIRoute } from 'astro';
import { publicCoaches, publicDisciplines, publishedSlugs } from '../lib/public';
import { href } from '../i18n';

const STATIC = ['/', '/gioi-thieu', '/mon-hoc', '/lich-hoc', '/huan-luyen-vien', '/hoc-phi', '/nhat-ky', '/thu-vien',
  '/cap-dai', '/thanh-tich', '/cam-nhan', '/hoi-dap', '/lien-he', '/dang-ky-hoc-thu'];

// shortcut: include the latest 1,000 posts; use a sitemap index if the archive exceeds that.
export const GET: APIRoute = async ({ site, locals }) => {
  const [disciplines, coaches, posts] = await Promise.all([publicDisciplines(), publicCoaches(), publishedSlugs(1000)]);
  const paths = [
    ...STATIC,
    ...(locals.site?.policy ? ['/quy-dinh'] : []),
    ...disciplines.map((d) => `/mon-hoc/${d.slug}`),
    ...coaches.map((c) => `/huan-luyen-vien/${c.slug}`),
    ...posts.map((p) => `/nhat-ky/${p.slug}`),
  ];
  const abs = (p: string) => new URL(p, site).href;
  const urls = paths.map((p) => `<url><loc>${abs(href(p, 'vi'))}</loc>`
    + `<xhtml:link rel="alternate" hreflang="vi" href="${abs(href(p, 'vi'))}"/>`
    + `<xhtml:link rel="alternate" hreflang="en" href="${abs(href(p, 'en'))}"/></url>`
    + `<url><loc>${abs(href(p, 'en'))}</loc>`
    + `<xhtml:link rel="alternate" hreflang="vi" href="${abs(href(p, 'vi'))}"/>`
    + `<xhtml:link rel="alternate" hreflang="en" href="${abs(href(p, 'en'))}"/></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
