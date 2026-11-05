import { useState } from 'react';
import { api, can, fmtDate, navigate, toast, useApi, type Me } from '../lib';
import { Badge, Button, Empty, ErrorBox, Icon, Loading, Page, confirmDanger } from '../ui';
import type { Lookups } from './Students';

const ST: Record<string, { label: string; tone: 'red' | 'amber' | 'green' | 'gray' }> = {
  new: { label: 'Mới', tone: 'red' },
  contacted: { label: 'Đã liên hệ', tone: 'amber' },
  enrolled: { label: 'Đã nhập học', tone: 'green' },
  rejected: { label: 'Không học', tone: 'gray' },
};

export function Trials({ me }: { me: Me }) {
  const [filter, setFilter] = useState('');
  const { data, error, reload } = useApi<any[]>(`/admin/trials${filter ? `?status=${filter}` : ''}`);
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
          <button key={v} role="tab" aria-selected={filter === v} onClick={() => setFilter(v)} className={`min-h-11 shrink-0 border px-4 font-semibold cursor-pointer ${filter === v ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white'}`}>{label}</button>
        ))}
      </div>
      {error ? <ErrorBox message={error} retry={reload} /> : !data ? <Loading /> : data.length === 0 ? <Empty>Chưa có đăng ký nào.</Empty> : (
        <ul className="space-y-3">
          {data.map((t) => (
            <li key={t.id} className={`border bg-white p-4 ${t.status === 'new' ? 'border-glory border-l-4' : 'border-neutral-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <b className="text-lg">{t.fullName}</b>{t.age != null && <span className="text-neutral-500"> · {t.age} tuổi</span>}
                  <p className="text-sm text-neutral-500">Gửi {fmtDate(t.createdAt)}</p>
                </div>
                <Badge tone={ST[t.status].tone}>{ST[t.status].label}</Badge>
              </div>
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
                {t.status === 'new' && <Button variant="ghost" loading={busy === t.id} onClick={() => setStatus(t.id, 'contacted')}>Đã gọi</Button>}
                {t.status !== 'enrolled' && can(me, 'students.edit') && (
                  <Button icon="plus" loading={busy === t.id} onClick={async () => {
                    setBusy(t.id);
                    try {
                      const r = await api<{ studentId: number }>(`/admin/trials/${t.id}/convert`, { method: 'POST' });
                      toast(t.feePlanId ? 'Đã tạo học viên (đã gán gói khách chọn) — bổ sung lớp đang học' : 'Đã tạo học viên — bổ sung lớp & gói học phí');
                      navigate(`/admin/hoc-vien/${r.studentId}`);
                    } catch (e: any) { toast(e.message, 'err'); setBusy(null); }
                  }}>Chuyển thành học viên</Button>
                )}
                {t.status === 'enrolled' && t.studentId && <Button variant="ghost" onClick={() => navigate(`/admin/hoc-vien/${t.studentId}`)}>Xem học viên</Button>}
                {(t.status === 'new' || t.status === 'contacted') && <Button variant="ghost" onClick={() => setStatus(t.id, 'rejected')}>Không học</Button>}
                {can(me, 'delete') && (
                  <button aria-label="Xoá đăng ký" className="ml-auto grid size-12 place-items-center text-neutral-400 hover:text-red-700 cursor-pointer" onClick={async () => {
                    if (!confirmDanger(`Xoá đăng ký của ${t.fullName}?`)) return;
                    try { await api(`/admin/trials/${t.id}`, { method: 'DELETE' }); reload(); } catch (e: any) { toast(e.message, 'err'); }
                  }}><Icon name="trash" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
