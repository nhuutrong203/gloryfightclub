// Đọc dữ liệu chữ từ file Excel/CSV nhập học viên. Không import gì để test chạy thẳng bằng node (tests/).

/** Bỏ dấu, chữ thường: "Nguyễn Văn A" → "nguyen van a". */
export const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** "15/08/2026", "2026-08-15", "2026-08-15T…" → "2026-08-15"; không đọc được hoặc ngày không có thật (13/13, 31/02) → null. */
export function parseDate(v?: string) {
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const vn = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!iso && !vn) return null;
  const [y, mo, d] = iso ? [iso[1], iso[2], iso[3]] : [vn![3], vn![2], vn![1]];
  // Ngày không có thật thì Date tự lăn sang tháng khác → tháng/ngày đọc lại không khớp.
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  if (dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Excel hay làm mất số 0 đầu SĐT (912345678) → thêm lại. */
export const fixPhone = (v?: string) => (v && /^\d{9}$/.test(v.replace(/\D/g, '')) ? '0' + v.replace(/\D/g, '') : v || null);

export const STATUS_IN: Record<string, 'active' | 'paused' | 'quit'> = { 'dang hoc': 'active', active: 'active', 'tam nghi': 'paused', paused: 'paused', 'da nghi': 'quit', nghi: 'quit', quit: 'quit' };

const initials = (x: string) => fold(x).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0]).join('');

/** Khớp tên không dấu, hoặc viết tắt chữ cái đầu ("HSSV" = "Học sinh – Sinh viên"). Không khớp → null. */
export const byName = <T extends { id: number; name: string }>(list: T[], v?: string) =>
  v ? (list.find((x) => fold(x.name) === fold(v)) ?? list.find((x) => initials(x.name) === fold(v).replace(/[^a-z0-9]/g, '')))?.id ?? null : null;
