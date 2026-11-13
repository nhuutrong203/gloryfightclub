import { useState } from 'react';
import { api, can, siteUrl, toast, type Me } from '../lib';
import { A, Button, Icon, Page, PasswordInput } from '../ui';
import { RESOURCES, type ResourceKey } from '../resources';

type Item = { to: string; label: string; icon: string; sub?: string };

export function menuGroups(me: Me): { title: string; items: Item[] }[] {
  // Labels match the public sections. Subtitles describe what each item edits.
  // Use the resource title so the menu and page stay in sync.
  const res = (k: ResourceKey, icon: string, sub: string): Item => ({ to: `/admin/noi-dung/${k}`, label: RESOURCES[k].title, icon, sub });
  const content = can(me, 'content');
  return [
    {
      title: 'Quản lý CLB',
      items: [
        ...(can(me, 'students.view') ? [{ to: '/admin/hoc-vien', label: 'Học viên', icon: 'users' }, { to: '/admin/hoc-thu', label: 'Đăng ký học thử', icon: 'inbox', sub: 'Khách gửi từ form trên web' }] : []),
        ...(can(me, 'fees.view') ? [{ to: '/admin/hoc-phi', label: 'Thu học phí', icon: 'wallet', sub: 'Ghi nhận đã đóng theo tháng' }] : []),
      ],
    },
    {
      title: 'Trang web — menu chính',
      items: [
        ...(content ? [
          { to: '/admin/cai-dat#hero', label: 'Trang chủ', icon: 'home', sub: 'Sửa ảnh nền và lời giới thiệu. Lịch, HLV, học phí và các danh sách bên dưới lấy từ từng mục tương ứng.' },
          res('disciplines', 'star', 'Tên, mô tả, ảnh bìa từng môn'),
          res('classes', 'calendar', 'Lớp & giờ tập từng cơ sở'),
          res('coaches', 'users', 'Ảnh, chức danh, thành tích, nổi bật ở trang chủ'),
          res('feePlans', 'wallet', 'Các gói & giá trên trang Học phí'),
        ] : []),
        ...(can(me, 'posts') ? [{ to: '/admin/nhat-ky', label: 'Nhật ký lớp', icon: 'news', sub: 'Viết bài, ảnh, video buổi tập' }] : []),
        ...(content ? [res('locations', 'home', 'Địa chỉ, bản đồ, ảnh lịch từng cơ sở'),
          { to: '/admin/khong-gian', label: 'Không gian lớp học', icon: 'image', sub: 'Ảnh phòng tập theo từng cơ sở' }] : []),
      ],
    },
    {
      title: 'Trang web — mục phụ',
      items: content ? [
        { to: '/admin/cai-dat#about', label: 'Giới thiệu', icon: 'edit', sub: 'Câu chuyện, triết lý và các giá trị của CLB' },
        { to: '/admin/cai-dat#club', label: 'Liên hệ & mạng xã hội', icon: 'settings', sub: 'Tên CLB, slogan, hotline, Zalo và mạng xã hội' },
        res('achievements', 'star', 'Huy chương, ảnh lên bục (gắn HLV được)'),
        res('belts', 'edit', 'Hệ thống đai Kudo, Jiujitsu'),
        res('gallery', 'image', 'Ảnh & video CLB'),
        res('testimonials', 'edit', 'Học viên, phụ huynh nói gì'),
        res('partners', 'star', 'Ảnh, tên và liên kết của các đơn vị đồng hành'),
        res('faqs', 'edit', 'Câu hỏi thường gặp (hiện cả ở trang Học phí)'),
        { to: '/admin/cai-dat#policy', label: 'Quy định CLB', icon: 'edit', sub: 'Học phí, bảo lưu, an toàn — khách đồng ý khi đăng ký học thử' },
        { to: '/admin/chu-website', label: 'Chữ trên website', icon: 'edit', sub: 'Nút bấm, tiêu đề, câu cố định' },
      ] : [],
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
  location.assign('/admin'); // Explicit logout returns to login. The overlay is for expired sessions.
}

/** Mobile More page. Compact mode renders the desktop sidebar links. */
export function More({ me, compact, path }: { me: Me; compact?: boolean; path?: string }) {
  const groups = menuGroups(me);
  // Highlight only the settings link matching the current hash.
  const isActive = (to: string) => { const [base, hash] = to.split('#'); return !!path?.startsWith(base) && (!hash || location.hash === `#${hash}`); };
  if (compact) {
    return (
      <>
        {groups.slice(1).map((g) => (
          <div key={g.title} className="mt-5">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">{g.title}</p>
            {g.items.map((i) => (
              <A key={i.to + i.label} to={i.to} className={`flex min-h-10 items-center gap-3 px-3 text-sm ${isActive(i.to) ? 'bg-glory font-semibold' : 'text-neutral-300 hover:bg-white/10'}`}>
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
                <li key={i.to + i.label}>
                  <A to={i.to} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-neutral-50">
                    <Icon name={i.icon} className="size-5 shrink-0 text-glory" />
                    <span className="min-w-0"><b className="block">{i.label}</b>{i.sub && <span className="block text-sm text-neutral-500">{i.sub}</span>}</span>
                    <Icon name="chevron" className="ml-auto size-5 shrink-0 text-neutral-400" />
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
          await api('/admin/password', { body: { current, next } });
          toast('Đã đổi mật khẩu');
          setCurrent(''); setNext(''); setAgain('');
        } catch (err: any) { toast(err.message, 'err'); } finally { setBusy(false); }
      }}>
        <PasswordInput label="Mật khẩu hiện tại" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <PasswordInput label="Mật khẩu mới" autoComplete="new-password" minLength={8} required help="Tối thiểu 8 ký tự" value={next} onChange={(e) => setNext(e.target.value)} />
        <PasswordInput label="Nhập lại mật khẩu mới" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
        <Button type="submit" loading={busy}>Lưu mật khẩu mới</Button>
      </form>
    </Page>
  );
}
