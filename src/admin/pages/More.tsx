import { useState } from 'react';
import { api, can, siteUrl, toast, type Me } from '../lib';
import { A, Button, Icon, Page, PasswordInput } from '../ui';
import { RESOURCES, type ResourceKey } from '../resources';

type Item = { to: string; label: string; icon: string; sub?: string };

export function menuGroups(me: Me): { title: string; items: Item[] }[] {
  // label = tên mục như khách thấy trên web; sub = phần đó sửa ở đâu / gồm gì.
  // Tên = tiêu đề trang trong resources.ts (cũng là tên trên web) → menu và trang luôn khớp.
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
          { to: '/admin/cai-dat#hero', label: 'Trang chủ', icon: 'home', sub: 'Ảnh nền, tiêu đề lớn · HLV "nổi bật" chọn ở mục HLV' },
          res('disciplines', 'star', 'Tên, mô tả, ảnh bìa từng môn'),
          res('classes', 'calendar', 'Lớp & giờ tập từng cơ sở'),
          res('coaches', 'users', 'Ảnh, chức danh, thành tích, nổi bật ở trang chủ'),
          res('feePlans', 'wallet', 'Các gói & giá trên trang Học phí'),
        ] : []),
        ...(can(me, 'posts') ? [{ to: '/admin/nhat-ky', label: 'Nhật ký lớp', icon: 'news', sub: 'Viết bài, ảnh, video buổi tập' }] : []),
        ...(content ? [res('locations', 'home', 'Địa chỉ, bản đồ, ảnh lịch từng cơ sở')] : []),
      ],
    },
    {
      title: 'Trang web — mục phụ',
      items: content ? [
        { to: '/admin/cai-dat#club', label: 'Giới thiệu · Liên hệ chung', icon: 'settings', sub: 'Câu chuyện CLB, hotline, Zalo, Facebook' },
        res('achievements', 'star', 'Huy chương, ảnh lên bục (gắn HLV được)'),
        res('belts', 'edit', 'Hệ thống đai Kudo, Jiujitsu'),
        res('gallery', 'image', 'Ảnh & video CLB'),
        res('testimonials', 'edit', 'Học viên, phụ huynh nói gì'),
        res('faqs', 'edit', 'Câu hỏi thường gặp (hiện cả ở trang Học phí)'),
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
  location.assign('/admin'); // tải lại hẳn → màn hình đăng nhập (glory:logout chỉ dành cho phiên hết hạn: hiện ô đăng nhập đè lên trang)
}

/** Trang "Thêm" trên điện thoại; `compact` = phần dưới menu trái trên máy tính. */
export function More({ me, compact, path }: { me: Me; compact?: boolean; path?: string }) {
  const groups = menuGroups(me);
  // Hai mục cùng trang Cài đặt (#hero, #club) → chỉ sáng mục đang xem.
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
