import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { THUMB } from '../../lib/site';

// Phục vụ ảnh/video public từ R2. Key do CMS sinh ra (không đoán được tên file gốc).
// Key không bao giờ bị ghi đè (mỗi lần upload một uuid mới) nhưng có thể bị XOÁ (vd. phụ huynh xin gỡ ảnh)
// → cache 1 ngày (edge + trình duyệt), không phải 1 năm, để ảnh đã xoá hết mở được trong tối đa 1 ngày.
export const GET: APIRoute = async ({ params, request, locals }) => {
  // Chỉ phục vụ thư mục public/ của bucket.
  if (!params.key?.startsWith('public/')) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' });

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
  // ?w=480: bản nhỏ (thẻ, lưới ảnh); chưa có thì trả ảnh gốc.
  const small = new URL(request.url).searchParams.get('w') === '480' ? await env.MEDIA.get(params.key + THUMB) : null;
  const obj = small ?? (await env.MEDIA.get(params.key));
  if (!obj) return new Response('Not found', { status: 404 });
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  const res = new Response(obj.body, { headers });
  locals.cfContext?.waitUntil(cache.put(request, res.clone()));
  return res;
};
