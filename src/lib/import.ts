// Dependency-free student spreadsheet helpers for browser and Node use.

/** Fold accented text into lowercase plain text for matching. */
export const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Neutralize spreadsheet formulas before escaping CSV cells. */
export const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Read quoted CSV using the separator found in the header. */
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, headerRead = false;
  let delimiter: ',' | ';' | undefined;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter || (!delimiter && !headerRead && (ch === ',' || ch === ';'))) {
      delimiter ??= ch as ',' | ';';
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      headerRead ||= row.some((c) => !!c.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('CSV có ô chưa đóng dấu nháy');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim()));
  const width = nonEmpty[0]?.length;
  const bad = rows.findIndex((r) => r.some((c) => c.trim()) && r.length !== width);
  if (bad >= 0) throw new Error(`Dòng CSV ${bad + 1} có số cột khác tiêu đề`);
  return nonEmpty;
}

/** Normalize a real date to ISO format. Return null for invalid dates. */
export function parseDate(v?: string) {
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const vn = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!iso && !vn) return null;
  const [y, mo, d] = iso ? [iso[1], iso[2], iso[3]] : [vn![3], vn![2], vn![1]];
  // Date normalizes impossible days, so compare the resulting month and day.
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  if (dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Restore a leading zero that Excel removed from a phone number. */
export const fixPhone = (v?: string) => (v && /^\d{9}$/.test(v.replace(/\D/g, '')) ? '0' + v.replace(/\D/g, '') : v || null);

export const STATUS_IN: Record<string, 'active' | 'paused' | 'quit'> = { 'dang hoc': 'active', active: 'active', 'tam nghi': 'paused', paused: 'paused', 'da nghi': 'quit', nghi: 'quit', quit: 'quit' };

/** Update only columns supplied in the import.
 *  Blank status and join-date cells preserve existing values.
 *  Map import column names to database fields before applying updates. */
export function updatableColumns<T extends Record<string, unknown>>(values: T, row: Record<string, string | undefined>): Partial<T> {
  const COL: Record<string, string> = { locationId: 'location', feePlanId: 'plan' };
  const has = (k: string) => row[k] !== undefined && !(row[k] === '' && (k === 'status' || k === 'joinedAt'));
  return Object.fromEntries(Object.entries(values).filter(([k]) => has(COL[k] ?? k))) as Partial<T>;
}

const initials = (x: string) => fold(x).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0]).join('');

/** Match by accent-insensitive name or initials. */
export const byName = <T extends { id: number; name: string }>(list: T[], v?: string) =>
  v ? (list.find((x) => fold(x.name) === fold(v)) ?? list.find((x) => initials(x.name) === fold(v).replace(/[^a-z0-9]/g, '')))?.id ?? null : null;
