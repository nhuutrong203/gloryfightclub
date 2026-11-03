import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { db, schema } from './db';
import { setTextOverrides, type TextOverrides } from './i18n';

// /media cũng phải chạy ở host CMS: ô xem trước ảnh trong CMS tải ảnh từ đây.
const CMS_PATH = /^\/(admin|api|media)(\/|$)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, host } = context.url;

  // CMS chỉ chạy ở host CMS; trang public chỉ chạy ở host public. Ở localhost thì cho cả hai.
  if (host === env.CMS_HOST && !CMS_PATH.test(pathname) && !pathname.startsWith('/_')) {
    return context.redirect('/admin', 302);
  }
  if (host === env.PUBLIC_HOST && pathname.startsWith('/admin')) {
    return context.redirect(`https://${env.CMS_HOST}${pathname}`, 302);
  }

  // Mục Tin tức đã thành Nhật ký lớp học: giữ link cũ (đã chia sẻ / Google đã lưu).
  const old = pathname.match(/^(\/en)?\/tin-tuc(\/.*)?$/);
  if (old) return context.redirect(`${old[1] ?? ''}/nhat-ky${old[2] ?? ''}${context.url.search}`, 301);

  // Chữ giao diện thầy sửa trong CMS: nạp trước khi render trang public (không cần cho API/ảnh).
  if (!CMS_PATH.test(pathname) && !pathname.startsWith('/_')) {
    const row = await db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, 'texts')).get();
    setTextOverrides(row?.value as TextOverrides | undefined);
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
