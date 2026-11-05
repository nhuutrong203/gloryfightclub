import { useEffect, useRef, useState } from 'react';
import { api, can, mediaUrl, navigate, siteUrl, toast, uploadMany, useApi, useDirty, useUploading, type Me } from '../lib';
import { A, Badge, Button, Chips, Empty, ErrorBox, Icon, ImageInput, LinkButton, Loading, MoneyInput, Page, Select, TextArea, TextInput, TimeInput, Toggle, ViewOnSite, confirmDanger, EnHint } from '../ui';
import { DAY_LABEL, RESOURCES, type Field, type ResourceKey } from '../resources';
import type { Lookups } from './Students';

// Trang danh sách + form sinh tự động từ src/admin/resources.ts.

const imageField = (res: ResourceKey) => RESOURCES[res].fields.find((f) => f.type === 'image')?.name;

export function ResourceList({ res, me }: { res: ResourceKey; me: Me }) {
  const r = RESOURCES[res];
  const { data, error, reload } = useApi<any[]>(`/admin/content/${res}`);
  const lk = useApi<Lookups>('/admin/lookups').data;
  const img = imageField(res);
  // Đổi thứ tự bằng nút ↑↓: hiện ngay trên màn hình, lỗi thì quay về thứ tự cũ.
  const reorder = r.orderBy === 'sort' && can(me, 'content');
  const [local, setLocal] = useState<any[] | null>(null);
  useEffect(() => setLocal(null), [data]);
  const list = local ?? data;
  async function move(i: number, d: number) {
    const next = [...list!];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setLocal(next);
    try { await api(`/admin/content/${res}/order`, { method: 'PUT', body: { ids: next.map((x) => x.id) } }); }
    catch (e: any) { toast(e.message, 'err'); setLocal(null); }
  }
  // Lớp: nhóm theo cơ sở. Cấp đai: nhóm theo môn, báo rõ môn nào không hiện trên web (giống trang Cấp đai).
  const groups: { title: string; note?: string; rows: any[] }[] = res === 'classes' && list && lk
    ? lk.locations.map((l) => ({ title: l.name, rows: list.filter((x) => x.locationId === l.id) }))
    : res === 'belts' && list && lk
      ? lk.disciplines.map((d) => ({ title: d.name, rows: list.filter((x) => x.disciplineId === d.id),
          note: !d.isPublic ? 'Không hiện trên web: môn này đang ẩn' : !d.hasBelts ? 'Không hiện trên web: bật "Có hệ thống đai" ở mục Môn học' : undefined }))
          .filter((g) => g.rows.length)
      : [{ title: '', rows: list ?? [] }];

  return (
    <Page title={r.title} back="/admin/them" actions={<>{r.publicPath && <ViewOnSite href={siteUrl(r.publicPath)} />}{can(me, 'content') && <LinkButton to={`/admin/noi-dung/${res}/moi`} icon="plus" variant={res === 'gallery' ? 'ghost' : 'primary'}>Thêm</LinkButton>}</>}>
      {res === 'gallery' && can(me, 'content') && <GalleryBulk onDone={reload} />}
      {error ? <ErrorBox message={error} retry={reload} /> : !list ? <Loading /> : list.length === 0 ? <Empty>Chưa có mục nào.</Empty> : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.title}>
              {g.title && <h2 className="mb-2 font-display text-xl uppercase">{g.title} <span className="text-neutral-400">({g.rows.length})</span></h2>}
              {g.note && <p className="-mt-1 mb-2 text-sm font-semibold text-amber-800">{g.note}</p>}
              {g.rows.length === 0 ? <Empty>Chưa có lớp — thêm lớp hoặc up ảnh lịch ở mục Cơ sở.</Empty> : (
                <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
                  {g.rows.map((row, i) => (
                    <li key={row.id} className="flex items-center">
                      <A to={`/admin/noi-dung/${res}/${row.id}`} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 p-3 hover:bg-neutral-50">
                        {img && (
                          <span className="grid size-12 shrink-0 place-items-center overflow-hidden bg-neutral-100">
                            {row[img] ? <img src={mediaUrl(row[img])} alt="" className="size-full object-cover" loading="lazy" /> : <Icon name="image" className="text-neutral-300" />}
                          </span>
                        )}
                        {res === 'belts' && <span className="size-8 shrink-0 border border-neutral-300" style={{ background: row.color }} aria-hidden="true" />}
                        <span className="min-w-0 flex-1">
                          <b className="line-clamp-1">{r.listTitle(row)}</b>
                          {r.listSub && <span className="line-clamp-1 text-sm text-neutral-500">{r.listSub(row)}</span>}
                        </span>
                        {row.isPublic === false && <Badge>Ẩn</Badge>}
                        {row.isActive === false && <Badge>Ngưng</Badge>}
                        {/* Lịch học trên web chỉ hiện tên HLV khi lớp đã gán HLV → nhắc thầy gán. */}
                        {res === 'classes' && !row.coachId && <Badge tone="amber">Chưa có HLV</Badge>}
                        {!reorder && <Icon name="chevron" className="text-neutral-400" />}
                      </A>
                      {reorder && (
                        <span className="flex shrink-0 border-l border-neutral-200">
                          <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-12 place-items-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-25 cursor-pointer disabled:cursor-default" aria-label={`Đưa "${r.listTitle(row)}" lên trên`}><Icon name="up" /></button>
                          <button type="button" disabled={i === g.rows.length - 1} onClick={() => move(i, 1)} className="grid size-12 place-items-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-25 cursor-pointer disabled:cursor-default" aria-label={`Đưa "${r.listTitle(row)}" xuống dưới`}><Icon name="down" /></button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}

const defaults = (fields: Field[]) => Object.fromEntries(fields.flatMap((f) => {
  const v = f.type === 'bool' ? f.name === 'isPublic' || f.name === 'isActive' : f.type === 'multi' ? [] : f.type === 'select' && f.options ? f.options[0].value : f.type === 'color' ? '#ffffff' : '';
  return f.en ? [[f.name, v], [`${f.name}En`, '']] : [[f.name, v]];
}));

export function ResourceEdit({ res, id, me }: { res: ResourceKey; id: string; me: Me }) {
  const r = RESOURCES[res];
  const isNew = id === 'moi';
  const list = useApi<any[]>(isNew ? null : `/admin/content/${res}`);
  const lk = useApi<Lookups>('/admin/lookups').data;
  const existing = list.data?.find((x) => x.id === Number(id));
  const [form, setForm] = useState<Record<string, any>>(() => defaults(r.fields));
  const [busy, setBusy] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const editable = can(me, 'content');
  const uploading = useUploading();
  const markDirty = useDirty();
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!existing) return;
    setForm(Object.fromEntries(Object.entries(defaults(r.fields)).map(([k, v]) => [k, existing[k] ?? (Array.isArray(v) ? [] : typeof v === 'boolean' ? v : '')])));
    setShowEn(r.fields.some((f) => f.en && existing[`${f.name}En`]));
  }, [existing]);

  if (!isNew && !existing) return list.error ? <ErrorBox message={list.error} /> : list.data ? <Page title={r.title} back={`/admin/noi-dung/${res}`}><Empty>Không tìm thấy.</Empty></Page> : <Loading />;
  if (!lk) return <Loading />;

  const refOptions = (key?: ResourceKey) => {
    const list = key === 'locations' ? lk.locations : key === 'disciplines' ? lk.disciplines : key === 'coaches' ? lk.coaches : [];
    return list.map((x) => ({ value: x.id, label: x.name }));
  };
  const set = (k: string) => (v: any) => { setForm((x) => ({ ...x, [k]: v })); markDirty(true); };
  const shown = (f: Field) => !f.showIf || f.showIf(form);
  const fail = (msg: string) => setErr(msg);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return toast('Đợi ảnh tải lên xong đã', 'err');
    const payload: Record<string, any> = {};
    for (const f of r.fields) {
      const v = form[f.name];
      payload[f.name] = !shown(f) ? null
        : f.type === 'number' || f.type === 'money' ? (v === '' || v == null ? null : Number(v))
        : f.type === 'select' && !f.options ? (v === '' || v == null ? null : Number(v))
        : v === '' ? null : v;
      if (f.en) payload[`${f.name}En`] = form[`${f.name}En`] || null;
    }
    const bad = r.check?.(payload);
    if (bad) return fail(bad);
    setErr('');
    setBusy(true);
    try {
      if (isNew) await api(`/admin/content/${res}`, { body: payload });
      else await api(`/admin/content/${res}/${id}`, { method: 'PUT', body: payload });
      markDirty(false);
      toast('Đã lưu');
      navigate(`/admin/noi-dung/${res}`, true);
    } catch (e: any) { fail(e.message); setBusy(false); }
  }

  const input = (f: Field, name = f.name, label = f.label) => {
    const val = form[name];
    switch (f.type) {
      case 'textarea': return <TextArea label={label} required={f.required && name === f.name} help={name === f.name ? f.help : undefined} value={val ?? ''} onChange={set(name)} rows={f.name === 'description' || f.name === 'bio' ? 6 : 4} />;
      case 'bool': return <Toggle label={label} checked={!!val} onChange={set(name)} />;
      case 'image': return <ImageInput label={label} value={val || null} onChange={set(name)} help={f.help} />;
      case 'number': return <TextInput label={label} type="number" inputMode="numeric" min={0} required={f.required} value={val ?? ''} onChange={(e) => set(name)(e.target.value)} help={f.help} />;
      case 'money': return <MoneyInput label={label} required={f.required} value={val == null ? '' : String(val)} onChange={set(name)} help={f.help} />;
      case 'time': return <TimeInput label={label} required={f.required} value={val ?? ''} onChange={set(name)} />;
      case 'date': return <TextInput label={label} type="date" value={val ?? ''} onChange={(e) => set(name)(e.target.value)} />;
      case 'url': return <TextInput label={label} type="url" inputMode="url" placeholder="https://…" value={val ?? ''} onChange={(e) => set(name)(e.target.value)} help={f.help} />;
      case 'color': return (
        <div className="flex items-end gap-3">
          <input type="color" aria-label={label} value={val || '#ffffff'} onChange={(e) => set(name)(e.target.value)} className="h-12 w-16 cursor-pointer border border-neutral-300" />
          <div className="flex-1"><TextInput label={label} value={val ?? ''} onChange={(e) => set(name)(e.target.value)} pattern="#[0-9a-fA-F]{6}" /></div>
        </div>
      );
      case 'select': return <Select label={label} required={f.required} value={val} onChange={set(name)} placeholder={f.options ? undefined : f.required ? 'Chọn…' : 'Không chọn'} options={f.options ?? refOptions(f.ref)} help={f.help} />;
      case 'multi': return <Chips label={label} value={val ?? []} onChange={set(name)} options={refOptions(f.ref)} />;
      case 'days': return (
        <Chips label={label} value={[...(val ?? '')]} onChange={(arr: string[]) => set(name)(arr.sort().join(''))}
          options={Object.entries(DAY_LABEL).map(([v, l]) => ({ value: v, label: l }))} help="246 = T2·T4·T6 · 357 = T3·T5·T7" />
      );
      default: return <TextInput label={label} required={f.required && name === f.name} value={val ?? ''} onChange={(e) => set(name)(e.target.value)} help={name === f.name ? f.help : undefined} />;
    }
  };

  const hasEn = r.fields.some((f) => f.en);
  return (
    <Page title={isNew ? `Thêm: ${r.title}` : r.listTitle(existing)} back={`/admin/noi-dung/${res}`}
      actions={!isNew && r.publicPath && <>
        {res === 'locations' && <ViewOnSite label="Lịch" href={siteUrl(`/lich-hoc?co-so=${existing.id}`)} />}
        <ViewOnSite label="Xem" href={siteUrl(existing.slug ? `${r.publicPath}/${existing.slug}` : r.publicPath)} />
      </>}>
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={!editable} className="space-y-4 border border-neutral-200 bg-white p-4">
          {r.fields.filter(shown).map((f) => <div key={f.name}>{input(f)}</div>)}
        </fieldset>
        {hasEn && (
          <section className="border border-neutral-200 bg-white p-4">
            <button type="button" onClick={() => setShowEn(!showEn)} className="flex w-full items-center justify-between font-semibold cursor-pointer" aria-expanded={showEn}>
              English version (không bắt buộc)<Icon name={showEn ? 'x' : 'plus'} />
            </button>
            {showEn && (
              <fieldset disabled={!editable} className="mt-4 space-y-4">
                <EnHint />
                {r.fields.filter((f) => f.en).map((f) => <div key={f.name}>{input({ ...f, required: false }, `${f.name}En`, `${f.label} (English)`)}</div>)}
              </fieldset>
            )}
          </section>
        )}
        {editable && (
          <div className="sticky bottom-20 z-10 space-y-2 lg:bottom-4">
            {err && <ErrorBox message={err} />}
            <div className="flex gap-3">
            <Button type="submit" loading={busy} disabled={uploading} icon="check" className="flex-1 sm:flex-none">{uploading ? 'Đang tải ảnh…' : 'Lưu'}</Button>
            {!isNew && can(me, 'delete') && (
              <Button type="button" variant="danger" icon="trash" onClick={async () => {
                if (!confirmDanger('Xoá mục này? Không khôi phục được.')) return;
                try { await api(`/admin/content/${res}/${id}`, { method: 'DELETE' }); markDirty(false); toast('Đã xoá'); navigate(`/admin/noi-dung/${res}`, true); } catch (e: any) { fail(e.message); }
              }}>Xoá</Button>
            )}
            </div>
          </div>
        )}
      </form>
    </Page>
  );
}

/** Thư viện: chọn nhiều ảnh một lần → mỗi ảnh thành 1 mục (album tuỳ chọn). */
function GalleryBulk({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [album, setAlbum] = useState('');
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(0);
  async function go(files: File[]) {
    if (!files.length) return;
    setTotal(files.length);
    setLeft(files.length);
    let ok = 0;
    await uploadMany(files, async (key) => {
      await api('/admin/content/gallery', { body: { type: 'photo', key, album: album.trim() || null, isPublic: true } });
      ok++;
    }, () => setLeft((n) => n - 1));
    toast(`Đã thêm ${ok}/${files.length} ảnh vào thư viện`);
    setTotal(0);
    onDone();
  }
  return (
    <div className="mb-6 border-2 border-dashed border-neutral-300 bg-white p-4"
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); go([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))); }}>
      <p className="font-semibold">Thêm nhiều ảnh cùng lúc</p>
      <p className="text-sm text-neutral-500">Chọn nhiều ảnh từ điện thoại (hoặc kéo thả vào đây) — mỗi ảnh tự thành một mục, hiện ngay trên website.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-sm font-semibold">Album (tuỳ chọn)</span>
          <input className="min-h-12 w-full border border-neutral-300 px-3" placeholder="Vd: Giải Kudo 2025" value={album} onChange={(e) => setAlbum(e.target.value)} />
        </label>
        <Button type="button" icon="image" loading={total > 0} onClick={() => ref.current?.click()}>
          {total > 0 ? `Đang tải ${total - left}/${total}` : 'Chọn nhiều ảnh'}
        </Button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { go([...(e.target.files ?? [])]); e.target.value = ''; }} />
    </div>
  );
}
