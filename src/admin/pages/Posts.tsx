import { useEffect, useRef, useState } from 'react';
import { MAX_VIDEO_MB, api, can, mediaUrl, navigate, siteUrl, toast, uploadMany, uploadVideo, useApi, useDirty, type Me } from '../lib';
import { A, Badge, Button, Empty, ErrorBox, Icon, LinkButton, Loading, Page, TextInput, Toggle, ViewOnSite, confirmDanger, inputCls } from '../ui';
import { RichEditor } from '../RichEditor';
import { textToHtml, toText } from '../../lib/html';
import { youtubeId } from '../../lib/util';

// Nhật ký lớp học: mỗi buổi tập một bài — chữ có định dạng, nhiều ảnh, video (tải lên hoặc link YouTube).

type Media = { type: 'image' | 'video' | 'youtube'; key: string };
type Post = { id: number; slug: string; title: string | null; titleEn: string | null; content: string; contentEn: string | null; format: 'text' | 'html'; publishedAt: number; isPublic: boolean; media: Media[] };

const MAX_MEDIA = 24;

/** Chuyển giữa timestamp và giá trị ô datetime-local (giờ máy người dùng). */
const toLocalInput = (ms: number) => { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocalInput = (s: string) => new Date(s).getTime();
const fmtDateTime = (ms: number) => new Date(ms).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const plain = (p: Post) => (p.format === 'html' ? toText(p.content) : p.content);

/** Ô xem trước 1 ảnh / video / YouTube (dùng ở danh sách và form). */
function Thumb({ m, className = '' }: { m: Media; className?: string }) {
  if (m.type === 'image') return <img src={mediaUrl(m.key)} alt="" loading="lazy" className={`size-full object-cover ${className}`} />;
  return (
    <span className={`relative block size-full bg-ink ${className}`}>
      {m.type === 'video'
        ? <video src={`${mediaUrl(m.key)}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
        : <img src={`https://i.ytimg.com/vi/${youtubeId(m.key)}/mqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover" />}
      <span className="absolute inset-0 grid place-items-center"><span className="grid size-9 place-items-center rounded-full bg-black/70 text-white"><Icon name="play" className="size-4" /></span></span>
      {m.type === 'youtube' && <span className="absolute right-1 top-1 bg-red-600 px-1 text-[10px] font-bold text-white">YouTube</span>}
    </span>
  );
}

export function PostList() {
  const [page, setPage] = useState(1);
  const { data: res, error, reload } = useApi<{ page: number; hasMore: boolean; rows: Post[] }>(`/admin/posts?page=${page}`);
  const data = res?.rows;
  const now = Date.now();
  const count = (p: Post, t: Media['type'] | 'videos') => p.media.filter((m) => (t === 'videos' ? m.type !== 'image' : m.type === t)).length;
  return (
    <Page title="Nhật ký lớp" back="/admin/them" actions={<><ViewOnSite href={siteUrl('/nhat-ky')} /><LinkButton to="/admin/tin-tuc/moi" icon="plus" variant="primary">Viết nhật ký</LinkButton></>}>
      <p className="-mt-2 mb-4 text-neutral-600">Mỗi buổi tập một trang nhật ký — ảnh, video và vài dòng kể lại buổi tập cho khách thấy lớp mình vừa tập khỏe vừa vui.</p>
      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : data.length === 0 ? <Empty>Chưa có trang nhật ký nào. Bấm “Viết nhật ký”.</Empty> : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
          {data.map((p) => (
            <li key={p.id}>
              <A to={`/admin/tin-tuc/${p.id}`} className="flex gap-3 p-3 hover:bg-neutral-50">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden bg-neutral-100">
                  {p.media[0] ? <Thumb m={p.media[0]} /> : <Icon name="news" className="text-neutral-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="line-clamp-1">{p.title || plain(p).slice(0, 80) || 'Nhật ký không tiêu đề'}</b>
                  <p className="line-clamp-1 text-sm text-neutral-500">{p.title ? plain(p) : ''}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {!p.isPublic ? <Badge>Đang ẩn</Badge> : p.publishedAt > now ? <Badge tone="blue">Hẹn đăng {fmtDateTime(p.publishedAt)}</Badge> : <Badge tone="green">{fmtDateTime(p.publishedAt)}</Badge>}
                    {count(p, 'image') > 0 && <Badge>{count(p, 'image')} ảnh</Badge>}
                    {count(p, 'videos') > 0 && <Badge>{count(p, 'videos')} video</Badge>}
                  </div>
                </div>
              </A>
            </li>
          ))}
        </ul>
      )}
      {res && (page > 1 || res.hasMore) && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Mới hơn</Button>
          <span className="text-sm">Trang {page}</span>
          <Button variant="ghost" disabled={!res.hasMore} onClick={() => setPage(page + 1)}>Cũ hơn</Button>
        </div>
      )}
    </Page>
  );
}

export function PostEdit({ id, me }: { id: string; me: Me }) {
  const isNew = id === 'moi';
  const list = useApi<Post>(isNew ? null : `/admin/posts/${id}`);
  const existing = list.data;
  const [form, setForm] = useState({ title: '', titleEn: '', content: '', contentEn: '', publishedAt: Date.now(), isPublic: true, media: [] as Media[] });
  const [pickDate, setPickDate] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [videoPct, setVideoPct] = useState<number | null>(null);
  const [yt, setYt] = useState<string | null>(null); // ô dán link YouTube (null = đang ẩn)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const markDirty = useDirty();
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    const html = (s: string | null) => (!s ? '' : existing.format === 'html' ? s : textToHtml(s)); // bài cũ chữ thường → mở được trong trình soạn thảo
    setForm({ title: existing.title ?? '', titleEn: existing.titleEn ?? '', content: html(existing.content), contentEn: html(existing.contentEn), publishedAt: existing.publishedAt, isPublic: existing.isPublic, media: existing.media });
    setPickDate(existing.publishedAt > Date.now());
    setShowEn(!!(existing.titleEn || existing.contentEn));
  }, [existing]);

  if (!isNew && list.error) return <Page title="Nhật ký" back="/admin/tin-tuc"><ErrorBox message={list.error === 'Not found' ? 'Không tìm thấy bài.' : list.error} /></Page>;
  if (!isNew && !existing) return <Loading />;

  const set = (k: keyof typeof form) => (v: any) => { setForm((x) => ({ ...x, [k]: v })); markDirty(true); };
  const add = (m: Media) => { setForm((x) => ({ ...x, media: [...x.media, m] })); markDirty(true); };
  const room = MAX_MEDIA - form.media.length - uploading - (videoPct !== null ? 1 : 0);

  async function addImages(files: FileList) {
    const arr = [...files].slice(0, Math.max(0, room));
    setUploading(arr.length);
    markDirty(true);
    await uploadMany(arr, (key) => add({ type: 'image', key }), () => setUploading((n) => n - 1));
  }
  async function addVideo(file: File) {
    setVideoPct(0);
    markDirty(true);
    try { add({ type: 'video', key: await uploadVideo(file, setVideoPct) }); toast('Đã tải video lên'); }
    catch (e: any) { toast(e.message, 'err'); }
    finally { setVideoPct(null); }
  }
  function addYoutube() {
    if (!youtubeId(yt)) return toast('Link YouTube chưa đúng (vd: https://youtu.be/…)', 'err');
    add({ type: 'youtube', key: yt!.trim() });
    setYt(null);
  }
  const move = (i: number, d: number) => { markDirty(true); setForm((x) => {
    const m = [...x.media];
    [m[i], m[i + d]] = [m[i + d], m[i]];
    return { ...x, media: m };
  }); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploading || videoPct !== null) return setErr('Đợi ảnh / video tải lên xong đã');
    if (!toText(form.content) && !form.media.length) return setErr('Viết vài dòng hoặc thêm ảnh / video');
    setBusy(true);
    setErr('');
    const payload = { ...form, publishedAt: pickDate ? form.publishedAt : isNew ? Date.now() : Math.min(form.publishedAt, Date.now()) };
    try {
      if (isNew) await api('/admin/posts', { body: payload });
      else await api(`/admin/posts/${id}`, { method: 'PUT', body: payload });
      markDirty(false);
      toast(isNew ? (payload.publishedAt > Date.now() ? 'Đã hẹn giờ đăng' : 'Đã đăng nhật ký') : 'Đã lưu');
      navigate('/admin/tin-tuc', true);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const future = pickDate && form.publishedAt > Date.now();
  return (
    <Page title={isNew ? 'Viết nhật ký' : 'Sửa nhật ký'} back="/admin/tin-tuc"
      actions={existing && existing.isPublic && existing.publishedAt <= Date.now() && <a href={siteUrl(`/nhat-ky/${existing.slug}`)} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center gap-1 border border-neutral-300 bg-white px-3 font-semibold"><Icon name="external" /><span className="hidden sm:inline">Xem</span></a>}>
      <form onSubmit={save} className="space-y-5">
        <section className="space-y-4 border border-neutral-200 bg-white p-4">
          <TextInput label="Tiêu đề (không bắt buộc)" placeholder="Vd: Buổi sparring tối thứ 6 cháy hết mình" value={form.title} onChange={(e) => set('title')(e.target.value)} />
          <RichEditor label="Kể lại buổi tập" value={form.content} onChange={set('content')}
            placeholder="Hôm nay lớp tập gì? Ai tiến bộ? Khoảnh khắc vui nhất?…"
            help="Bôi đen chữ rồi bấm nút để in đậm, làm tiêu đề, danh sách… Dán chữ từ Facebook/Zalo vẫn được." />
        </section>

        {/* Ảnh & video */}
        <section className="border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Ảnh & video ({form.media.length}/{MAX_MEDIA}) <span className="font-normal text-neutral-500">· ô đầu tiên làm ảnh bìa</span></p>
          {(form.media.length > 0 || uploading > 0 || videoPct !== null) && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {form.media.map((m, i) => (
                <div key={m.key + i} className="relative aspect-square overflow-hidden bg-neutral-100">
                  <Thumb m={m} />
                  {i === 0 && <span className="absolute left-1 top-1 bg-glory px-1.5 text-xs font-semibold text-white">Ảnh bìa</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-11 place-items-center text-white disabled:opacity-30 cursor-pointer" aria-label="Đưa lên trước"><Icon name="back" className="size-4" /></button>
                    <button type="button" onClick={() => set('media')(form.media.filter((_, j) => j !== i))} className="grid size-11 place-items-center text-white cursor-pointer" aria-label="Bỏ"><Icon name="trash" className="size-4" /></button>
                    <button type="button" disabled={i === form.media.length - 1} onClick={() => move(i, 1)} className="grid size-11 place-items-center text-white disabled:opacity-30 cursor-pointer" aria-label="Đưa ra sau"><Icon name="chevron" className="size-4" /></button>
                  </div>
                </div>
              ))}
              {Array.from({ length: uploading }, (_, i) => <div key={`u${i}`} className="grid aspect-square place-items-center bg-neutral-100"><span className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-glory" /></div>)}
              {videoPct !== null && (
                <div className="grid aspect-square place-items-center bg-neutral-900 p-2 text-center text-xs font-semibold text-white">
                  <span>Đang tải video {videoPct}%<span className="mt-1 block h-1 bg-white/30"><span className="block h-full bg-glory" style={{ width: `${videoPct}%` }} /></span></span>
                </div>
              )}
            </div>
          )}
          {room > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => imgRef.current?.click()} className="flex min-h-16 flex-col items-center justify-center gap-1 border-2 border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-ink hover:text-ink cursor-pointer"><Icon name="image" />Thêm ảnh</button>
              <button type="button" disabled={videoPct !== null} onClick={() => vidRef.current?.click()} className="flex min-h-16 flex-col items-center justify-center gap-1 border-2 border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-ink hover:text-ink disabled:opacity-50 cursor-pointer"><Icon name="video" />Thêm video</button>
              <button type="button" onClick={() => setYt(yt === null ? '' : null)} className="flex min-h-16 flex-col items-center justify-center gap-1 border-2 border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-ink hover:text-ink cursor-pointer"><Icon name="play" />Link YouTube</button>
            </div>
          )}
          {yt !== null && (
            <div className="mt-3 flex gap-2">
              <input autoFocus type="url" inputMode="url" placeholder="https://youtu.be/…" aria-label="Link YouTube" className={inputCls} value={yt}
                onChange={(e) => setYt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addYoutube(); } }} />
              <Button type="button" onClick={addYoutube}>Thêm</Button>
            </div>
          )}
          <p className="mt-2 text-sm text-neutral-500">Video tải lên tối đa {MAX_VIDEO_MB}MB (khoảng 1–2 phút 720p). Video dài hơn: đăng YouTube rồi dán link. iPhone: Cài đặt → Camera → Định dạng → <b>Tương thích nhất</b> để máy nào cũng xem được.</p>
          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ''; }} />
          <input ref={vidRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addVideo(f); e.target.value = ''; }} />
        </section>

        <section className="space-y-4 border border-neutral-200 bg-white p-4">
          <button type="button" onClick={() => setShowEn(!showEn)} className="text-sm font-semibold underline cursor-pointer">{showEn ? 'Ẩn bản tiếng Anh' : '+ Thêm bản tiếng Anh (không bắt buộc)'}</button>
          {showEn && (
            <div className="space-y-4">
              <TextInput label="Title (English)" value={form.titleEn} onChange={(e) => set('titleEn')(e.target.value)} />
              <RichEditor label="Content (English)" value={form.contentEn} onChange={set('contentEn')} help="Bỏ trống thì trang tiếng Anh hiện bản tiếng Việt." />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <Toggle label="Hiện trên website" checked={form.isPublic} onChange={set('isPublic')} help={form.isPublic ? undefined : 'Bài đang ẩn, khách không thấy'} />
          <Toggle label="Chọn ngày đăng khác" help="Ghi lại buổi tập hôm trước, hoặc hẹn giờ đăng sau" checked={pickDate}
            onChange={(v) => { setPickDate(v); markDirty(true); }} />
          {pickDate && <TextInput label="Ngày giờ của buổi tập / giờ đăng" type="datetime-local" required value={toLocalInput(form.publishedAt)} onChange={(e) => e.target.value && set('publishedAt')(fromLocalInput(e.target.value))}
            help={future ? 'Giờ ở tương lai → bài tự hiện lên web đúng giờ đó' : undefined} />}
        </section>

        <div className="sticky bottom-20 z-10 space-y-2 lg:bottom-4">
          {err && <ErrorBox message={err} />}
          <div className="flex gap-3">
            <Button type="submit" loading={busy} disabled={uploading > 0 || videoPct !== null} icon="check" className="flex-1 sm:flex-none">{isNew ? (future ? 'Hẹn giờ đăng' : 'Đăng nhật ký') : 'Lưu'}</Button>
            {!isNew && can(me, 'delete') && (
              <Button type="button" variant="danger" icon="trash" onClick={async () => {
                if (!confirmDanger('Xoá trang nhật ký này?')) return;
                try { await api(`/admin/posts/${id}`, { method: 'DELETE' }); markDirty(false); toast('Đã xoá'); navigate('/admin/tin-tuc', true); } catch (e: any) { toast(e.message, 'err'); }
              }}>Xoá</Button>
            )}
          </div>
        </div>
      </form>
    </Page>
  );
}
