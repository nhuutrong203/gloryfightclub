import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { setTextOverrides } from './i18n';
import { getSite } from './lib/site';

// /media cũng phải chạy ở host CMS: ô xem trước ảnh trong CMS tải ảnh từ đây.
const CMS_PATH = /^\/(admin|api|media)(\/|$)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, host } = context.url;

  // CMS chỉ chạy ở host CMS; trang public chỉ chạy ở host public. Ở localhost thì cho cả hai.
  if (host === env.CMS_HOST && !CMS_PATH.test(pathname) && !pathname.startsWith('/_')) {
    return context.redirect('/admin', 302);
  }
  // Cả /en/admin: nếu không, bước rewrite /en/* bên dưới sẽ mở CMS ngay trên host public.
  const admin = host === env.PUBLIC_HOST && pathname.match(/^(?:\/en)?(\/admin(?:\/.*)?)$/);
  if (admin) return context.redirect(`https://${env.CMS_HOST}${admin[1]}`, 302);
  // Đăng nhập + dữ liệu học viên chỉ ở host CMS (host public chỉ có /api/public).
  if (host === env.PUBLIC_HOST && /^\/api\/(admin|auth)(\/|$)/.test(pathname)) return new Response('Not found', { status: 404 });

  // Mục Tin tức đã thành Nhật ký lớp học: giữ link cũ (đã chia sẻ / Google đã lưu).
  const old = pathname.match(/^(\/en)?\/tin-tuc(\/.*)?$/);
  if (old) return context.redirect(`${old[1] ?? ''}/nhat-ky${old[2] ?? ''}${context.url.search}`, 301);

  // Thông tin chung + chữ giao diện thầy sửa trong CMS: nạp 1 lần trước khi render trang public (không cần cho API/ảnh).
  if (!CMS_PATH.test(pathname) && !pathname.startsWith('/_')) {
    context.locals.site = await getSite();
    setTextOverrides(context.locals.site.texts);
  }

  // /en/... dùng chung trang với bản tiếng Việt, chỉ đổi locals.lang.
  // shortcut: URL tiếng Anh giữ slug tiếng Việt (/en/hoc-phi); đổi sang slug tiếng Anh nếu cần SEO EN mạnh hơn.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    context.locals.lang = 'en';
    // Truyền URL (không phải chuỗi) để giữ ?co-so=, ?trang=… khi rewrite.
    const url = new URL(context.url);
    url.pathname = pathname.slice(3) || '/';
    return next(url);
  }
  context.locals.lang ??= 'vi';
  return next();
});
