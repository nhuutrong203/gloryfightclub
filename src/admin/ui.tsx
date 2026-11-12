import { useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { mediaUrl, navigate, toast, uploadImage } from './lib';

// Lucide-style outline icons
const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5m14 9h.01',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2m3.5-7h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14',
  back: 'm15 18-6-6 6-6',
  chevron: 'm9 18 6-6-6-6',
  up: 'm18 15-6-6-6 6',
  down: 'm6 9 6 6 6-6',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
  image: 'M21 15l-5-5L5 21M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm5.5 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3',
  news: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2m0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8m8 4h-8M10 6h8v4h-8z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.6a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3',
  key: 'm21 2-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8m0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  external: 'M15 3h6v6m-11 5L21 3m-3 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-16v6l4 2',
  star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  play: 'M7 4v16l13-8z',
  video: 'm22 8-6 4 6 4zM4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  'eye-off': 'M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2',
};
export function Icon({ name, className = '' }: { name: keyof typeof PATHS | string; className?: string }) {
  // Keep the default size when the supplied class only sets color.
  return (
    <svg viewBox="0 0 24 24" className={/size-/.test(className) ? className : `size-5 ${className}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// Buttons
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'dark' | 'ghost' | 'danger'; loading?: boolean; icon?: string };
export function Button({ variant = 'primary', loading, icon, className = '', children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-glory text-white hover:bg-red-700',
    dark: 'bg-ink text-white hover:bg-neutral-800',
    ghost: 'bg-white text-ink border border-neutral-300 hover:bg-neutral-100',
    danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function LinkButton({ to, children, icon, variant = 'ghost', className = '' }: { to: string; children: ReactNode; icon?: string; variant?: 'primary' | 'ghost' | 'dark'; className?: string }) {
  const styles = { primary: 'bg-glory text-white hover:bg-red-700', ghost: 'bg-white border border-neutral-300 hover:bg-neutral-100', dark: 'bg-ink text-white hover:bg-neutral-800' }[variant];
  return (
    <a href={to} onClick={(e) => { e.preventDefault(); navigate(to); }} className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 font-semibold transition-colors duration-150 ${styles} ${className}`}>
      {icon && <Icon name={icon} />}{children}
    </a>
  );
}

/** Open the matching public page in a new tab. */
export function ViewOnSite({ href, label = 'Xem trên web' }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center gap-1.5 border border-neutral-300 bg-white px-3 font-semibold hover:bg-neutral-100" title={label}>
      <Icon name="external" /><span className="hidden sm:inline">{label}</span>
    </a>
  );
}

export function A({ to, className = '', children, ...rest }: { to: string; className?: string; children: ReactNode; 'aria-label'?: string }) {
  return <a href={to} {...rest} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to); }}>{children}</a>;
}

// ───────── Khung trang ─────────
export function Page({ title, back, actions, children }: { title: string; back?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-4 lg:pb-12">
      <div className="mb-5 flex items-center gap-3">
        {back && (
          <A to={back} className="grid size-11 shrink-0 place-items-center border border-neutral-300 bg-white hover:bg-neutral-100" aria-label="Quay lại">
            <Icon name="back" />
          </A>
        )}
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide sm:text-4xl">{title}</h1>
        <div className="ml-auto flex gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}


export const Loading = () => (
  <div className="grid place-items-center py-16 text-neutral-500" role="status">
    <span className="size-8 animate-spin rounded-full border-4 border-neutral-300 border-t-glory" />
    <span className="sr-only">Đang tải…</span>
  </div>
);

export const ErrorBox = ({ message, retry }: { message: string; retry?: () => void }) => (
  <div className="border border-red-300 bg-red-50 p-4 text-red-800" role="alert">
    <p>{message}</p>
    {retry && <button className="mt-2 font-semibold underline" onClick={retry}>Thử lại</button>}
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">{children}</div>
);

export const Badge = ({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'red' | 'amber' | 'blue' }) => {
  const c = { gray: 'bg-neutral-100 text-neutral-700', green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-900', blue: 'bg-blue-100 text-blue-800' }[tone];
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${c}`}>{children}</span>;
};

// ───────── Form ─────────
export function Field({ label, help, error, children, htmlFor }: { label: string; help?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-neutral-800">{label}</label>
      {children}
      {help && !error && <p className="text-sm text-neutral-500">{help}</p>}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}

export const inputCls = 'w-full min-h-12 border border-neutral-300 bg-white px-3 text-base text-ink placeholder:text-neutral-400 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20';

export function TextInput({ label, help, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string; error?: string }) {
  const id = useId();
  return <Field label={label} help={help} error={error} htmlFor={id}><input id={id} className={inputCls} {...rest} /></Field>;
}

/** Allow mobile users to reveal the password while typing. */
export function PasswordInput({ label, help, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} help={help} htmlFor={id}>
      <div className="relative">
        <input id={id} {...rest} type={show ? 'text' : 'password'} className={`${inputCls} pr-14`} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show}
          className="absolute inset-y-0 right-0 grid w-12 cursor-pointer place-items-center text-neutral-500 hover:text-ink">
          <Icon name={show ? 'eye-off' : 'eye'} />
        </button>
      </div>
    </Field>
  );
}

/** Use a 24-hour time field on all devices.
 *  Native inputs may show AM/PM. Values use HH:MM, or an empty string. */
export function TimeInput({ label, value, onChange, required, help }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; help?: string }) {
  const id = useId();
  const [h = '', m = ''] = value ? value.split(':') : [];
  const pad = (n: number) => String(n).padStart(2, '0');
  // Use five-minute increments and preserve existing off-grid times.
  const mins = [...new Set([...Array.from({ length: 12 }, (_, i) => pad(i * 5)), ...(m ? [m] : [])])].sort();
  const pick = (hh: string, mm: string) => onChange(hh ? `${hh}:${mm || '00'}` : '');
  const sel = `${inputCls.replace('w-full', 'w-24')} cursor-pointer text-center font-semibold`; // Keep the controls compact.
  return (
    <Field label={label} help={help} htmlFor={id}>
      <div className="flex items-center gap-2">
        <select id={id} aria-label={`${label}: giờ`} required={required} value={h} onChange={(e) => pick(e.target.value, m)} className={sel}>
          <option value="">Giờ</option>
          {Array.from({ length: 24 }, (_, i) => pad(i)).map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <span className="font-display text-2xl" aria-hidden="true">:</span>
        <select aria-label={`${label}: phút`} disabled={!h} value={h ? m || '00' : ''} onChange={(e) => pick(h, e.target.value)} className={`${sel} disabled:opacity-50`}>
          {!h && <option value="">Phút</option>}
          {mins.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </Field>
  );
}

/** Accept common VND grouping separators and keep only digits.
 *  Show the formatted amount underneath so extra or missing zeros are visible. */
export function MoneyInput({ label, value, onChange, required, help }: { label: string; value: string; onChange: (digits: string) => void; required?: boolean; help?: string }) {
  const id = useId();
  const fmt = (d: string) => (d ? Number(d).toLocaleString('vi-VN') : '');
  const [text, setText] = useState(fmt(value));
  // Refresh the display when a parent control changes the amount.
  useEffect(() => { if (text.replace(/\D/g, '') !== value) setText(fmt(value)); }, [value]);
  const read = value ? `= ${Number(value).toLocaleString('vi-VN')} đ` : undefined;
  return (
    <Field label={label} help={[read, help].filter(Boolean).join(' · ') || undefined} htmlFor={id}>
      <input id={id} type="text" inputMode="numeric" autoComplete="off" required={required} className={inputCls} value={text}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')); }}
        onBlur={() => setText(fmt(value))} />
    </Field>
  );
}

export function TextArea({ label, help, value, onChange, rows = 4, required }: { label: string; help?: string; value: string; onChange: (v: string) => void; rows?: number; required?: boolean }) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id}>
      <textarea id={id} rows={rows} required={required} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} py-2.5 leading-relaxed`} />
    </Field>
  );
}

export function Select({ label, help, value, onChange, options, placeholder, required }: {
  label: string; help?: string; value: string | number | null | undefined; onChange: (v: string) => void;
  options: { value: string | number; label: string }[]; placeholder?: string; required?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id}>
      <select id={id} required={required} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 border border-neutral-200 bg-white px-3 py-2">
      <input type="checkbox" className="size-5 accent-glory" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-semibold">{label}</span>
        {help && <span className="block text-sm text-neutral-500">{help}</span>}
      </span>
    </label>
  );
}

/** Large selection chips for touch screens. */
export function Chips({ label, options, value, onChange, help }: { label: string; options: { value: number | string; label: string }[]; value: (number | string)[]; onChange: (v: any[]) => void; help?: string }) {
  return (
    <Field label={label} help={help}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={`min-h-11 border px-3 text-sm font-semibold transition-colors duration-150 cursor-pointer ${on ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white hover:bg-neutral-100'}`}>
              {on && <span className="sr-only">Đã chọn: </span>}{o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function ImageInput({ label, value, onChange, help }: { label: string; value: string | null; onChange: (key: string | null) => void; help?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null); // Preview the image before the upload finishes.
  const [pct, setPct] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  // Ignore an upload that finishes after the form closes.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  async function pick(f: File | undefined) {
    if (!f) return;
    const local = URL.createObjectURL(f);
    setPreview(local);
    setPct(0);
    try { const key = await uploadImage(f, setPct); if (alive.current) { onChange(key); toast('Đã tải ảnh — bấm Lưu để giữ ảnh này'); } } // The image is attached to the record only after Save.
    catch (err: any) { toast(err.message, 'err'); }
    finally { setPct(null); setPreview(null); URL.revokeObjectURL(local); }
  }
  const src = preview ?? (value ? mediaUrl(value) : null);

  return (
    <Field label={label} help={help ?? 'Bấm vào ô để chọn ảnh từ máy / chụp ảnh. Trên máy tính có thể kéo thả hoặc dán (Ctrl+V).'}>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" disabled={pct !== null}
          onClick={() => ref.current?.click()}
          onPaste={(e) => pick(e.clipboardData.files[0])}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
          className={`relative grid h-40 w-40 shrink-0 cursor-pointer place-items-center overflow-hidden border-2 border-dashed transition-colors sm:h-44 sm:w-56 ${over ? 'border-glory bg-red-50' : src ? 'border-transparent bg-neutral-100' : 'border-neutral-300 bg-neutral-50 hover:border-ink'}`}
          aria-label={src ? `Đổi ảnh: ${label}` : `Chọn ảnh: ${label}`}>
          {src
            ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
            : <span className="flex flex-col items-center gap-2 px-3 text-center text-sm font-semibold text-neutral-600"><Icon name="image" className="size-9 text-neutral-400" />Chọn ảnh</span>}
          {pct !== null && (
            <span className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-xs font-semibold text-white">
              {pct < 100 ? `Đang tải ${pct}%` : 'Đang lưu…'}
              <span className="mt-1 block h-1 bg-white/30"><span className="block h-full bg-glory transition-[width]" style={{ width: `${pct}%` }} /></span>
            </span>
          )}
        </button>
        <div className="flex flex-wrap gap-2">
          {src && pct === null && <Button type="button" variant="ghost" icon="image" onClick={() => ref.current?.click()}>Đổi ảnh</Button>}
          {value && pct === null && <Button type="button" variant="danger" onClick={() => onChange(null)}>Bỏ ảnh</Button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </Field>
  );
}

/** Use the browser's familiar confirmation dialog. */
export const confirmDanger = (msg: string) => window.confirm(msg);

/** Show Vietnamese first and collapse the English field. */
export function EnHint() {
  return <p className="text-xs text-neutral-500">Ô <b>English</b> có thể bỏ trống — trang tiếng Anh sẽ dùng bản tiếng Việt.</p>;
}
