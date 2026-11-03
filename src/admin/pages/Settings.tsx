import { useEffect, useState } from 'react';
import { api, toast, useApi, useDirty, useUploading } from '../lib';
import { Button, ErrorBox, ImageInput, Loading, Page, TextArea, TextInput } from '../ui';

type S = Record<string, any>;

// Thông tin chung: liên hệ, hero trang chủ, trang Giới thiệu. Mỗi nhóm lưu riêng.
export function Settings() {
  const { data, error, reload } = useApi<Record<string, S>>('/admin/settings');
  // Mỗi nhóm lưu riêng → cờ "chưa lưu" của trang = còn nhóm nào đang sửa dở.
  const [dirty, setDirtyGroups] = useState<Record<string, boolean>>({});
  const markDirty = useDirty();
  useEffect(() => markDirty(Object.values(dirty).some(Boolean)), [dirty]);
  const onDirty = (k: string, on: boolean) => setDirtyGroups((x) => (x[k] === on ? x : { ...x, [k]: on }));
  if (error) return <Page title="Thông tin CLB" back="/admin/them"><ErrorBox message={error} retry={reload} /></Page>;
  if (!data) return <Loading />;
  return (
    <Page title="Thông tin CLB" back="/admin/them">
      <div className="space-y-6">
        <Group title="Liên hệ & mạng xã hội" k="club" onDirty={onDirty} initial={data.club ?? {}} fields={[
          ['name', 'Tên CLB'], ['slogan', 'Slogan'], ['tagline', 'Mô tả ngắn (hiện khi share link)', 'textarea'], ['tagline_en', 'Mô tả ngắn (English)', 'textarea'],
          ['hotlines', 'Hotline (cách nhau bằng dấu phẩy)', 'list'], ['zalo', 'Số Zalo'], ['facebook', 'Link Facebook'], ['instagram', 'Link Instagram'],
        ]} />
        <Group title="Ảnh & chữ lớn trang chủ" k="hero" onDirty={onDirty} initial={data.hero ?? {}} fields={[
          ['image_key', 'Ảnh nền trang chủ', 'image'], ['title', 'Tiêu đề lớn (dùng dấu – để xuống dòng đỏ)'], ['title_en', 'Tiêu đề (English)'],
          ['subtitle', 'Dòng giới thiệu', 'textarea'], ['subtitle_en', 'Dòng giới thiệu (English)', 'textarea'],
        ]} />
        <Group title="Trang Giới thiệu" k="about" onDirty={onDirty} initial={data.about ?? {}} fields={[
          ['history', 'Câu chuyện / lịch sử CLB', 'textarea'], ['history_en', 'Our story (English)', 'textarea'],
          ['philosophy', 'Triết lý', 'textarea'], ['philosophy_en', 'Philosophy (English)', 'textarea'],
          ['values', 'Giá trị (mỗi dòng một ý)', 'lines'], ['values_en', 'Values (English, one per line)', 'lines'],
        ]} />
      </div>
    </Page>
  );
}

type FieldDef = [key: string, label: string, kind?: 'textarea' | 'image' | 'list' | 'lines'];

function Group({ title, k, initial, fields, onDirty }: { title: string; k: string; initial: S; fields: FieldDef[]; onDirty: (k: string, on: boolean) => void }) {
  const toForm = (s: S) => Object.fromEntries(fields.map(([key, , kind]) => [key,
    kind === 'list' ? (s[key] ?? []).join(', ') : kind === 'lines' ? (s[key] ?? []).join('\n') : s[key] ?? '']));
  const [form, setForm] = useState<S>(() => toForm(initial));
  const [busy, setBusy] = useState(false);
  const uploading = useUploading();
  useEffect(() => setForm(toForm(initial)), [initial]);
  const set = (key: string) => (v: any) => { setForm((x) => ({ ...x, [key]: v })); onDirty(k, true); };

  return (
    <form className="space-y-4 border border-neutral-200 bg-white p-4" onSubmit={async (e) => {
      e.preventDefault();
      if (uploading) return toast('Đợi ảnh tải lên xong đã', 'err');
      setBusy(true);
      // Giữ các khoá cũ không có trên form (vd. dữ liệu thêm sau này).
      const value: S = { ...initial };
      for (const [key, , kind] of fields) {
        const v = form[key];
        value[key] = kind === 'list' ? String(v).split(',').map((x) => x.trim()).filter(Boolean)
          : kind === 'lines' ? String(v).split('\n').map((x) => x.trim()).filter(Boolean)
          : v === '' ? null : v;
      }
      try { await api(`/admin/settings/${k}`, { method: 'PUT', body: value }); onDirty(k, false); toast('Đã lưu'); } catch (err: any) { toast(err.message, 'err'); } finally { setBusy(false); }
    }}>
      <h2 className="font-display text-2xl uppercase">{title}</h2>
      {fields.map(([key, label, kind]) => (
        <div key={key}>
          {kind === 'image' ? <ImageInput label={label} value={form[key] || null} onChange={set(key)} />
            : kind === 'textarea' || kind === 'lines' ? <TextArea label={label} value={form[key]} onChange={set(key)} rows={kind === 'lines' ? 4 : 3} />
            : <TextInput label={label} value={form[key]} onChange={(e) => set(key)(e.target.value)} />}
        </div>
      ))}
      <Button type="submit" loading={busy} disabled={uploading} icon="check">{uploading ? 'Đang tải ảnh…' : `Lưu ${title.toLowerCase()}`}</Button>
    </form>
  );
}
