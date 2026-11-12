const TZ = 'Asia/Ho_Chi_Minh';

/** Current date, month, and club weekday in Vietnam time. */
export function vnNow(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, month: `${p.year}-${p.month}`, weekday: dow === 0 ? '8' : String(dow + 1) };
}

/** Old policy versions were dates; new versions include the exact save time. */
export function policyVersionText(version: string, lang: 'vi' | 'en' = 'vi') {
  if (/^\d{4}-\d{2}-\d{2}$/.test(version)) return version.split('-').reverse().join('/');
  const date = new Date(version);
  if (Number.isNaN(date.getTime())) return version;
  const day = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${day} ${time}`;
}

/** Generate a lowercase, accent-free slug. */
export function slugify(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'muc';
}

/** Normalize Vietnamese phone numbers and reject invalid input. */
export function normalizePhone(s: string) {
  let d = s.replace(/[\s.\-()]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (d.startsWith('84') && d.length === 11) d = '0' + d.slice(2);
  return /^0\d{9}$/.test(d) ? d : null;
}

/** Extract an 11-character YouTube video ID from supported URLs. */
export const youtubeId = (url: string | null | undefined) =>
  url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)?.[1] ?? null;

/** Renumber belts after an insert, move, or deletion.
 *  Keep the edited belt at its requested rank and shift neighboring belts.
 *  Return only IDs and new ranks that need updates. */
export function rerank(rows: { id: number; rank: number }[], editedId = 0, oldRank?: number): [number, number][] {
  const edited = rows.find((r) => r.id === editedId);
  const down = !!edited && oldRank != null && edited.rank > oldRank;
  const tie = (r: { id: number }) => (r.id === editedId ? (down ? 1 : -1) : 0);
  const sorted = [...rows].sort((a, b) => a.rank - b.rank || tie(a) - tie(b) || a.id - b.id);
  return sorted.flatMap((r, i): [number, number][] => (r.rank === i + 1 ? [] : [[r.id, i + 1]]));
}

/** Convert a year or month into a half-open timestamp range in Vietnam time. */
export function vnRange(period: string): [number, number] {
  const [y, m] = period.split('-').map(Number);
  const H7 = 7 * 3600_000;
  return m ? [Date.UTC(y, m - 1, 1) - H7, Date.UTC(y, m, 1) - H7] : [Date.UTC(y, 0, 1) - H7, Date.UTC(y + 1, 0, 1) - H7];
}

/** Show first, last, and nearby pages, using null for an ellipsis.
 *  Display the page number when the gap is only one page. */
export function pageList(page: number, pages: number): (number | null)[] {
  const keep = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const n of keep) {
    if (n - prev === 2) out.push(n - 1);
    else if (n - prev > 2) out.push(null);
    out.push(n);
    prev = n;
  }
  return out;
}
