import { useEffect, useMemo, useState } from 'react';
import { dict, type DictKey } from '../../i18n';
import { api, toast, useApi, useDirty } from '../lib';
import { Button, ErrorBox, Icon, Loading, Page, inputCls } from '../ui';

type Texts = { vi: Record<string, string>; en: Record<string, string> };

// Group dictionary keys by prefix so staff can find text by page.
const GROUPS: [string, RegExp][] = [
  ['Menu', /^nav_/],
  ['Nút bấm', /^cta_|^read_more$|^view_coach$|^directions$|^menu$|^close$/],
  ['Nhãn nhỏ đầu trang', /^eb_/],
  ['Trang chủ', /^(today|news|testimonials|achievements|final_cta|disciplines|coaches|locations|medal)_|^medals_/],
  ['Học phí & Open mat', /^(fees_|per_month|open_mat|free$)/],
  ['Lịch học', /^(schedule_|time$|coach$|classes_label|level_)/],
  ['Cấp đai', /^belts_/],
  ['Thư viện', /^(gallery_|watch_video)/],
  ['Hỏi đáp', /^faq_/],
  ['Giới thiệu', /^about_/],
  ['Liên hệ', /^(contact_|hotline|social|map_)/],
  ['Form đăng ký học thử', /^(trial_|f_)/],
  ['Quy định CLB', /^policy_/],
  ['Trang không tìm thấy (404)', /^notfound_|^home$/],
];
const groupOf = (k: string) => GROUPS.find(([, re]) => re.test(k))?.[0] ?? 'Phân trang, chân trang';
const KEYS = Object.keys(dict.vi) as DictKey[];

export function Texts() {
  const { data, error, reload } = useApi<Record<string, any>>('/admin/settings');
  const [texts, setTexts] = useState<Texts>({ vi: {}, en: {} });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const markDirty = useDirty();
  useEffect(() => markDirty(dirty), [dirty]);

  useEffect(() => { if (data) setTexts({ vi: data.texts?.vi ?? {}, en: data.texts?.en ?? {} }); }, [data]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const hit = (k: DictKey) => !term || [dict.vi[k], dict.en[k], texts.vi[k], texts.en[k]].some((s) => s?.toLowerCase().includes(term));
    const map = new Map<string, DictKey[]>();
    for (const k of KEYS.filter(hit)) map.set(groupOf(k), [...(map.get(groupOf(k)) ?? []), k]);
    return [...map];
  }, [q, texts]);

  if (error) return <Page title="Chữ trên website" back="/admin/them"><ErrorBox message={error} retry={reload} /></Page>;
  if (!data) return <Loading />;

  const set = (lang: 'vi' | 'en', k: string, v: string) => { setTexts((x) => ({ ...x, [lang]: { ...x[lang], [k]: v } })); setDirty(true); };
  const edited = (lang: 'vi' | 'en') => Object.values(texts[lang]).filter((v) => v.trim()).length;

  async function save() {
    setBusy(true);
    // Save only nonempty overrides that differ from the defaults.
    const clean = (lang: 'vi' | 'en') => Object.fromEntries(Object.entries(texts[lang]).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v && v !== dict[lang][k as DictKey]));
    try {
      await api('/admin/settings/texts', { method: 'PUT', body: { vi: clean('vi'), en: clean('en') } });
      toast('Đã lưu — website cập nhật trong khoảng 1 phút');
      setDirty(false);
    } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  }

  return (
    <Page title="Chữ trên website" back="/admin/them">
      <p className="-mt-2 mb-4 text-neutral-600">
        Sửa mọi câu chữ cố định trên website (tiêu đề mục, câu chào mời, nhãn nút…). Bỏ trống = dùng câu mặc định (chữ xám).
        Đang sửa <b>{edited('vi')}</b> câu tiếng Việt, <b>{edited('en')}</b> câu tiếng Anh.
      </p>
      <div className="relative mb-5">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-neutral-400" />
        <input type="search" aria-label="Tìm câu chữ" placeholder="Tìm câu cần sửa, vd: buổi đầu tiên" className={`${inputCls} pl-10`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-3">
        {groups.map(([title, keys]) => (
          <details key={title} open={!!q.trim()} className="group border border-neutral-200 bg-white">
            <summary className="flex min-h-14 cursor-pointer items-center gap-3 px-4 font-display text-xl uppercase">
              {title}
              <span className="font-sans text-sm normal-case text-neutral-500">{keys.length} câu{keys.some((k) => texts.vi[k]?.trim() || texts.en[k]?.trim()) ? ' · có chỉnh sửa' : ''}</span>
              <Icon name="chevron" className="ml-auto size-5 text-neutral-400 transition-transform group-open:rotate-90" />
            </summary>
            <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
              {keys.map((k) => (
                <li key={k} className="grid gap-2 p-3 sm:grid-cols-2">
                  {(['vi', 'en'] as const).map((lang) => (
                    <label key={lang} className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                      <input className={`${inputCls} ${texts[lang][k]?.trim() ? 'border-ink bg-amber-50' : ''}`} value={texts[lang][k] ?? ''} placeholder={dict[lang][k]}
                        onChange={(e) => set(lang, k, e.target.value)} />
                    </label>
                  ))}
                </li>
              ))}
            </ul>
          </details>
        ))}
        {groups.length === 0 && <p className="text-neutral-500">Không tìm thấy câu nào.</p>}
      </div>

      {dirty && (
        <div className="sticky bottom-20 z-10 mt-6 flex gap-3 lg:bottom-4">
          <Button onClick={save} loading={busy} icon="check" className="flex-1 sm:flex-none">Lưu chữ trên website</Button>
        </div>
      )}
    </Page>
  );
}
