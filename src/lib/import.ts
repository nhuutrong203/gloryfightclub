// Đọc dữ liệu chữ từ file Excel/CSV nhập học viên. Không import gì để test chạy thẳng bằng node (tests/).

/** Bỏ dấu, chữ thường: "Nguyễn Văn A" → "nguyen van a". */
export const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** "15/08/2026", "2026-08-15", "2026-08-15T…" → "2026-08-15"; không đọc được → null. */
export function parseDate(v?: string) {
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/** Excel hay làm mất số 0 đầu SĐT (912345678) → thêm lại. */
export const fixPhone = (v?: string) => (v && /^\d{9}$/.test(v.replace(/\D/g, '')) ? '0' + v.replace(/\D/g, '') : v || null);

export const STATUS_IN: Record<string, 'active' | 'paused' | 'quit'> = { 'dang hoc': 'active', active: 'active', 'tam nghi': 'paused', paused: 'paused', 'da nghi': 'quit', nghi: 'quit', quit: 'quit' };

const initials = (x: string) => fold(x).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0]).join('');

/** Khớp tên không dấu, hoặc viết tắt chữ cái đầu ("HSSV" = "Học sinh – Sinh viên"). Không khớp → null. */
export const byName = <T extends { id: number; name: string }>(list: T[], v?: string) =>
  v ? (list.find((x) => fold(x.name) === fold(v)) ?? list.find((x) => initials(x.name) === fold(v).replace(/[^a-z0-9]/g, '')))?.id ?? null : null;
