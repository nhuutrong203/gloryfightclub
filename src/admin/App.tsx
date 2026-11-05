import { useEffect, useState, type ReactNode } from 'react';
import { api, can, usePath, useToasts, type Me } from './lib';
import { A, Icon, Loading } from './ui';
import { RESOURCES, type ResourceKey } from './resources';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentList, StudentEdit } from './pages/Students';
import { Fees } from './pages/Fees';
import { Trials } from './pages/Trials';
import { PostList, PostEdit } from './pages/Posts';
import { ResourceList, ResourceEdit } from './pages/Resource';
import { Settings } from './pages/Settings';
import { Texts } from './pages/Texts';
import { Users } from './pages/Users';
import { More, Password } from './pages/More';

export default function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  // Phiên hết hạn giữa chừng: hiện ô đăng nhập ĐÈ lên trang (không thay trang) → bài / form đang gõ dở vẫn còn.
  const [expired, setExpired] = useState(false);
  // Đường dẫn cũ của Nhật ký (/admin/tin-tuc…) → đường dẫn mới, giữ link đã lưu.
  if (location.pathname.startsWith('/admin/tin-tuc')) history.replaceState(null, '', location.pathname.replace('/admin/tin-tuc', '/admin/nhat-ky') + location.search);
  const path = usePath().split(/[?#]/)[0].replace(/\/+$/, '') || '/admin';

  useEffect(() => {
    api<Me>('/admin/me').then(setMe, () => setMe(null));
    const out = () => setExpired(true);
    window.addEventListener('glory:logout', out);
    return () => window.removeEventListener('glory:logout', out);
  }, []);

  if (me === undefined) return <Loading />;
  if (me === null) return <Login onLogin={() => api<Me>('/admin/me').then(setMe)} />;

  return (
    <Shell me={me} path={path}>
      <Route path={path} me={me} />
      <Toasts />
      {expired && <Login overlay onLogin={() => api<Me>('/admin/me').then((m) => { setMe(m); setExpired(false); })} />}
    </Shell>
  );
}

function Route({ path, me }: { path: string; me: Me }) {
  const seg = path.split('/').slice(2); // bỏ '' và 'admin'
  const deny = <p className="p-6">Bạn chưa được cấp quyền xem mục này. Liên hệ chủ CLB.</p>;
  switch (seg[0]) {
    case undefined: return <Dashboard me={me} />;
    case 'hoc-vien':
      if (!can(me, 'students.view')) return deny;
      return seg[1] ? <StudentEdit id={seg[1]} me={me} /> : <StudentList me={me} />;
    case 'hoc-phi': return can(me, 'fees.view') ? <Fees me={me} /> : deny;
    case 'hoc-thu': return can(me, 'students.view') ? <Trials me={me} /> : deny;
    case 'nhat-ky':
      if (!can(me, 'posts')) return deny;
      return seg[1] ? <PostEdit id={seg[1]} me={me} /> : <PostList />;
    case 'noi-dung': {
      const res = seg[1] as ResourceKey;
      if (!RESOURCES[res]) return <p className="p-6">Không tìm thấy trang.</p>;
      return seg[2] ? <ResourceEdit key={res} res={res} id={seg[2]} me={me} /> : <ResourceList key={res} res={res} me={me} />;
    }
    case 'cai-dat': return can(me, 'content') ? <Settings /> : deny;
    case 'chu-website': return can(me, 'content') ? <Texts /> : deny;
    case 'tai-khoan': return me.role === 'owner' ? <Users me={me} /> : deny;
    case 'doi-mat-khau': return <Password />;
    case 'them': return <More me={me} />;
    default: return <p className="p-6">Không tìm thấy trang.</p>;
  }
}

function Shell({ me, path, children }: { me: Me; path: string; children: ReactNode }) {
  const tabs = [
    { to: '/admin', label: 'Tổng quan', icon: 'home', show: true },
    { to: '/admin/hoc-vien', label: 'Học viên', icon: 'users', show: can(me, 'students.view') },
    { to: '/admin/hoc-phi', label: 'Học phí', icon: 'wallet', show: can(me, 'fees.view') },
    { to: '/admin/hoc-thu', label: 'Học thử', icon: 'inbox', show: can(me, 'students.view') },
    { to: '/admin/nhat-ky', label: 'Nhật ký', icon: 'news', show: can(me, 'posts') && !can(me, 'fees.view') },
    { to: '/admin/them', label: 'Thêm', icon: 'menu', show: true },
  ].filter((t) => t.show);
  // Số đăng ký học thử mới: hiện huy hiệu đỏ trên tab, cập nhật khi chuyển trang và mỗi phút.
  const [newTrials, setNewTrials] = useState(0);
  useEffect(() => {
    if (!can(me, 'students.view')) return;
    const load = () => api<{ n: number }>('/admin/trials/count').then((r) => setNewTrials(r.n), () => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [path]);
  const badge = (to: string) => to === '/admin/hoc-thu' && newTrials > 0
    ? <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-glory px-1.5 text-xs font-bold leading-5 text-white ring-2 ring-white" aria-label={`${newTrials} đăng ký mới`}>{newTrials}</span>
    : null;
  const own = (to: string) => (to === '/admin' ? path === '/admin' : path.startsWith(to));
  const active = (to: string) => own(to) || (to === '/admin/them' && !tabs.some((t) => t.to !== '/admin/them' && own(t.to)) && /\/(noi-dung|cai-dat|chu-website|tai-khoan|doi-mat-khau|nhat-ky)/.test(path));

  return (
    <div className="min-h-dvh bg-neutral-100 text-ink lg:pl-60">
      {/* Thanh trên */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-ink px-4 text-white lg:hidden">
        <img src="/logo.svg" alt="" className="h-8 w-auto" />
        <span className="font-display text-lg uppercase tracking-wider">Glory CMS</span>
        <span className="ml-auto truncate text-sm text-neutral-300">{me.fullName}</span>
      </header>

      {/* Menu trái (máy tính) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink text-white lg:flex">
        <A to="/admin" className="flex items-center gap-3 px-5 py-5">
          <img src="/logo.svg" alt="" className="h-10 w-auto" />
          <span className="font-display text-xl uppercase leading-none tracking-wider">Glory<br /><span className="text-glory">CMS</span></span>
        </A>
        <nav className="flex-1 overflow-y-auto px-2" aria-label="Menu chính">
          {tabs.filter((t) => t.to !== '/admin/them' && t.to !== '/admin/nhat-ky').map((t) => (
            <A key={t.to} to={t.to} className={`flex min-h-11 items-center gap-3 px-3 font-semibold ${active(t.to) ? 'bg-glory' : 'hover:bg-white/10'}`}>
              <Icon name={t.icon} />{t.label}{badge(t.to)}
            </A>
          ))}
          <More me={me} compact path={path} />
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm text-neutral-400">{me.fullName}<br />{me.role === 'owner' ? 'Chủ CLB' : 'HLV'}</div>
      </aside>

      <main>{children}</main>

      {/* Thanh dưới (điện thoại) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-neutral-800 bg-ink pb-[env(safe-area-inset-bottom)] text-white lg:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} aria-label="Menu chính">
        {tabs.map((t) => (
          <A key={t.to} to={t.to} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active(t.to) ? 'text-glory' : 'text-neutral-300'}`}>
            <span className="relative">
              <Icon name={t.icon} className="size-6" />
              {badge(t.to) && <span className="absolute -right-3 -top-2">{badge(t.to)}</span>}
            </span>
            {t.label}
          </A>
        ))}
      </nav>
    </div>
  );
}

function Toasts() {
  const list = useToasts();
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 font-semibold text-white shadow-lg ${t.kind === 'ok' ? 'bg-ink' : 'bg-red-700'}`}>
          <Icon name={t.kind === 'ok' ? 'check' : 'x'} />{t.text}
        </div>
      ))}
    </div>
  );
}
