import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { setTextOverrides } from './i18n';
import { getSite } from './lib/site';

// Serve media on the CMS host for image previews.
const CMS_PATH = /^\/(admin|api|media)(\/|$)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, host } = context.url;

  // Separate the public and CMS hosts while allowing both on localhost.
  if (host === env.CMS_HOST && !CMS_PATH.test(pathname) && !pathname.startsWith('/_')) {
    return context.redirect('/admin', 302);
  }
  // Match the English prefix before rewriting so it cannot open the CMS on the public host.
  const admin = host === env.PUBLIC_HOST && pathname.match(/^(?:\/en)?(\/admin(?:\/.*)?)$/);
  if (admin) return context.redirect(`https://${env.CMS_HOST}${admin[1]}`, 302);
  // Block login and administrative APIs on the public host.
  if (host === env.PUBLIC_HOST && /^\/api\/(admin|auth)(\/|$)/.test(pathname)) return new Response('Not found', { status: 404 });

  // Redirect saved news links to the class diary.
  const old = pathname.match(/^(\/en)?\/tin-tuc(\/.*)?$/);
  if (old) return context.redirect(`${old[1] ?? ''}/nhat-ky${old[2] ?? ''}${context.url.search}`, 301);

  // Load shared site data once for public pages, skipping API and media requests.
  if (!CMS_PATH.test(pathname) && !pathname.startsWith('/_')) {
    context.locals.site = await getSite();
    setTextOverrides(context.locals.site.texts);
  }

  // Reuse the Vietnamese page with English locals for /en paths.
  // shortcut: keep Vietnamese slugs on English pages until English SEO requires separate paths.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    context.locals.lang = 'en';
    // Pass a URL to retain query parameters across the rewrite.
    const url = new URL(context.url);
    url.pathname = pathname.slice(3) || '/';
    return next(url);
  }
  context.locals.lang ??= 'vi';
  return next();
});
