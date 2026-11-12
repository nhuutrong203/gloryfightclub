import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

// ───────── API ─────────
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const OFFLINE = 'Mất kết nối mạng — kiểm tra 4G / Wi-Fi rồi bấm lại (những gì đang gõ vẫn còn).';

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
      headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: 'same-origin',
    });
  } catch {
    // Turn fetch connection failures into a readable Vietnamese error.
    throw new ApiError(OFFLINE, 0);
  }
  const data: any = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/')) setTimeout(() => window.dispatchEvent(new Event('glory:logout')));
  if (!res.ok) throw new ApiError(data.error ?? `Lỗi ${res.status}`, res.status);
  return data as T;
}

/** Load on mount or path change and return data, error, loading, and reload. */
export function useApi<T = any>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!path });
  // Ignore stale responses after rapid search or month changes.
  const latest = useRef(0);
  const load = useCallback(() => {
    if (!path) return;
    const n = ++latest.current;
    setState((s) => ({ ...s, loading: true }));
    api<T>(path).then(
      (data) => n === latest.current && setState({ data, loading: false }),
      (e) => n === latest.current && setState({ error: e.message, loading: false }),
    );
  }, [path]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}

// CMS router
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  return () => { listeners.delete(fn); window.removeEventListener('popstate', fn); };
};
// Include the hash so the settings menu can highlight the current group.
export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname + location.search + location.hash);

// Unsaved changes
// The URL of the dirty form, or null.
let dirtyAt: string | null = null;
const LEAVE = 'Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?';
export const setDirty = (on: boolean) => { dirtyAt = on ? location.pathname + location.search : null; };
/** Mark edits dirty until saved. Leaving the form clears the flag. */
export function useDirty() {
  useEffect(() => () => setDirty(false), []);
  return setDirty;
}
if (typeof window !== 'undefined') {
  // Confirm browser or Android Back before the router runs. Restore the form if cancelled.
  window.addEventListener('popstate', () => {
    if (!dirtyAt) return;
    if (confirm(LEAVE)) dirtyAt = null;
    else history.pushState(null, '', dirtyAt);
  });
  window.addEventListener('beforeunload', (e) => { if (dirtyAt) e.preventDefault(); });
}

export function navigate(to: string, replace = false) {
  if (dirtyAt && !confirm(LEAVE)) return;
  dirtyAt = null;
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  listeners.forEach((fn) => fn());
  // Scroll to the target settings group when already on that page.
  const target = to.includes('#') && document.getElementById(to.split('#')[1]);
  if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
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

// Formatting
//  Keep the currency symbol with the amount using a nonbreaking space.
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

// Browser image compression and R2 upload
/** Resize phone photos to at most 1600px WebP. Upload already small images as they are. */
// Windows and Android Chrome may not decode iPhone HEIC files.
const isHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
export const HEIC = 'Ảnh HEIC của iPhone chưa mở được trên máy này — tải ảnh lên trực tiếp từ iPhone, hoặc đổi ảnh sang JPG rồi thử lại.';

async function shrink(file: File, maxSide: number, keepSmall = true): Promise<Blob> {
  if (keepSmall && file.size <= 400_000 && /^image\/(jpeg|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error(isHeic(file) ? HEIC : 'Không mở được ảnh này — thử ảnh khác (JPG, PNG) hoặc chụp màn hình ảnh rồi tải lên.');
  });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const encode = (type: string, q: number) =>
    new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Không nén được ảnh'))), type, q));
  const blob = await encode('image/webp', 0.82);
  // Fall back to JPEG if Safari cannot encode WebP.
  return blob.type === 'image/webp' ? blob : encode('image/jpeg', 0.85);
}

// Disable Save while uploads are pending so image keys are not lost.
let uploads = 0;
const uploadSubs = new Set<() => void>();
const setUploads = (d: number) => { uploads += d; uploadSubs.forEach((f) => f()); };
export const useUploading = () => useSyncExternalStore((f) => { uploadSubs.add(f); return () => uploadSubs.delete(f); }, () => uploads > 0);

/** Upload an image, report progress from 0 to 100, and return its R2 key. */
export async function uploadImage(file: File, onProgress?: (pct: number) => void, maxSide = 1600): Promise<string> {
  if (isHeic(file) && !file.type) throw new Error(HEIC); // Windows may omit the MIME type for HEIC files.
  if (!file.type.startsWith('image/')) throw new Error('File này không phải ảnh');
  setUploads(1);
  try { return await send(file, onProgress, maxSide); } finally { setUploads(-1); }
}

const asFile = (blob: Blob) => new File([blob], blob.type === 'image/webp' ? 'image.webp' : 'image.jpg', { type: blob.type });
const asForm = (blob: Blob) => {
  const form = new FormData();
  form.append('file', asFile(blob));
  return form;
};

async function send(file: File, onProgress: ((pct: number) => void) | undefined, maxSide: number): Promise<string> {
  const form = asForm(await shrink(file, maxSide));
  // Upload the thumbnail with the original so the server generates both keys.
  try {
    const small = await shrink(file, 800, false);
    if (small.size <= 400_000) form.append('thumbnail', asFile(small));
  } catch (e) { console.warn('Không tạo được ảnh nhỏ', e); }
  return xhrUpload('/api/admin/upload', form, onProgress);
}

/** Use XHR to report upload progress and return the server-generated R2 key. */
function xhrUpload(url: string, body: Blob | FormData, onProgress?: (pct: number) => void, contentType?: string): Promise<string> {
  return new Promise((ok, fail) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (contentType) xhr.setRequestHeader('content-type', contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status === 401) window.dispatchEvent(new Event('glory:logout'));
      xhr.status < 300 && data.key ? ok(data.key) : fail(new Error(data.error ?? `Upload lỗi ${xhr.status}`));
    };
    xhr.onerror = () => fail(new Error('Mất mạng khi tải lên — thử lại'));
    xhr.send(body);
  });
}

export const MAX_VIDEO_MB = 95; // Cloudflare Workers allow requests up to 100 MB.
/** Stream the original video and return its R2 key. */
export async function uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<string> {
  if (!/^video\/(mp4|quicktime|webm)$/.test(file.type)) throw new Error('Chỉ nhận video MP4, MOV, WebM');
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Video ${Math.round(file.size / 1048576)}MB quá lớn (tối đa ${MAX_VIDEO_MB}MB) — quay ngắn hơn / 720p, hoặc đăng YouTube rồi dán link`);
  setUploads(1);
  try { return await xhrUpload('/api/admin/upload-video', file, onProgress, file.type); } finally { setUploads(-1); }
}

/** Upload three images at a time and report individual failures without stopping the batch. */
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
/** Read the public host from the server's meta tag when linking from the CMS. */
export function siteUrl(path = '/') {
  const [pub, cms] = (document.querySelector<HTMLMetaElement>('meta[name=glory-hosts]')?.content ?? '').split('|');
  return `${location.protocol}//${pub && location.host === cms ? pub : location.host}${path}`;
}

// Permissions
export type Me = { id: number; username: string; fullName: string; role: 'owner' | 'coach'; permissions: string[] };
export const can = (me: Me, p: string) => me.role === 'owner' || me.permissions.includes(p);
