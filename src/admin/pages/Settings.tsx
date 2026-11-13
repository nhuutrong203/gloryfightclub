import { useEffect, useState } from 'react';
import { api, siteUrl, toast, useApi, useDirty, usePath, useUploading } from '../lib';
import { Button, ErrorBox, ImageInput, Loading, Page, TextArea, TextInput, ViewOnSite } from '../ui';
import { policyVersionText } from '../../lib/util';
import type { PolicyGroup } from '../../lib/site';

type S = Record<string, any>;
// Keep a stable empty object for missing settings groups.
// A new object on each render would reset the form.
const NONE: S = {};

// Contact, home hero, and About settings are saved by group.
export function Settings() {
  const { data, error, reload } = useApi<Record<string, S>>('/admin/settings');
  const path = usePath();
  // The page stays dirty while any group has unsaved changes.
  const [dirty, setDirtyGroups] = useState<Record<string, boolean>>({});
  const markDirty = useDirty();
  useEffect(() => markDirty(Object.values(dirty).some(Boolean)), [dirty]);
  const onDirty = (k: string, on: boolean) => setDirtyGroups((x) => (x[k] === on ? x : { ...x, [k]: on }));
  // Scroll to the group named by the menu link after loading.
  useEffect(() => { if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); }, [data, path]);
  if (error) return <Page title="Trang chủ · Giới thiệu · Liên hệ" back="/admin/them"><ErrorBox message={error} retry={reload} /></Page>;
  if (!data) return <Loading />;
  return (
    <Page title="Trang chủ · Giới thiệu · Liên hệ" back="/admin/them">
      <div className="space-y-6">
        <Group title="Liên hệ & mạng xã hội" k="club" view="/lien-he" onDirty={onDirty} initial={data.club ?? NONE} fields={[
          ['name', 'Tên CLB'], ['slogan', 'Slogan'], ['tagline', 'Mô tả ngắn (hiện khi share link)', 'textarea'], ['tagline_en', 'Mô tả ngắn (English)', 'textarea'],
          ['hotlines', 'Hotline (cách nhau bằng dấu phẩy)', 'list'], ['zalo', 'Số Zalo'], ['facebook', 'Link Facebook'], ['instagram', 'Link Instagram'],
        ]} />
        <Group title="Ảnh & chữ lớn trang chủ" k="hero" view="/" onDirty={onDirty} initial={data.hero ?? NONE} fields={[
          ['image_key', 'Ảnh nền trang chủ', 'image'], ['title', 'Tiêu đề lớn (dùng dấu – để xuống dòng đỏ)'], ['title_en', 'Tiêu đề (English)'],
          ['subtitle', 'Dòng giới thiệu', 'textarea'], ['subtitle_en', 'Dòng giới thiệu (English)', 'textarea'],
        ]} />
        <Group title="Trang Giới thiệu" k="about" view="/gioi-thieu" onDirty={onDirty} initial={data.about ?? NONE} fields={[
          ['history', 'Câu chuyện / lịch sử CLB', 'textarea'], ['history_en', 'Our story (English)', 'textarea'],
          ['philosophy', 'Triết lý', 'textarea'], ['philosophy_en', 'Philosophy (English)', 'textarea'],
          ['values', 'Giá trị (mỗi dòng một ý)', 'lines'], ['values_en', 'Values (English, one per line)', 'lines'],
        ]} />
        {/* Rules appear at /quy-dinh and in the trial form. Each save creates a new version. */}
        <Group title="Quy định CLB" k="policy" view="/quy-dinh" onDirty={onDirty} initial={data.policy ?? NONE}
          note={`Mỗi dòng một ý. Bắt đầu dòng bằng số, dấu chấm và dấu cách để tạo tiêu đề mục. Dùng “Thêm nhóm quy định” để tạo một nhóm riêng. Khách đăng ký học thử phải đồng ý với quy định hiện hành.${data.policy?.updated ? ` Bản hiện tại: ${policyVersionText(data.policy.updated)}.` : ''}`} fields={[
          ['fees', 'Quy định học phí & bảo lưu', 'long'], ['fees_en', 'Fees & membership freeze (English)', 'long'],
          ['safety', 'An toàn tập luyện & nhận thức rủi ro', 'long'], ['safety_en', 'Training safety & risk acknowledgement (English)', 'long'],
        ]} />
      </div>
    </Page>
  );
}

type FieldDef = [key: string, label: string, kind?: 'textarea' | 'image' | 'list' | 'lines' | 'long'];

function Group({ title, k, view, initial, fields, onDirty, note }: { title: string; k: string; view: string; initial: S; fields: FieldDef[]; onDirty: (k: string, on: boolean) => void; note?: string }) {
  const toForm = (s: S) => ({
    ...Object.fromEntries(fields.map(([key, , kind]) => [key,
      kind === 'list' ? (s[key] ?? []).join(', ') : kind === 'lines' ? (s[key] ?? []).join('\n') : s[key] ?? ''])),
    ...(k === 'policy' ? { groups: s.groups ?? [] } : {}),
  });
  const [form, setForm] = useState<S>(() => toForm(initial));
  const [busy, setBusy] = useState(false);
  const uploading = useUploading();
  useEffect(() => setForm(toForm(initial)), [initial]);
  const set = (key: string) => (v: any) => { setForm((x) => ({ ...x, [key]: v })); onDirty(k, true); };
  const groups: PolicyGroup[] = form.groups ?? [];

  return (
    <form id={k} className="scroll-mt-20 space-y-4 border border-neutral-200 bg-white p-4" onSubmit={async (e) => {
      e.preventDefault();
      if (uploading) return toast('Đợi ảnh tải lên xong đã', 'err');
      setBusy(true);
      // Preserve existing keys that do not appear on the form.
      const value: S = { ...initial };
      if (k === 'policy') value.groups = groups;
      for (const [key, , kind] of fields) {
        const v = form[key];
        value[key] = kind === 'list' ? String(v).split(',').map((x) => x.trim()).filter(Boolean)
          : kind === 'lines' ? String(v).split('\n').map((x) => x.trim()).filter(Boolean)
          : v === '' ? null : v;
      }
      try { await api(`/admin/settings/${k}`, { method: 'PUT', body: value }); onDirty(k, false); toast('Đã lưu'); } catch (err: any) { toast(err.message, 'err'); } finally { setBusy(false); }
    }}>
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl uppercase">{title}</h2><ViewOnSite href={siteUrl(view)} label="Xem" /></div>
      {note && <p className="-mt-2 text-sm text-neutral-600">{note}</p>}
      {fields.map(([key, label, kind]) => (
        <div key={key}>
          {kind === 'image' ? <ImageInput label={label} value={form[key] || null} onChange={set(key)} />
            : kind === 'textarea' || kind === 'lines' || kind === 'long' ? <TextArea label={label} value={form[key]} onChange={set(key)} rows={kind === 'long' ? 14 : kind === 'lines' ? 4 : 3} />
            : <TextInput label={label} value={form[key]} onChange={(e) => set(key)(e.target.value)} />}
        </div>
      ))}
      {k === 'policy' && (
        <fieldset disabled={busy} className="min-w-0 space-y-4 border-t border-neutral-200 pt-4">
          {groups.map((group, index) => {
            const update = (key: 'title' | 'title_en' | 'text' | 'text_en', value: string) =>
              set('groups')(groups.map((item) => item.id === group.id ? { ...item, [key]: value } : item));
            return (
              <section key={group.id} className="space-y-3 border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold break-words [overflow-wrap:anywhere]">{group.title || 'Nhóm quy định mới'}</h3>
                  <Button type="button" variant="ghost" aria-label={`Xóa nhóm quy định ${index + 1}`}
                    onClick={() => set('groups')(groups.filter((item) => item.id !== group.id))}>Xóa nhóm</Button>
                </div>
                <TextInput label="Tên nhóm" value={group.title} required maxLength={160} onChange={(e) => update('title', e.target.value)} />
                <TextArea label="Nội dung" value={group.text} onChange={(v) => update('text', v)} required />
                <details>
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Bản tiếng Anh (tùy chọn)</summary>
                  <div className="space-y-3">
                    <TextInput label="Tên nhóm (English)" value={group.title_en ?? ''} maxLength={160} onChange={(e) => update('title_en', e.target.value)} />
                    <TextArea label="Nội dung (English)" value={group.text_en ?? ''} onChange={(v) => update('text_en', v)} />
                  </div>
                </details>
              </section>
            );
          })}
          <Button type="button" variant="ghost" disabled={groups.length >= 20} onClick={() =>
            set('groups')([...groups, { id: crypto.randomUUID(), title: '', text: '' }])}>Thêm nhóm quy định</Button>
        </fieldset>
      )}
      <Button type="submit" loading={busy} disabled={uploading} icon="check">{uploading ? 'Đang tải ảnh…' : `Lưu ${title.toLowerCase()}`}</Button>
    </form>
  );
}
