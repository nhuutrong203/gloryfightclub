import type { Context, Next } from 'hono';
import { z, type ZodType } from 'zod';
import { can, type Permission } from '../lib/auth';
import type { Env } from '.';

// Use Vietnamese for default Zod validation messages.
z.config(z.locales.vi());

/** Require at least one listed permission. */
export const need = (...perms: Permission[]) => async (c: Context<Env>, next: Next) => {
  const u = c.get('user');
  if (!perms.some((p) => can(u, p))) return c.json({ error: 'Bạn không có quyền làm việc này' }, 403);
  await next();
};

export const ownerOnly = async (c: Context<Env>, next: Next) => {
  if (c.get('user').role !== 'owner') return c.json({ error: 'Chỉ chủ CLB được làm việc này' }, 403);
  await next();
};

/** Validate a JSON body and return either data or an error response.
 *  Map field keys to labels so errors use the names shown in the form. */
export async function body<T>(c: Context<any>, schema: ZodType<T>, labels: Record<string, string> = {}): Promise<[T, null] | [null, Response]> {
  const raw = await c.req.json().catch(() => null);
  const r = schema.safeParse(raw);
  if (r.success) return [r.data, null];
  return [null, c.json({ error: issueText(r.error.issues[0], labels) }, 400)];
}

export const issueText = (issue: z.core.$ZodIssue, labels: Record<string, string> = {}) => {
  const key = String(issue.path[0] ?? '');
  return key ? `${labels[key] ?? issue.path.join('.')}: ${issue.message}` : `Dữ liệu chưa hợp lệ: ${issue.message}`;
};

export const idParam = (c: Context<any>) => {
  const n = Number(c.req.param('id'));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Include a UTF-8 BOM so Excel displays Vietnamese correctly. */
export function csv(filename: string, header: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    const s = v == null ? '' : String(v);
    // Chặn công thức Excel (CSV injection) và escape dấu nháy.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const text = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  return new Response(text, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
