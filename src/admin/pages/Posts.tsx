import { useEffect, useRef, useState } from 'react';
import { api, can, mediaUrl, navigate, toast, uploadImage, useApi, type Me } from '../lib';
import { A, Badge, Button, Empty, ErrorBox, Icon, LinkButton, Loading, Page, TextArea, TextInput, Toggle, confirmDanger } from '../ui';

type Post = { id: number; slug: string; title: string | null; titleEn: string | null; content: string; contentEn: string | null; publishedAt: number; isPublic: boolean; images: string[] };

/** Chuyển giữa timestamp và giá trị ô datetime-local (giờ máy người dùng). */
const toLocalInput = (ms: number) => { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocalInput = (s: string) => new Date(s).getTime();
const fmtDateTime = (ms: number) => new Date(ms).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

export function PostList() {
  const { data, error, reload } = useApi<Post[]>('/admin/posts');
  const now = Date.now();
  return (
    <Page title="Tin tức" actions={<LinkButton to="/admin/tin-tuc/moi" icon="plus" variant="primary">Đăng bài</LinkButton>}>
      <p className="-mt-2 mb-4 text-neutral-600">Nhật ký lớp học — đăng ảnh và vài dòng như bài Facebook.</p>
      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : data.length === 0 ? <Empty>Chưa có bài nào. Bấm “Đăng bài”.</Empty> : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
          {data.map((p) => (
            <li key={p.id}>
              <A to={`/admin/tin-tuc/${p.id}`} className="flex gap-3 p-3 hover:bg-neutral-50">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden bg-neutral-100">
                  {p.images[0] ? <img src={mediaUrl(p.images[0])} alt="" className="size-full object-cover" loading="lazy" /> : <Icon name="news" className="text-neutral-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="line-clamp-1">{p.title || p.content.slice(0, 80)}</b>
                  <p className="line-clamp-1 text-sm text-neutral-500">{p.title ? p.content : ''}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {!p.isPublic ? <Badge>Đang ẩn</Badge> : p.publishedAt > now ? <Badge tone="blue">Hẹn đăng {fmtDateTime(p.publishedAt)}</Badge> : <Badge tone="green">Đã đăng {fmtDateTime(p.publishedAt)}</Badge>}
                    {p.images.length > 0 && <Badge>{p.images.length} ảnh</Badge>}
                  </div>
                </div>
              </A>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function PostEdit({ id, me }: { id: string; me: Me }) {
  const isNew = id === 'moi';
  const list = useApi<Post[]>(isNew ? null : '/admin/posts');
  const existing = list.data?.find((p) => p.id === Number(id));
  const [form, setForm] = useState({ title: '', titleEn: '', content: '', contentEn: '', publishedAt: Date.now(), isPublic: true, images: [] as string[] });
  const [schedule, setSchedule] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    setForm({ title: existing.title ?? '', titleEn: existing.titleEn ?? '', content: existing.content, contentEn: existing.contentEn ?? '', publishedAt: existing.publishedAt, isPublic: existing.isPublic, images: existing.images });
    setSchedule(existing.publishedAt > Date.now());
    setShowEn(!!(existing.titleEn || existing.contentEn));
  }, [existing]);

  if (!isNew && list.error) return <Page title="Bài viết" back="/admin/tin-tuc"><ErrorBox message={list.error} /></Page>;
  if (!isNew && !existing) return list.data ? <Page title="Bài viết" back="/admin/tin-tuc"><Empty>Không tìm thấy bài.</Empty></Page> : <Loading />;

  const set = (k: keyof typeof form) => (v: any) => setForm((x) => ({ ...x, [k]: v }));

  async function addFiles(files: FileList) {
    const arr = [...files].slice(0, 20 - form.images.length);
    setUploading(arr.length);
    for (const f of arr) {
      try {
        const key = await uploadImage(f);
        setForm((x) => ({ ...x, images: [...x.images, key] }));
      } catch (e: any) { toast(e.message, 'err'); }
      setUploading((n) => n - 1);
    }
  }
  const move = (i: number, d: number) => setForm((x) => {
    const imgs = [...x.images];
    [imgs[i], imgs[i + d]] = [imgs[i + d], imgs[i]];
    return { ...x, images: imgs };
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return toast('Đợi ảnh tải lên xong đã', 'err');
    setBusy(true);
    const payload = { ...form, publishedAt: schedule ? form.publishedAt : isNew ? Date.now() : Math.min(form.publishedAt, Date.now()) };
    try {
      if (isNew) await api('/admin/posts', { body: payload });
      else await api(`/admin/posts/${id}`, { method: 'PUT', body: payload });
      toast(isNew ? (schedule ? 'Đã hẹn giờ đăng' : 'Đã đăng bài') : 'Đã lưu');
      navigate('/admin/tin-tuc', true);
    } catch (err: any) { toast(err.message, 'err'); setBusy(false); }
  }

  return (
    <Page title={isNew ? 'Đăng bài' : 'Sửa bài'} back="/admin/tin-tuc"
      actions={existing && existing.isPublic && existing.publishedAt <= Date.now() && <a href={`/tin-tuc/${existing.slug}`} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center gap-1 border border-neutral-300 bg-white px-3 font-semibold"><Icon name="external" /><span className="hidden sm:inline">Xem</span></a>}>
      <form onSubmit={save} className="space-y-5">
        {/* Ảnh */}
        <section className="border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Ảnh ({form.images.length}/20)</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {form.images.map((k, i) => (
              <div key={k} className="group relative aspect-square overflow-hidden bg-neutral-100">
                <img src={mediaUrl(k)} alt={`Ảnh ${i + 1}`} className="size-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 bg-glory px-1.5 text-xs font-semibold text-white">Ảnh bìa</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-9 place-items-center text-white disabled:opacity-30 cursor-pointer" aria-label="Đưa lên trước"><Icon name="back" className="size-4" /></button>
                  <button type="button" onClick={() => set('images')(form.images.filter((x) => x !== k))} className="grid size-9 place-items-center text-white cursor-pointer" aria-label="Bỏ ảnh"><Icon name="trash" className="size-4" /></button>
                  <button type="button" disabled={i === form.images.length - 1} onClick={() => move(i, 1)} className="grid size-9 place-items-center text-white disabled:opacity-30 cursor-pointer" aria-label="Đưa ra sau"><Icon name="chevron" className="size-4" /></button>
                </div>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => <div key={`u${i}`} className="grid aspect-square place-items-center bg-neutral-100"><span className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-glory" /></div>)}
            {form.images.length + uploading < 20 && (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-square place-items-center border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-ink hover:text-ink cursor-pointer">
                <span className="flex flex-col items-center gap-1 text-sm font-semibold"><Icon name="plus" className="size-7" />Thêm ảnh</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </section>

        <section className="space-y-4 border border-neutral-200 bg-white p-4">
          <TextInput label="Tiêu đề (không bắt buộc)" value={form.title} onChange={(e) => set('title')(e.target.value)} />
          <TextArea label="Nội dung *" required rows={6} value={form.content} onChange={set('content')} help="Viết tự nhiên như bài Facebook. Xuống dòng được giữ nguyên." />
          <button type="button" onClick={() => setShowEn(!showEn)} className="text-sm font-semibold underline cursor-pointer">{showEn ? 'Ẩn bản tiếng Anh' : '+ Thêm bản tiếng Anh (không bắt buộc)'}</button>
          {showEn && (
            <div className="space-y-4 border-l-4 border-neutral-200 pl-3">
              <TextInput label="Title (English)" value={form.titleEn} onChange={(e) => set('titleEn')(e.target.value)} />
              <TextArea label="Content (English)" rows={5} value={form.contentEn} onChange={set('contentEn')} />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <Toggle label="Hiện trên website" checked={form.isPublic} onChange={set('isPublic')} help={form.isPublic ? undefined : 'Bài đang ẩn, khách không thấy'} />
          <Toggle label="Hẹn giờ đăng" checked={schedule} onChange={(v) => { setSchedule(v); if (v && form.publishedAt <= Date.now()) set('publishedAt')(Date.now() + 3600_000); }} />
          {schedule && <TextInput label="Thời gian đăng" type="datetime-local" required value={toLocalInput(form.publishedAt)} onChange={(e) => e.target.value && set('publishedAt')(fromLocalInput(e.target.value))} />}
        </section>

        <div className="sticky bottom-20 z-10 flex gap-3 lg:bottom-4">
          <Button type="submit" loading={busy} disabled={uploading > 0} icon="check" className="flex-1 sm:flex-none">{isNew ? (schedule ? 'Hẹn giờ đăng' : 'Đăng bài') : 'Lưu'}</Button>
          {!isNew && can(me, 'delete') && (
            <Button type="button" variant="danger" icon="trash" onClick={async () => {
              if (!confirmDanger('Xoá bài viết này?')) return;
              try { await api(`/admin/posts/${id}`, { method: 'DELETE' }); toast('Đã xoá'); navigate('/admin/tin-tuc', true); } catch (e: any) { toast(e.message, 'err'); }
            }}>Xoá</Button>
          )}
        </div>
      </form>
    </Page>
  );
}
