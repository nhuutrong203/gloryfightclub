import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Phục vụ ảnh public từ R2. Key do CMS sinh ra (không đoán được tên file gốc).
// Key không bao giờ bị ghi đè (mỗi lần upload một uuid mới) → cache vĩnh viễn ở edge Cloudflare.
export const GET: APIRoute = async ({ params, request, locals }) => {
  // Chỉ phục vụ thư mục public/ của bucket.
  if (!params.key?.startsWith('public/')) return new Response('Not found', { status: 404 });
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const obj = await env.MEDIA.get(params.key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  const res = new Response(obj.body, { headers });
  locals.cfContext?.waitUntil(cache.put(request, res.clone()));
  return res;
};
