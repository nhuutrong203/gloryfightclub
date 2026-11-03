import { useState } from 'react';
import { api, can, navigate, siteUrl, toast, type Me } from '../lib';
import { A, Button, Icon, Page, TextInput } from '../ui';
import { RESOURCES, type ResourceKey } from '../resources';

type Item = { to: string; label: string; icon: string };

export function menuGroups(me: Me): { title: string; items: Item[] }[] {
  const res = (k: ResourceKey, icon = 'edit'): Item => ({ to: `/admin/noi-dung/${k}`, label: RESOURCES[k].title, icon });
  return [
    {
      title: 'Quản lý',
      items: [
        ...(can(me, 'students.view') ? [{ to: '/admin/hoc-vien', label: 'Học viên', icon: 'users' }, { to: '/admin/hoc-thu', label: 'Đăng ký học thử', icon: 'inbox' }] : []),
        ...(can(me, 'fees.view') ? [{ to: '/admin/hoc-phi', label: 'Học phí', icon: 'wallet' }] : []),
        ...(can(me, 'posts') ? [{ to: '/admin/tin-tuc', label: 'Nhật ký lớp học', icon: 'news' }] : []),
      ],
    },
    {
      title: 'Nội dung website',
      items: can(me, 'content')
        ? [res('classes', 'calendar'), res('coaches', 'users'), res('disciplines', 'star'), res('feePlans', 'wallet'), res('locations', 'home'),
           res('gallery', 'image'), res('achievements', 'star'), res('testimonials'), res('faqs'), res('belts'),
           { to: '/admin/cai-dat', label: 'Thông tin CLB & trang chủ', icon: 'settings' },
           { to: '/admin/chu-website', label: 'Chữ trên website', icon: 'edit' }]
        : [],
    },
    {
      title: 'Tài khoản',
      items: [
        ...(me.role === 'owner' ? [{ to: '/admin/tai-khoan', label: 'Tài khoản & phân quyền', icon: 'key' }] : []),
        { to: '/admin/doi-mat-khau', label: 'Đổi mật khẩu', icon: 'key' },
      ],
    },
  ].filter((g) => g.items.length);
}

async function logout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  window.dispatchEvent(new Event('glory:logout'));
  navigate('/admin', true);
}

/** Trang "Thêm" trên điện thoại; `compact` = phần dưới menu trái trên máy tính. */
export function More({ me, compact, path }: { me: Me; compact?: boolean; path?: string }) {
  const groups = menuGroups(me);
  if (compact) {
    return (
      <>
        {groups.slice(1).map((g) => (
          <div key={g.title} className="mt-5">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">{g.title}</p>
            {g.items.map((i) => (
              <A key={i.to} to={i.to} className={`flex min-h-10 items-center gap-3 px-3 text-sm ${path?.startsWith(i.to) ? 'bg-glory font-semibold' : 'text-neutral-300 hover:bg-white/10'}`}>
                <Icon name={i.icon} className="size-4" />{i.label}
              </A>
            ))}
          </div>
        ))}
        <button onClick={logout} className="mt-5 flex min-h-10 w-full items-center gap-3 px-3 text-sm text-neutral-300 hover:bg-white/10 cursor-pointer"><Icon name="logout" className="size-4" />Đăng xuất</button>
      </>
    );
  }
  return (
    <Page title="Thêm">
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">{g.title}</h2>
            <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
              {g.items.map((i) => (
                <li key={i.to}>
                  <A to={i.to} className="flex min-h-14 items-center gap-3 px-4 font-semibold hover:bg-neutral-50">
                    <Icon name={i.icon} className="size-5 text-glory" />{i.label}<Icon name="chevron" className="ml-auto size-5 text-neutral-400" />
                  </A>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <a href={siteUrl()} target="_blank" rel="noopener" className="flex min-h-14 items-center gap-3 border border-neutral-200 bg-white px-4 font-semibold hover:bg-neutral-50"><Icon name="external" className="size-5 text-glory" />Xem website</a>
        <Button variant="ghost" icon="logout" className="w-full" onClick={logout}>Đăng xuất</Button>
      </div>
    </Page>
  );
}

export function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Page title="Đổi mật khẩu" back="/admin/them">
      <form className="max-w-md space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        if (next !== again) return toast('Hai mật khẩu mới không khớp', 'err');
        setBusy(true);
        try {
          await api('/auth/password', { body: { current, next } });
          toast('Đã đổi mật khẩu');
          setCurrent(''); setNext(''); setAgain('');
        } catch (err: any) { toast(err.message, 'err'); } finally { setBusy(false); }
      }}>
        <TextInput label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <TextInput label="Mật khẩu mới" type="password" autoComplete="new-password" minLength={8} required help="Tối thiểu 8 ký tự" value={next} onChange={(e) => setNext(e.target.value)} />
        <TextInput label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
        <Button type="submit" loading={busy}>Lưu mật khẩu mới</Button>
      </form>
    </Page>
  );
}
