import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Phục vụ ảnh/video public từ R2. Key do CMS sinh ra (không đoán được tên file gốc).
// Key không bao giờ bị ghi đè (mỗi lần upload một uuid mới) → cache vĩnh viễn ở edge Cloudflare.
export const GET: APIRoute = async ({ params, request, locals }) => {
  // Chỉ phục vụ thư mục public/ của bucket.
  if (!params.key?.startsWith('public/')) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' });

  // Video: trình duyệt (nhất là iPhone) xin từng đoạn (Range) để phát và tua → trả 206 từ R2, không qua Cache API.
  if (request.headers.has('range')) {
    const obj = await env.MEDIA.get(params.key, { range: request.headers });
    if (!obj) return new Response('Not found', { status: 404 });
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    const r = obj.range as { offset: number; length: number } | undefined;
    if (!r || !('body' in obj)) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${obj.size}` } });
    headers.set('content-range', `bytes ${r.offset}-${r.offset + r.length - 1}/${obj.size}`);
    headers.set('content-length', String(r.length));
    return new Response(obj.body, { status: 206, headers });
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const obj = await env.MEDIA.get(params.key);
  if (!obj) return new Response('Not found', { status: 404 });
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  const res = new Response(obj.body, { headers });
  locals.cfContext?.waitUntil(cache.put(request, res.clone()));
  return res;
};
