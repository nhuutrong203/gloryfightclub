import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Phục vụ ảnh public từ R2. Key do CMS sinh ra (không đoán được tên file gốc).
export const GET: APIRoute = async ({ params }) => {
  const obj = params.key ? await env.MEDIA.get(params.key) : null;
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
};
