import { useEffect, useState } from 'react';
import { api, siteUrl, toast, useApi, useDirty, useUploading } from '../lib';
import { Button, ErrorBox, ImageInput, Loading, Page, TextArea, TextInput, ViewOnSite } from '../ui';

type S = Record<string, any>;
// Nhóm chưa có trong DB (vd. "about" chưa lưu lần nào): dùng 1 object cố định. `?? {}` tạo object mới mỗi lần vẽ
// → Group tưởng dữ liệu đổi → xoá chữ đang gõ.
const NONE: S = {};

// Thông tin chung: liên hệ, hero trang chủ, trang Giới thiệu. Mỗi nhóm lưu riêng.
export function Settings() {
  const { data, error, reload } = useApi<Record<string, S>>('/admin/settings');
  // Mỗi nhóm lưu riêng → cờ "chưa lưu" của trang = còn nhóm nào đang sửa dở.
  const [dirty, setDirtyGroups] = useState<Record<string, boolean>>({});
  const markDirty = useDirty();
  useEffect(() => markDirty(Object.values(dirty).some(Boolean)), [dirty]);
  const onDirty = (k: string, on: boolean) => setDirtyGroups((x) => (x[k] === on ? x : { ...x, [k]: on }));
  // Mở từ menu "Trang chủ" (#hero) / "Giới thiệu · Liên hệ chung" (#club): cuộn tới đúng nhóm khi tải xong.
  useEffect(() => { if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); }, [data]);
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
        {/* Quy định CLB: trang /quy-dinh + ô "Tôi đồng ý" ở form học thử. Lưu = phiên bản mới (ngày lưu), đăng ký sau đó ghi nhận bản này. */}
        <Group title="Quy định CLB" k="policy" view="/quy-dinh" onDirty={onDirty} initial={data.policy ?? NONE}
          note={`Mỗi dòng một ý; dòng bắt đầu bằng số và dấu chấm ("1. Quy định học phí") là tiêu đề mục. Khách đăng ký học thử phải đánh dấu đồng ý (dưới 18 tuổi: phụ huynh xác nhận). Để trống cả hai phần thì ẩn trang và ô đồng ý.${data.policy?.updated ? ` Bản hiện tại: ${data.policy.updated.split('-').reverse().join('/')}.` : ''}`} fields={[
          ['fees', 'Quy định học phí & bảo lưu', 'long'], ['fees_en', 'Fees & membership freeze (English)', 'long'],
          ['safety', 'An toàn tập luyện & nhận thức rủi ro', 'long'], ['safety_en', 'Training safety & risk acknowledgement (English)', 'long'],
        ]} />
      </div>
    </Page>
  );
}

type FieldDef = [key: string, label: string, kind?: 'textarea' | 'image' | 'list' | 'lines' | 'long'];

function Group({ title, k, view, initial, fields, onDirty, note }: { title: string; k: string; view: string; initial: S; fields: FieldDef[]; onDirty: (k: string, on: boolean) => void; note?: string }) {
  const toForm = (s: S) => Object.fromEntries(fields.map(([key, , kind]) => [key,
    kind === 'list' ? (s[key] ?? []).join(', ') : kind === 'lines' ? (s[key] ?? []).join('\n') : s[key] ?? '']));
  const [form, setForm] = useState<S>(() => toForm(initial));
  const [busy, setBusy] = useState(false);
  const uploading = useUploading();
  useEffect(() => setForm(toForm(initial)), [initial]);
  const set = (key: string) => (v: any) => { setForm((x) => ({ ...x, [key]: v })); onDirty(k, true); };

  return (
    <form id={k} className="scroll-mt-20 space-y-4 border border-neutral-200 bg-white p-4" onSubmit={async (e) => {
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
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl uppercase">{title}</h2><ViewOnSite href={siteUrl(view)} label="Xem" /></div>
      {note && <p className="-mt-2 text-sm text-neutral-600">{note}</p>}
      {fields.map(([key, label, kind]) => (
        <div key={key}>
          {kind === 'image' ? <ImageInput label={label} value={form[key] || null} onChange={set(key)} />
            : kind === 'textarea' || kind === 'lines' || kind === 'long' ? <TextArea label={label} value={form[key]} onChange={set(key)} rows={kind === 'long' ? 14 : kind === 'lines' ? 4 : 3} />
            : <TextInput label={label} value={form[key]} onChange={(e) => set(key)(e.target.value)} />}
        </div>
      ))}
      <Button type="submit" loading={busy} disabled={uploading} icon="check">{uploading ? 'Đang tải ảnh…' : `Lưu ${title.toLowerCase()}`}</Button>
    </form>
  );
}
