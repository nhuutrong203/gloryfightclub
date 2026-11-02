import { useEffect, useState } from 'react';
import { api, can, fmtDate, monthLabel, navigate, todayVN, toast, useApi, vnd, type Me } from '../lib';
import { A, Badge, Button, Chips, ErrorBox, Icon, Loading, Page, Select, TextArea, TextInput, confirmDanger, Empty, inputCls, LinkButton } from '../ui';
import { daysLabel } from '../resources';
import { StudentImport } from './StudentImport';

export type Lookups = {
  locations: { id: number; name: string }[];
  disciplines: { id: number; name: string }[];
  classes: { id: number; name: string; days: string; startTime: string; endTime: string; locationId: number; isActive: boolean }[];
  coaches: { id: number; name: string }[];
  feePlans: { id: number; name: string; pricePerMonth: number }[];
};

export const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  active: { label: 'Đang học', tone: 'green' },
  paused: { label: 'Tạm nghỉ', tone: 'amber' },
  quit: { label: 'Đã nghỉ', tone: 'gray' },
};

export const classLabel = (k: Lookups['classes'][number]) => `${k.name} · ${daysLabel(k.days)} ${k.startTime}`;

export function StudentList({ me }: { me: Me }) {
  const params = new URLSearchParams(location.search);
  const [f, setF] = useState({ q: params.get('q') ?? '', status: params.get('status') ?? 'active', location: params.get('location') ?? '', class: params.get('class') ?? '', sort: params.get('sort') ?? 'name', page: 1 });
  const [q, setQ] = useState(f.q);
  // Gõ tìm kiếm: đợi 300ms rồi mới tải (đỡ gọi API liên tục).
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q, page: 1 })), 300); return () => clearTimeout(t); }, [q]);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, String(v)])).toString();
  useEffect(() => { history.replaceState(null, '', `/admin/hoc-vien?${qs}`); }, [qs]);
  const { data, error, loading, reload } = useApi<{ total: number; page: number; rows: any[] }>(`/admin/students?${qs}`);
  const lk = useApi<Lookups>('/admin/lookups').data;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v, page: 1 }));
  const exportQs = new URLSearchParams(Object.entries({ q: f.q, status: f.status, location: f.location, class: f.class }).filter(([, v]) => v)).toString();

  return (
    <Page title="Học viên" actions={can(me, 'students.edit') && <LinkButton to="/admin/hoc-vien/moi" icon="plus" variant="primary"><span className="hidden sm:inline">Thêm học viên</span><span className="sm:hidden">Thêm</span></LinkButton>}>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
          <input type="search" aria-label="Tìm học viên" placeholder="Tìm theo tên, SĐT, mã học viên…" className={`${inputCls} pl-10`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select label="Trạng thái" value={f.status} onChange={set('status')} placeholder="Tất cả" options={Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label }))} />
          <Select label="Cơ sở" value={f.location} onChange={set('location')} placeholder="Tất cả" options={(lk?.locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
          <Select label="Lớp" value={f.class} onChange={set('class')} placeholder="Tất cả" options={(lk?.classes ?? []).filter((k) => !f.location || k.locationId === Number(f.location)).map((k) => ({ value: k.id, label: classLabel(k) }))} />
          <Select label="Sắp xếp" value={f.sort} onChange={set('sort')} options={[{ value: 'name', label: 'Tên A→Z' }, { value: 'newest', label: 'Mới thêm' }, { value: 'joined', label: 'Ngày nhập học' }, { value: 'code', label: 'Mã học viên' }]} />
        </div>
      </div>

      {can(me, 'students.edit') && <StudentImport onDone={reload} />}
      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : (
        <>
          <div className="mb-2 flex items-center justify-between text-sm text-neutral-600">
            <span><b>{data.total}</b> học viên</span>
            <a href={`/api/admin/students/export.csv?${exportQs}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-ink underline"><Icon name="download" className="size-4" />Xuất Excel (CSV)</a>
          </div>
          {data.rows.length === 0 ? <Empty>Không có học viên phù hợp.</Empty> : (
            <ul className={`divide-y divide-neutral-200 border border-neutral-200 bg-white ${loading ? 'opacity-60' : ''}`}>
              {data.rows.map((s) => (
                <li key={s.id}>
                  <A to={`/admin/hoc-vien/${s.id}`} className="flex items-center gap-3 p-3 hover:bg-neutral-50">
                    <span className="grid size-11 shrink-0 place-items-center bg-ink font-display text-lg text-white">{initials(s.fullName)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><b className="truncate">{s.fullName}</b>{f.status !== 'active' && <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>}</span>
                      <span className="block truncate text-sm text-neutral-500">
                        {s.code} · {s.phone || s.parentPhone || 'chưa có SĐT'}
                        {s.classIds.length > 0 && lk && ` · ${s.classIds.map((id: number) => lk.classes.find((k) => k.id === id)?.name).filter(Boolean).join(', ')}`}
                      </span>
                    </span>
                    {can(me, 'fees.view') && s.status === 'active' && (s.paidThisMonth ? <Badge tone="green">Đã đóng</Badge> : <Badge tone="red">Chưa đóng</Badge>)}
                  </A>
                </li>
              ))}
            </ul>
          )}
          {data.total > 50 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="ghost" disabled={f.page <= 1} onClick={() => setF((x) => ({ ...x, page: x.page - 1 }))}>Trước</Button>
              <span className="text-sm">Trang {f.page}/{Math.ceil(data.total / 50)}</span>
              <Button variant="ghost" disabled={f.page * 50 >= data.total} onClick={() => setF((x) => ({ ...x, page: x.page + 1 }))}>Sau</Button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}

const initials = (name: string) => name.replace(/\s*\(.*\)$/, '').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();

const blank = { fullName: '', phone: '', birthYear: '', parentName: '', parentPhone: '', locationId: '', feePlanId: '', joinedAt: '', status: 'active', note: '', classIds: [] as number[] };

export function StudentEdit({ id, me }: { id: string; me: Me }) {
  const isNew = id === 'moi';
  const { data, error, reload } = useApi<any>(isNew ? null : `/admin/students/${id}`);
  const lk = useApi<Lookups>('/admin/lookups').data;
  const [form, setForm] = useState({ ...blank, joinedAt: todayVN() });
  const [busy, setBusy] = useState(false);
  const editable = can(me, 'students.edit');

  useEffect(() => {
    if (data) setForm({
      fullName: data.fullName, phone: data.phone ?? '', birthYear: data.birthYear ?? '', parentName: data.parentName ?? '', parentPhone: data.parentPhone ?? '',
      locationId: data.locationId ?? '', feePlanId: data.feePlanId ?? '', joinedAt: data.joinedAt, status: data.status, note: data.note ?? '', classIds: data.classIds,
    });
  }, [data]);

  if (!isNew && error) return <Page title="Học viên" back="/admin/hoc-vien"><ErrorBox message={error} retry={reload} /></Page>;
  if ((!isNew && !data) || !lk) return <Loading />;

  const set = (k: keyof typeof form) => (v: any) => setForm((x) => ({ ...x, [k]: v }));
  const age = form.birthYear ? new Date().getFullYear() - Number(form.birthYear) : null;
  const isKid = age != null && age < 16;
  const classOpts = lk.classes.filter((k) => k.isActive && (!form.locationId || k.locationId === Number(form.locationId)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      birthYear: form.birthYear ? Number(form.birthYear) : null,
      locationId: form.locationId ? Number(form.locationId) : null,
      feePlanId: form.feePlanId ? Number(form.feePlanId) : null,
    };
    try {
      if (isNew) {
        const row = await api<{ id: number }>('/admin/students', { body: payload });
        toast('Đã thêm học viên');
        navigate(`/admin/hoc-vien/${row.id}`, true);
      } else {
        await api(`/admin/students/${id}`, { method: 'PUT', body: payload });
        toast('Đã lưu');
        reload();
      }
    } catch (err: any) { toast(err.message, 'err'); } finally { setBusy(false); }
  }

  return (
    <Page title={isNew ? 'Thêm học viên' : form.fullName || 'Học viên'} back="/admin/hoc-vien"
      actions={!isNew && data && <Badge tone={STATUS[data.status].tone}>{data.code}</Badge>}>
      {!isNew && (form.phone || form.parentPhone) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {form.phone && <a href={`tel:${form.phone}`} className="inline-flex min-h-12 items-center gap-2 bg-ink px-4 font-semibold text-white"><Icon name="phone" />Gọi học viên</a>}
          {form.parentPhone && <a href={`tel:${form.parentPhone}`} className="inline-flex min-h-12 items-center gap-2 bg-ink px-4 font-semibold text-white"><Icon name="phone" />Gọi phụ huynh</a>}
          {(form.phone || form.parentPhone) && <a href={`https://zalo.me/${form.phone || form.parentPhone}`} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center gap-2 border border-neutral-300 bg-white px-4 font-semibold">Zalo</a>}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <fieldset disabled={!editable} className="grid gap-4 border border-neutral-200 bg-white p-4 sm:grid-cols-2">
          <legend className="sr-only">Thông tin học viên</legend>
          <div className="sm:col-span-2"><TextInput label="Họ và tên *" required value={form.fullName} onChange={(e) => set('fullName')(e.target.value)} /></div>
          <TextInput label="Số điện thoại" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} help={isKid ? 'Trẻ nhỏ có thể bỏ trống, dùng SĐT phụ huynh' : undefined} />
          <TextInput label="Năm sinh" type="number" inputMode="numeric" min={1940} max={2030} value={form.birthYear} onChange={(e) => set('birthYear')(e.target.value)} help={age != null ? `${age} tuổi` : undefined} />
          <TextInput label={`Tên phụ huynh${isKid ? ' *' : ''}`} required={isKid} value={form.parentName} onChange={(e) => set('parentName')(e.target.value)} />
          <TextInput label={`SĐT phụ huynh${isKid ? ' *' : ''}`} type="tel" inputMode="tel" required={isKid} value={form.parentPhone} onChange={(e) => set('parentPhone')(e.target.value)} />
          <Select label="Cơ sở" value={form.locationId} onChange={set('locationId')} placeholder="Chọn cơ sở" options={lk.locations.map((l) => ({ value: l.id, label: l.name }))} />
          <Select label="Gói học phí" value={form.feePlanId} onChange={set('feePlanId')} placeholder="Chưa chọn" options={lk.feePlans.map((p) => ({ value: p.id, label: `${p.name} — ${vnd(p.pricePerMonth)}` }))} />
          <div className="sm:col-span-2">
            <Chips label="Lớp đang học" value={form.classIds} onChange={set('classIds')} options={classOpts.map((k) => ({ value: k.id, label: classLabel(k) }))}
              help={form.locationId ? undefined : 'Chọn cơ sở để lọc bớt danh sách lớp'} />
          </div>
          <TextInput label="Ngày nhập học *" type="date" required value={form.joinedAt} onChange={(e) => set('joinedAt')(e.target.value)} />
          <Select label="Trạng thái" value={form.status} onChange={set('status')} options={Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label }))} />
          <div className="sm:col-span-2"><TextArea label="Ghi chú" value={form.note} onChange={set('note')} rows={3} /></div>
        </fieldset>

        {editable && (
          <div className="sticky bottom-20 z-10 flex gap-3 lg:bottom-4">
            <Button type="submit" loading={busy} icon="check" className="flex-1 sm:flex-none">{isNew ? 'Thêm học viên' : 'Lưu thay đổi'}</Button>
            {!isNew && can(me, 'delete') && (
              <Button type="button" variant="danger" icon="trash" onClick={async () => {
                if (!confirmDanger(`Xoá hẳn học viên "${form.fullName}" và toàn bộ lịch sử học phí?\n\nNếu học viên chỉ nghỉ học, hãy đổi trạng thái thành "Đã nghỉ" thay vì xoá.`)) return;
                try { await api(`/admin/students/${id}`, { method: 'DELETE' }); toast('Đã xoá'); navigate('/admin/hoc-vien', true); } catch (err: any) { toast(err.message, 'err'); }
              }}>Xoá</Button>
            )}
          </div>
        )}
      </form>

      {!isNew && can(me, 'fees.view') && data && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl uppercase">Lịch sử học phí</h2>
            <LinkButton to="/admin/hoc-phi" icon="wallet">Thu học phí</LinkButton>
          </div>
          {data.payments.length === 0 ? <Empty>Chưa có lần đóng học phí nào.</Empty> : (
            <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
              {data.payments.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <span><b>{monthLabel(p.month)}</b><br /><span className="text-sm text-neutral-500">Đóng ngày {fmtDate(p.paidAt)} · {p.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span></span>
                  <b className="font-display text-xl">{vnd(p.amount)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </Page>
  );
}
