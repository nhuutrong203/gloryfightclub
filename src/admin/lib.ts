import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// ───────── API ─────────
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: 'same-origin',
  });
  const data: any = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/')) setTimeout(() => window.dispatchEvent(new Event('glory:logout')));
  if (!res.ok) throw new ApiError(data.error ?? `Lỗi ${res.status}`, res.status);
  return data as T;
}

/** Tải dữ liệu khi mount / khi path đổi; trả { data, error, loading, reload }. */
export function useApi<T = any>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!path });
  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    api<T>(path).then((data) => setState({ data, loading: false }), (e) => setState({ error: e.message, loading: false }));
  }, [path]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}

// ───────── Router (đủ dùng, không cần thư viện) ─────────
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  return () => { listeners.delete(fn); window.removeEventListener('popstate', fn); };
};
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname + location.search);
export function navigate(to: string, replace = false) {
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  listeners.forEach((fn) => fn());
  window.scrollTo(0, 0);
}
export const query = () => new URLSearchParams(location.search);

// ───────── Toast ─────────
type Toast = { id: number; text: string; kind: 'ok' | 'err' };
let toasts: Toast[] = [];
const toastSubs = new Set<() => void>();
export function toast(text: string, kind: Toast['kind'] = 'ok') {
  const t = { id: Date.now() + Math.random(), text, kind };
  toasts = [...toasts, t];
  toastSubs.forEach((f) => f());
  setTimeout(() => { toasts = toasts.filter((x) => x !== t); toastSubs.forEach((f) => f()); }, kind === 'err' ? 5000 : 2500);
}
export const useToasts = () => useSyncExternalStore((f) => { toastSubs.add(f); return () => toastSubs.delete(f); }, () => toasts);

// ───────── Định dạng ─────────
//  : không để chữ "đ" rớt xuống dòng riêng.
export const vnd = (n: number | null | undefined) => (n == null ? '' : `${n.toLocaleString('vi-VN')} đ`);
export const fmtDate = (d: string | number | null | undefined) => {
  if (d == null || d === '') return '';
  const x = typeof d === 'number' ? new Date(d) : new Date(`${d}T00:00:00`);
  return x.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
export const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
export const monthLabel = (m: string) => `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`;
export const shiftMonth = (m: string, delta: number) => {
  const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ───────── Ảnh: nén trên trình duyệt rồi upload R2 ─────────
/** Ảnh điện thoại 3–8MB → ≤1600px WebP (~150–300KB). Ảnh đã nhỏ thì gửi thẳng, khỏi nén lại. */
async function shrink(file: File, maxSide: number): Promise<Blob> {
  if (file.size <= 400_000 && /^image\/(jpeg|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const encode = (type: string, q: number) =>
    new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Không nén được ảnh'))), type, q));
  const blob = await encode('image/webp', 0.82);
  // Safari cũ không xuất được WebP (trả về PNG) → dùng JPEG.
  return blob.type === 'image/webp' ? blob : encode('image/jpeg', 0.85);
}

/** Upload 1 ảnh, báo tiến trình 0–100 qua onProgress. Trả key R2. */
export async function uploadImage(file: File, onProgress?: (pct: number) => void, maxSide = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('File này không phải ảnh');
  const blob = await shrink(file, maxSide);
  const form = new FormData();
  form.append('file', new File([blob], blob.type === 'image/webp' ? 'image.webp' : 'image.jpg', { type: blob.type }));
  // XHR thay fetch để có % upload (fetch chưa báo được tiến trình gửi lên).
  return new Promise((ok, fail) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status === 401) window.dispatchEvent(new Event('glory:logout'));
      xhr.status < 300 && data.key ? ok(data.key) : fail(new Error(data.error ?? `Upload lỗi ${xhr.status}`));
    };
    xhr.onerror = () => fail(new Error('Mất mạng khi tải ảnh lên — thử lại'));
    xhr.send(form);
  });
}
/** Tải nhiều ảnh, 3 ảnh song song; gọi onDone(key, i) khi từng ảnh xong (lỗi thì báo toast, không dừng cả loạt). */
export async function uploadMany(files: File[], onDone: (key: string, i: number) => void | Promise<void>, onSettled?: () => void) {
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try { await onDone(await uploadImage(files[i]), i); } catch (e: any) { toast(`${files[i].name}: ${e.message}`, 'err'); }
      onSettled?.();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

export const mediaUrl = (key: string | null | undefined) => (key ? `/media/${key}` : '');

// ───────── Quyền ─────────
export type Me = { id: number; username: string; fullName: string; role: 'owner' | 'coach'; permissions: string[] };
export const can = (me: Me, p: string) => me.role === 'owner' || me.permissions.includes(p);
