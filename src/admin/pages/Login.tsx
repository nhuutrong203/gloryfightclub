import { useState } from 'react';
import { api } from '../lib';
import { Button, PasswordInput, TextInput } from '../ui';

/** overlay: phiên hết hạn giữa chừng → ô đăng nhập nằm ĐÈ lên trang đang mở, đăng nhập lại là làm tiếp, không mất gì. */
export function Login({ onLogin, overlay = false }: { onLogin: () => void; overlay?: boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className={overlay ? 'fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/70 px-4 py-6' : 'grid min-h-dvh place-items-center bg-ink px-4'}
      role={overlay ? 'dialog' : undefined} aria-modal={overlay || undefined} aria-label={overlay ? 'Đăng nhập lại' : undefined}>
      <form
        className="w-full max-w-sm bg-white p-6 text-ink"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/auth/login', { body: { username, password } });
            onLogin();
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-ink p-2"><img src="/logo.svg" alt="" className="h-10 w-auto" /></div>
          <div>
            <h1 className="font-display text-3xl uppercase leading-none">Glory CMS</h1>
            <p className="text-sm text-neutral-500">Quản lý học viên & website</p>
          </div>
        </div>
        {overlay && (
          <p className="mb-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi bấm Lưu lần nữa — <b>những gì bạn đang gõ vẫn còn nguyên</b>.
          </p>
        )}
        <div className="space-y-4">
          <TextInput label="Tên đăng nhập" autoComplete="username" autoCapitalize="none" required value={username} onChange={(e) => setUsername(e.target.value)} />
          <PasswordInput label="Mật khẩu" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">Đăng nhập</Button>
        </div>
        <p className="mt-6 text-sm text-neutral-500">Quên mật khẩu? Nhờ chủ CLB đặt lại trong mục Tài khoản.</p>
      </form>
    </div>
  );
}
