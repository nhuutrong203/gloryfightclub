import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { THUMB, THUMB_W } from '../../lib/site';

// Serve public R2 media under CMS-generated keys.
// Each upload gets a new key, but existing media can be deleted.
// Cache for one day so deleted media cannot remain available indefinitely.
export const GET: APIRoute = async ({ params, request, locals }) => {
  // Serve only the public prefix.
  if (!params.key?.startsWith('public/')) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' });

  // Serve byte ranges directly from R2 for video playback and seeking.
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
  // Request the 800px thumbnail, with the original as fallback.
  const wantSmall = new URL(request.url).searchParams.get('w') === String(THUMB_W);
  const small = wantSmall ? await env.MEDIA.get(params.key + THUMB) : null;
  const obj = small ?? (await env.MEDIA.get(params.key));
  if (!obj) return new Response('Not found', { status: 404 });
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  // Skip edge caching for thumbnail fallbacks so the actual thumbnail can replace them.
  const fallback = wantSmall && !small;
  if (fallback) headers.set('cache-control', 'public, max-age=300');
  const res = new Response(obj.body, { headers });
  if (!fallback) locals.cfContext?.waitUntil(cache.put(request, res.clone()));
  return res;
};
