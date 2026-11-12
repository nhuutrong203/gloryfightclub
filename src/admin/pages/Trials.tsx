import { useState } from 'react';
import { api, can, fmtDate, navigate, todayVN, toast, useApi, type Me } from '../lib';
import { ageOn, weekdayOf } from '../../lib/schedule';
import { policyVersionText } from '../../lib/util';
import { Badge, Button, Empty, ErrorBox, Icon, Loading, Page, confirmDanger } from '../ui';
import type { Lookups } from './Students';

const ST: Record<string, { label: string; tone: 'red' | 'amber' | 'green' | 'gray' }> = {
  new: { label: 'Mới', tone: 'red' },
  contacted: { label: 'Đã liên hệ', tone: 'amber' },
  enrolled: { label: 'Đã nhập học', tone: 'green' },
  rejected: { label: 'Không học', tone: 'gray' },
};

const DAY: Record<string, string> = { '2': 'Thứ 2', '3': 'Thứ 3', '4': 'Thứ 4', '5': 'Thứ 5', '6': 'Thứ 6', '7': 'Thứ 7', '8': 'Chủ nhật' };
/** Use age today when a birth date exists, otherwise age at registration. */
const ageNow = (t: { birthDate: string | null; age: number | null }) => (t.birthDate ? ageOn(t.birthDate, todayVN()) : t.age);

export function Trials({ me }: { me: Me }) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useApi<{ rows: any[]; hasMore: boolean; page: number }>(`/admin/trials?page=${page}${filter ? `&status=${filter}` : ''}`);
  const lk = useApi<Lookups>('/admin/lookups').data;
  const [busy, setBusy] = useState<number | null>(null);
  const name = (list: { id: number; name: string }[] | undefined, id: number | null) => list?.find((x) => x.id === id)?.name;

  const setStatus = async (id: number, status: string) => {
    setBusy(id);
    try { await api(`/admin/trials/${id}`, { method: 'PUT', body: { status } }); reload(); } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(null); }
  };

  return (
    <Page title="Đăng ký học thử">
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Lọc trạng thái">
        {[['', 'Tất cả'], ...Object.entries(ST).map(([k, v]) => [k, v.label])].map(([v, label]) => (
          <button key={v} role="tab" aria-selected={filter === v} onClick={() => { setFilter(v); setPage(1); }} className={`min-h-11 shrink-0 border px-4 font-semibold cursor-pointer ${filter === v ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white'}`}>{label}</button>
        ))}
      </div>
      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : data.rows.length === 0 && page === 1 ? <Empty>Chưa có đăng ký nào.</Empty> : (
        <>
        <ul className="space-y-3">
          {data.rows.map((t) => (
            <li key={t.id} className={`border bg-white p-4 ${t.status === 'new' ? 'border-glory border-l-4' : 'border-neutral-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <b className="text-lg">{t.fullName}</b>{ageNow(t) != null && <span className="text-neutral-500"> · {ageNow(t)} tuổi</span>}
                  {t.birthDate && <span className="text-sm text-neutral-500"> (sinh {t.birthDate.split('-').reverse().join('/')})</span>}
                  <p className="text-sm text-neutral-500">Gửi {fmtDate(t.createdAt)}</p>
                  {/* Older registrations may predate the consent field. */}
                  {t.agreedAt && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-green-700">
                      <Icon name="check" className="size-4" />Đã đồng ý Quy định CLB{t.policyVersion ? ` (bản ${policyVersionText(t.policyVersion)})` : ''}
                      {t.age != null && t.age < 18 && ' — phụ huynh xác nhận'}
                    </p>
                  )}
                </div>
                <Badge tone={ST[t.status].tone}>{ST[t.status].label}</Badge>
              </div>
              {/* Highlight the selected trial session for the confirmation call. */}
              {t.classId && t.trialDate && (() => {
                const k = lk?.classes.find((c) => c.id === t.classId);
                const past = t.trialDate < todayVN();
                return (
                  <p className={`mt-3 flex flex-wrap items-center gap-x-2 border-l-4 px-3 py-2 ${past ? 'border-neutral-300 bg-neutral-50 text-neutral-500' : 'border-glory bg-red-50'}`}>
                    <Icon name="calendar" className="size-4 shrink-0" />
                    <b>Học thử {DAY[weekdayOf(t.trialDate)]} {t.trialDate.slice(8)}/{t.trialDate.slice(5, 7)}</b>
                    {k && <span>· {k.startTime}–{k.endTime} · {k.name} · {name(lk?.locations, k.locationId)}</span>}
                    {past && <span className="text-xs">(đã qua)</span>}
                  </p>
                );
              })()}
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                {t.disciplineId && <div><dt className="inline text-neutral-500">Môn: </dt><dd className="inline font-semibold">{name(lk?.disciplines, t.disciplineId)}</dd></div>}
                {t.locationId && <div><dt className="inline text-neutral-500">Cơ sở: </dt><dd className="inline font-semibold">{name(lk?.locations, t.locationId)}</dd></div>}
                {t.feePlanId && <div><dt className="inline text-neutral-500">Gói quan tâm: </dt><dd className="inline font-semibold">{name(lk?.feePlans, t.feePlanId)}</dd></div>}
                {t.preferredTime && <div><dt className="inline text-neutral-500">Giờ muốn tập: </dt><dd className="inline">{t.preferredTime}</dd></div>}
                {t.note && <div className="sm:col-span-2"><dt className="inline text-neutral-500">Ghi chú: </dt><dd className="inline">{t.note}</dd></div>}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${t.phone}`} className="inline-flex min-h-12 items-center gap-2 bg-ink px-4 font-semibold text-white"><Icon name="phone" />{t.phone}</a>
                <a href={`https://zalo.me/${t.phone}`} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center border border-neutral-300 px-4 font-semibold">Zalo</a>
                {t.status === 'new' && can(me, 'students.edit') && <Button variant="ghost" loading={busy === t.id} onClick={() => setStatus(t.id, 'contacted')}>Đã gọi</Button>}
                {t.status !== 'enrolled' && can(me, 'students.edit') && (
                  <Button icon="plus" loading={busy === t.id} onClick={async () => {
                    setBusy(t.id);
                    try {
                      const r = await api<{ studentId: number; classAssigned: boolean }>(`/admin/trials/${t.id}/convert`, { method: 'POST' });
                      toast(t.classId && !r.classAssigned
                        ? 'Đã tạo học viên. Lớp học thử không còn ở cơ sở đã chọn, vui lòng chọn lại lớp.'
                        : 'Đã tạo học viên — kiểm tra lại lớp & gói');
                      navigate(`/admin/hoc-vien/${r.studentId}`);
                    } catch (e: any) { toast(e.message, 'err'); setBusy(null); }
                  }}>Chuyển thành học viên</Button>
                )}
                {t.status === 'enrolled' && t.studentId && <Button variant="ghost" onClick={() => navigate(`/admin/hoc-vien/${t.studentId}`)}>Xem học viên</Button>}
                {(t.status === 'new' || t.status === 'contacted') && can(me, 'students.edit') && <Button variant="ghost" onClick={() => setStatus(t.id, 'rejected')}>Không học</Button>}
                {can(me, 'students.edit') && can(me, 'delete') && (
                  <button aria-label="Xoá đăng ký" className="ml-auto grid size-12 place-items-center text-neutral-400 hover:text-red-700 cursor-pointer" onClick={async () => {
                    if (!confirmDanger(`Xoá đăng ký của ${t.fullName}?`)) return;
                    try { await api(`/admin/trials/${t.id}`, { method: 'DELETE' }); reload(); } catch (e: any) { toast(e.message, 'err'); }
                  }}><Icon name="trash" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Trang đăng ký học thử">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Trang trước</Button>
          <span className="font-semibold">Trang {page}</span>
          <Button variant="ghost" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>Trang sau</Button>
        </nav>
        </>
      )}
    </Page>
  );
}
