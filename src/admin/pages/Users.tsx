import { useState } from 'react';
import { api, toast, useApi, type Me } from '../lib';
import { Badge, Button, ErrorBox, Loading, Page, Select, TextInput, Toggle } from '../ui';
import type { Lookups } from './Students';

type User = { id: number; username: string; fullName: string; role: 'owner' | 'coach'; permissions: string[]; coachId: number | null; isActive: boolean };
type Data = { users: User[]; permissions: Record<string, string>; defaults: string[] };

export function Users({ me }: { me: Me }) {
  const { data, error, reload } = useApi<Data>('/admin/users');
  const lk = useApi<Lookups>('/admin/lookups').data;
  const [adding, setAdding] = useState(false);
  if (error) return <Page title="Tài khoản" back="/admin/them"><ErrorBox message={error} retry={reload} /></Page>;
  if (!data || !lk) return <Loading />;

  return (
    <Page title="Tài khoản" back="/admin/them" actions={!adding && <Button icon="plus" onClick={() => setAdding(true)}>Thêm</Button>}>
      <p className="-mt-2 mb-4 text-neutral-600">Tạo tài khoản cho các HLV và chọn họ được làm gì. Chủ CLB luôn có toàn quyền.</p>
      {/* Only an owner can reset another user's password. Use the CLI if the sole owner loses access. */}
      {data.users.filter((u) => u.role === 'owner' && u.isActive).length < 2 && (
        <div className="mb-4 border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <b className="block">Nên có thêm 1 tài khoản Chủ CLB dự phòng</b>
          <span className="text-sm">Chỉ Chủ CLB mới đặt lại được mật khẩu. Nếu chỉ có một tài khoản Chủ CLB mà quên mật khẩu thì không ai vào lại được — tạo thêm một tài khoản vai trò "Chủ CLB" cho người tin cậy (hoặc cho chính bạn), cất mật khẩu cẩn thận.</span>
        </div>
      )}
      {adding && <NewUser data={data} lk={lk} onDone={() => { setAdding(false); reload(); }} onCancel={() => setAdding(false)} />}
      <ul className="space-y-3">
        {data.users.map((u) => <UserCard key={u.id} u={u} me={me} data={data} lk={lk} reload={reload} />)}
      </ul>
    </Page>
  );
}

function PermBoxes({ perms, value, onChange }: { perms: Record<string, string>; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">Quyền được làm</legend>
      {Object.entries(perms).map(([k, label]) => (
        <Toggle key={k} label={label} checked={value.includes(k)} onChange={(on) => onChange(on ? [...value, k] : value.filter((x) => x !== k))} />
      ))}
    </fieldset>
  );
}

function UserCard({ u, me, data, lk, reload }: { u: User; me: Me; data: Data; lk: Lookups; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState(u.permissions);
  const [role, setRole] = useState(u.role);
  const [coachId, setCoachId] = useState(String(u.coachId ?? ''));
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const self = u.id === me.id;

  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await api(`/admin/users/${u.id}`, { method: 'PUT', body: { role, permissions: perms, coachId: coachId ? Number(coachId) : null, ...(password ? { password } : {}), ...extra } });
      toast(password ? 'Đã lưu và đặt mật khẩu mới' : 'Đã lưu');
      setPassword('');
      reload();
    } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  return (
    <li className={`border bg-white ${u.isActive ? 'border-neutral-200' : 'border-dashed border-neutral-300 opacity-70'}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left cursor-pointer">
        <span className="min-w-0 flex-1">
          <b className="block truncate">{u.fullName}{self && ' (bạn)'}</b>
          <span className="text-sm text-neutral-500">@{u.username}</span>
        </span>
        {!u.isActive && <Badge>Đã khoá</Badge>}
        <Badge tone={u.role === 'owner' ? 'red' : 'blue'}>{u.role === 'owner' ? 'Chủ CLB' : 'HLV'}</Badge>
      </button>
      {open && (
        <div className="space-y-4 border-t border-neutral-200 p-4">
          <Select label="Vai trò" value={role} onChange={(v) => setRole(v as User['role'])} options={[{ value: 'coach', label: 'HLV (theo quyền bên dưới)' }, { value: 'owner', label: 'Chủ CLB (toàn quyền)' }]} />
          <Select label="Là HLV nào trên website" value={coachId} onChange={setCoachId} placeholder="Không gắn" options={lk.coaches.map((c) => ({ value: c.id, label: c.name }))} />
          {role === 'coach' && <PermBoxes perms={data.permissions} value={perms} onChange={setPerms} />}
          <TextInput label="Đặt mật khẩu mới" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} help="Bỏ trống nếu không đổi. Tối thiểu 8 ký tự." />
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} icon="check" onClick={() => save()}>Lưu</Button>
            {!self && (u.isActive
              ? <Button variant="danger" onClick={() => confirm(`Khoá tài khoản ${u.fullName}? Người này sẽ bị đăng xuất.`) && save({ isActive: false })}>Khoá tài khoản</Button>
              : <Button variant="ghost" onClick={() => save({ isActive: true })}>Mở khoá</Button>)}
          </div>
        </div>
      )}
    </li>
  );
}

function NewUser({ data, lk, onDone, onCancel }: { data: Data; lk: Lookups; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ username: '', fullName: '', password: '', role: 'coach', coachId: '', permissions: data.defaults });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: any) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form className="mb-6 space-y-4 border-2 border-ink bg-white p-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        await api('/admin/users', { body: { ...f, coachId: f.coachId ? Number(f.coachId) : null } });
        toast(`Đã tạo tài khoản ${f.username}`);
        onDone();
      } catch (err: any) { toast(err.message, 'err'); setBusy(false); }
    }}>
      <h2 className="font-display text-2xl uppercase">Tài khoản mới</h2>
      <Select label="Chọn HLV (tự điền tên)" value={f.coachId} placeholder="Không gắn" onChange={(v) => {
        const c = lk.coaches.find((x) => x.id === Number(v));
        setF((x) => ({ ...x, coachId: v, fullName: c && !x.fullName ? c.name : x.fullName }));
      }} options={lk.coaches.map((c) => ({ value: c.id, label: c.name }))} />
      <TextInput label="Họ tên *" required value={f.fullName} onChange={(e) => set('fullName')(e.target.value)} />
      <TextInput label="Tên đăng nhập *" required autoCapitalize="none" pattern="[a-zA-Z0-9._\-]{3,32}" value={f.username} onChange={(e) => set('username')(e.target.value)} help="Chữ không dấu, số, dấu chấm. Vd: phong, tinh.ninh" />
      <TextInput label="Mật khẩu *" type="text" required minLength={8} autoComplete="off" value={f.password} onChange={(e) => set('password')(e.target.value)} help="Tối thiểu 8 ký tự. Gửi cho HLV, họ tự đổi sau khi đăng nhập." />
      <Select label="Vai trò" value={f.role} onChange={set('role')} options={[{ value: 'coach', label: 'HLV (theo quyền bên dưới)' }, { value: 'owner', label: 'Chủ CLB (toàn quyền)' }]} />
      {f.role === 'coach' && <PermBoxes perms={data.permissions} value={f.permissions} onChange={set('permissions')} />}
      <div className="flex gap-2">
        <Button type="submit" loading={busy} icon="check">Tạo tài khoản</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Huỷ</Button>
      </div>
    </form>
  );
}
