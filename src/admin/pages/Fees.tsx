import { useMemo, useState } from 'react';
import { api, can, fmtDate, monthLabel, shiftMonth, todayVN, toast, useApi, vnd, type Me } from '../lib';
import { A, Badge, Button, Empty, ErrorBox, Icon, Loading, MoneyInput, Page, Select, TextInput, confirmDanger, inputCls } from '../ui';
import type { Lookups } from './Students';
import { fold } from '../../lib/import';

type Student = { id: number; code: string; fullName: string; phone: string | null; parentPhone: string | null; locationId: number | null; feePlanId: number | null; status: string };
type Payment = { id: number; studentId: number; month: string; amount: number; paidAt: string; method: 'cash' | 'transfer'; feePlanId: number | null; note: string | null };

export function Fees({ me }: { me: Me }) {
  const [month, setMonth] = useState(new URLSearchParams(location.search).get('month') ?? todayVN().slice(0, 7));
  const [show, setShow] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [loc, setLoc] = useState('');
  const [q, setQ] = useState('');
  const [paying, setPaying] = useState<Student | null>(null);
  const { data, error, loading, reload } = useApi<{ month: string; students: Student[]; payments: Payment[] }>(`/admin/fees?month=${month}`);
  const lk = useApi<Lookups>('/admin/lookups').data;

  const rows = useMemo(() => {
    if (!data) return [];
    const term = fold(q.trim()); // "nguyen" khớp "Nguyễn", giống trang Học viên
    return data.students
      .map((s) => ({ s, p: data.payments.find((p) => p.studentId === s.id) }))
      .filter(({ s, p }) => (show === 'all' || (show === 'paid' ? p : !p)) && (!loc || s.locationId === Number(loc)) && (!term || fold(s.fullName).includes(term) || s.code.toLowerCase().includes(term)));
  }, [data, show, loc, q]);
  const total = data?.payments.reduce((a, p) => a + p.amount, 0) ?? 0;
  const unpaidCount = data ? data.students.filter((s) => s.status === 'active' && !data.payments.some((p) => p.studentId === s.id)).length : 0;
  const plan = (id: number | null) => lk?.feePlans.find((p) => p.id === id);

  return (
    <Page title="Học phí">
      {/* Chọn tháng */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" aria-label="Tháng trước" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="back" /></Button>
        {/* Ô chọn tháng gốc hiện theo ngôn ngữ trình duyệt ("NOVEMBER") → phủ ô trong suốt lên nhãn tiếng Việt. */}
        <label className={`${inputCls} relative flex flex-1 cursor-pointer items-center justify-center font-display text-xl uppercase`}>
          {monthLabel(month)}
          <input type="month" aria-label="Chọn tháng" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)}
            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
            className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <Button variant="ghost" aria-label="Tháng sau" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="chevron" /></Button>
      </div>

      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-px border border-neutral-200 bg-neutral-200">
            <div className="bg-white p-3"><p className="font-display text-3xl leading-none text-red-700">{unpaidCount}</p><p className="text-sm text-neutral-500">Chưa đóng</p></div>
            <div className="bg-white p-3"><p className="font-display text-3xl leading-none text-green-700">{data.payments.length}</p><p className="text-sm text-neutral-500">Đã đóng</p></div>
            <div className="bg-white p-3"><p className="font-display text-xl leading-none sm:text-2xl">{vnd(total)}</p><p className="text-sm text-neutral-500">Đã thu</p></div>
          </div>

          <div className="mb-3 grid grid-cols-3 border border-neutral-300 bg-white" role="tablist" aria-label="Lọc">
            {([['unpaid', 'Chưa đóng'], ['paid', 'Đã đóng'], ['all', 'Tất cả']] as const).map(([v, label]) => (
              <button key={v} role="tab" aria-selected={show === v} onClick={() => setShow(v)} className={`min-h-12 font-semibold cursor-pointer transition-colors duration-150 ${show === v ? 'bg-ink text-white' : 'hover:bg-neutral-100'}`}>{label}</button>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input type="search" aria-label="Tìm" placeholder="Tìm tên / mã…" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
            <select aria-label="Cơ sở" value={loc} onChange={(e) => setLoc(e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="">Mọi cơ sở</option>
              {lk?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {rows.length === 0 ? <Empty>{show === 'unpaid' ? `Tất cả học viên đã đóng ${monthLabel(month).toLowerCase()}.` : 'Không có dữ liệu.'}</Empty> : (
            <ul className={`divide-y divide-neutral-200 border border-neutral-200 bg-white ${loading ? 'opacity-60' : ''}`}>
              {rows.map(({ s, p }) => (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <A to={`/admin/hoc-vien/${s.id}`} className="min-w-0 flex-1">
                    <b className="block truncate">{s.fullName}</b>
                    <span className="block truncate text-sm text-neutral-500">{s.code} · {plan(s.feePlanId)?.name ?? 'Chưa chọn gói'}</span>
                    {p && <span className="block text-sm text-green-700">{vnd(p.amount)} · {fmtDate(p.paidAt)} · {p.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span>}
                  </A>
                  {p ? (
                    <div className="flex items-center gap-1">
                      <Badge tone="green">Đã đóng</Badge>
                      {can(me, 'fees.edit') && can(me, 'delete') && (
                        <button className="grid size-11 place-items-center text-neutral-400 hover:text-red-700 cursor-pointer" aria-label={`Huỷ ghi nhận của ${s.fullName}`} onClick={async () => {
                          if (!confirmDanger(`Huỷ ghi nhận học phí ${monthLabel(month)} của ${s.fullName}?`)) return;
                          try { await api(`/admin/fees/${p.id}`, { method: 'DELETE' }); toast('Đã huỷ'); reload(); } catch (e: any) { toast(e.message, 'err'); }
                        }}><Icon name="x" /></button>
                      )}
                    </div>
                  ) : can(me, 'fees.edit') ? (
                    <Button className="shrink-0 !px-4" onClick={() => setPaying(s)}>Thu tiền</Button>
                  ) : <Badge tone="red">Chưa đóng</Badge>}
                </li>
              ))}
            </ul>
          )}

          <a href={`/api/admin/fees/export.csv?month=${month}`} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline"><Icon name="download" className="size-4" />Xuất Excel {monthLabel(month).toLowerCase()} (CSV)</a>
          <a href="/api/admin/fees/export.csv" className="ml-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline">Xuất toàn bộ lịch sử</a>
        </>
      )}

      {paying && lk && (
        <PaySheet student={paying} month={month} plans={lk.feePlans} onClose={() => setPaying(null)} onDone={() => { setPaying(null); reload(); }} />
      )}
    </Page>
  );
}

function PaySheet({ student, month, plans, onClose, onDone }: { student: Student; month: string; plans: Lookups['feePlans']; onClose: () => void; onDone: () => void }) {
  const initial = plans.find((p) => p.id === student.feePlanId);
  const [planId, setPlanId] = useState(String(initial?.id ?? ''));
  const [amount, setAmount] = useState(String(initial?.pricePerMonth ?? ''));
  const [method, setMethod] = useState<'cash' | 'transfer'>('transfer');
  const [paidAt, setPaidAt] = useState(todayVN());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50 sm:items-center sm:justify-center" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={`Thu học phí ${student.fullName}`}
        className="max-h-[90dvh] w-full overflow-y-auto bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api('/admin/fees', { body: { studentId: student.id, month, amount: Number(amount), feePlanId: planId ? Number(planId) : null, paidAt, method, note } });
            toast(`Đã ghi nhận ${student.fullName}`);
            onDone();
          } catch (err: any) { toast(err.message, 'err'); setBusy(false); }
        }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">Thu học phí {monthLabel(month).toLowerCase()}</p>
            <h2 className="font-display text-2xl uppercase">{student.fullName}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center cursor-pointer" aria-label="Đóng"><Icon name="x" /></button>
        </div>
        <div className="space-y-4">
          <Select label="Gói" value={planId} placeholder="Khác" onChange={(v) => { setPlanId(v); const p = plans.find((x) => x.id === Number(v)); if (p) setAmount(String(p.pricePerMonth)); }}
            options={plans.map((p) => ({ value: p.id, label: `${p.name} — ${vnd(p.pricePerMonth)}` }))} />
          <MoneyInput label="Số tiền (VND)" required value={amount} onChange={setAmount} />
          <div className="grid grid-cols-2 border border-neutral-300" role="radiogroup" aria-label="Hình thức">
            {([['transfer', 'Chuyển khoản'], ['cash', 'Tiền mặt']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={method === v} onClick={() => setMethod(v)} className={`min-h-12 font-semibold cursor-pointer ${method === v ? 'bg-ink text-white' : 'bg-white'}`}>{label}</button>
            ))}
          </div>
          <TextInput label="Ngày đóng" type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          <TextInput label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" loading={busy} icon="check" className="w-full">Xác nhận đã thu</Button>
        </div>
      </form>
    </div>
  );
}
