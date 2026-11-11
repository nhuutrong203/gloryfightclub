import { can, monthLabel, siteUrl, useApi, vnd, type Me } from '../lib';
import { A, Badge, ErrorBox, Icon, LinkButton, Loading, Page } from '../ui';
import { daysLabel } from '../resources';

type Data = {
  date: string; month: string; activeTotal: number; byLocation: { locationId: number | null; n: number }[];
  newThisMonth: number; trialsNew: number; unpaid: number | null; revenue: { sum: number; n: number } | null;
  todayClasses: { id: number; name: string; days: string; startTime: string; endTime: string; locationId: number }[];
};

export function Dashboard({ me }: { me: Me }) {
  const { data, error, loading, reload } = useApi<Data>('/admin/dashboard');
  const lookups = useApi<{ locations: { id: number; name: string }[] }>('/admin/lookups');
  const locName = (id: number | null) => lookups.data?.locations.find((l) => l.id === id)?.name ?? 'Chưa gán cơ sở';
  const hour = Number(new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <Page title="Tổng quan">
      <p className="-mt-3 mb-5 text-neutral-600">{greet}, <b>{me.fullName.replace(/\s*\(.*\)$/, '')}</b>.</p>
      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} retry={reload} /> : data && (
        <div className="space-y-6">
          {/* Việc cần làm */}
          {(data.trialsNew > 0 || (data.unpaid ?? 0) > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.trialsNew > 0 && (
                <A to="/admin/hoc-thu" className="flex items-center gap-4 bg-glory p-4 text-white hover:bg-red-700">
                  <Icon name="inbox" className="size-8" />
                  <span><b className="mr-1.5 font-display text-3xl">{data.trialsNew}</b>đăng ký học thử mới<br /><span className="text-sm opacity-90">Bấm để gọi lại</span></span>
                </A>
              )}
              {(data.unpaid ?? 0) > 0 && (
                <A to="/admin/hoc-phi" className="flex items-center gap-4 bg-ink p-4 text-white hover:bg-neutral-800">
                  <Icon name="wallet" className="size-8" />
                  <span><b className="mr-1.5 font-display text-3xl">{data.unpaid}</b>học viên chưa đóng {monthLabel(data.month).toLowerCase()}<br /><span className="text-sm opacity-80">Bấm để ghi nhận</span></span>
                </A>
              )}
            </div>
          )}

          {/* Số liệu */}
          <div className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
            {can(me, 'students.view') && <Stat label="Đang học" value={data.activeTotal} />}
            {can(me, 'students.view') && <Stat label={`Mới ${monthLabel(data.month).toLowerCase()}`} value={data.newThisMonth} />}
            {can(me, 'students.view') && <Stat label="Học thử chờ gọi" value={data.trialsNew} />}
            {data.revenue ? <Stat label={`Đã thu ${monthLabel(data.month).toLowerCase()}`} value={vnd(data.revenue.sum)} small /> : <Stat label="Ca tập hôm nay" value={data.todayClasses.length} />}
          </div>

          {data.byLocation.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {data.byLocation.map((l) => <Badge key={l.locationId ?? 0}>{locName(l.locationId)}: {l.n} học viên</Badge>)}
            </div>
          )}

          {/* Hôm nay */}
          <section>
            <h2 className="mb-3 font-display text-2xl uppercase">Ca tập hôm nay</h2>
            {data.todayClasses.length === 0 ? (
              <p className="text-neutral-500">Hôm nay không có ca tập theo lịch.</p>
            ) : (
              <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
                {data.todayClasses.map((k) => (
                  <li key={k.id} className="flex items-center gap-4 p-3">
                    <span className="w-24 shrink-0 font-display text-xl">{k.startTime}<span className="text-neutral-400">–{k.endTime}</span></span>
                    <span className="min-w-0">
                      <b className="block truncate">{k.name}</b>
                      <span className="text-sm text-neutral-500">{locName(k.locationId)} · {daysLabel(k.days)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            {can(me, 'students.edit') && <LinkButton to="/admin/hoc-vien/moi" icon="plus" variant="primary">Thêm học viên</LinkButton>}
            {can(me, 'posts') && <LinkButton to="/admin/nhat-ky/moi" icon="news">Viết nhật ký</LinkButton>}
            <a href={siteUrl()} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center gap-2 border border-neutral-300 bg-white px-5 font-semibold hover:bg-neutral-100"><Icon name="external" />Xem website</a>
          </div>
        </div>
      )}
    </Page>
  );
}

const Stat = ({ label, value, small }: { label: string; value: number | string; small?: boolean }) => (
  <div className="bg-white p-4">
    <p className={`font-display leading-none ${small ? 'text-2xl' : 'text-4xl'}`}>{value}</p>
    <p className="mt-1 text-sm text-neutral-500">{label}</p>
  </div>
);
