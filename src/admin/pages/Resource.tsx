import { useEffect, useState } from 'react';
import { api, can, mediaUrl, navigate, toast, useApi, type Me } from '../lib';
import { A, Badge, Button, Chips, Empty, ErrorBox, Icon, ImageInput, LinkButton, Loading, Page, Select, TextArea, TextInput, Toggle, confirmDanger, EnHint } from '../ui';
import { DAY_LABEL, RESOURCES, type Field, type ResourceKey } from '../resources';
import type { Lookups } from './Students';

// Trang danh sách + form sinh tự động từ src/admin/resources.ts.

const imageField = (res: ResourceKey) => RESOURCES[res].fields.find((f) => f.type === 'image')?.name;

export function ResourceList({ res, me }: { res: ResourceKey; me: Me }) {
  const r = RESOURCES[res];
  const { data, error, reload } = useApi<any[]>(`/admin/content/${res}`);
  const lk = useApi<Lookups>('/admin/lookups').data;
  const img = imageField(res);
  // Lớp: nhóm theo cơ sở cho dễ nhìn.
  const groups = res === 'classes' && data && lk
    ? lk.locations.map((l) => ({ title: l.name, rows: data.filter((x) => x.locationId === l.id) }))
    : [{ title: '', rows: data ?? [] }];

  return (
    <Page title={r.title} back="/admin/them" actions={can(me, 'content') && <LinkButton to={`/admin/noi-dung/${res}/moi`} icon="plus" variant="primary">Thêm</LinkButton>}>
      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : data.length === 0 ? <Empty>Chưa có mục nào.</Empty> : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.title}>
              {g.title && <h2 className="mb-2 font-display text-xl uppercase">{g.title} <span className="text-neutral-400">({g.rows.length})</span></h2>}
              {g.rows.length === 0 ? <Empty>Chưa có lớp — thêm lớp hoặc up ảnh lịch ở mục Cơ sở.</Empty> : (
                <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
                  {g.rows.map((row) => (
                    <li key={row.id}>
                      <A to={`/admin/noi-dung/${res}/${row.id}`} className="flex min-h-16 items-center gap-3 p-3 hover:bg-neutral-50">
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
                        <Icon name="chevron" className="text-neutral-400" />
                      </A>
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
  const v = f.type === 'bool' ? (f.name === 'isFeatured' ? false : true) : f.type === 'multi' ? [] : f.type === 'select' && f.options ? f.options[0].value : f.type === 'color' ? '#ffffff' : '';
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
  const set = (k: string) => (v: any) => setForm((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, any> = {};
    for (const f of r.fields) {
      const v = form[f.name];
      payload[f.name] = f.type === 'number' ? (v === '' || v == null ? null : Number(v))
        : f.type === 'select' && !f.options ? (v === '' || v == null ? null : Number(v))
        : v === '' ? null : v;
      if (f.en) payload[`${f.name}En`] = form[`${f.name}En`] || null;
    }
    try {
      if (isNew) await api(`/admin/content/${res}`, { body: payload });
      else await api(`/admin/content/${res}/${id}`, { method: 'PUT', body: payload });
      toast('Đã lưu');
      navigate(`/admin/noi-dung/${res}`, true);
    } catch (err: any) { toast(err.message, 'err'); setBusy(false); }
  }

  const input = (f: Field, name = f.name, label = f.label) => {
    const val = form[name];
    switch (f.type) {
      case 'textarea': return <TextArea label={label} required={f.required && name === f.name} help={name === f.name ? f.help : undefined} value={val ?? ''} onChange={set(name)} rows={f.name === 'description' || f.name === 'bio' ? 6 : 4} />;
      case 'bool': return <Toggle label={label} checked={!!val} onChange={set(name)} />;
      case 'image': return <ImageInput label={label} value={val || null} onChange={set(name)} help={f.help} />;
      case 'number': return <TextInput label={label} type="number" inputMode="numeric" min={0} required={f.required} value={val ?? ''} onChange={(e) => set(name)(e.target.value)} help={f.help} />;
      case 'time': return <TextInput label={label} type="time" required={f.required} value={val ?? ''} onChange={(e) => set(name)(e.target.value)} />;
      case 'date': return <TextInput label={label} type="date" value={val ?? ''} onChange={(e) => set(name)(e.target.value)} />;
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
    <Page title={isNew ? `Thêm: ${r.title}` : r.listTitle(existing)} back={`/admin/noi-dung/${res}`}>
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={!editable} className="space-y-4 border border-neutral-200 bg-white p-4">
          {r.fields.map((f) => <div key={f.name}>{input(f)}</div>)}
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
          <div className="sticky bottom-20 z-10 flex gap-3 lg:bottom-4">
            <Button type="submit" loading={busy} icon="check" className="flex-1 sm:flex-none">Lưu</Button>
            {!isNew && can(me, 'delete') && (
              <Button type="button" variant="danger" icon="trash" onClick={async () => {
                if (!confirmDanger('Xoá mục này? Không khôi phục được.')) return;
                try { await api(`/admin/content/${res}/${id}`, { method: 'DELETE' }); toast('Đã xoá'); navigate(`/admin/noi-dung/${res}`, true); } catch (e: any) { toast(e.message, 'err'); }
              }}>Xoá</Button>
            )}
          </div>
        )}
      </form>
    </Page>
  );
}
