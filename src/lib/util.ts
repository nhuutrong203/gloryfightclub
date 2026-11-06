const TZ = 'Asia/Ho_Chi_Minh';

/** Ngày/tháng/thứ hiện tại theo giờ Việt Nam. weekday: '2'..'7', '8' = Chủ nhật (cách gọi lớp 246/357). */
export function vnNow(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, month: `${p.year}-${p.month}`, weekday: dow === 0 ? '8' : String(dow + 1) };
}

/** "Lê Thành Trung" → "le-thanh-trung" */
export function slugify(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'muc';
}

/** Chuẩn hoá SĐT VN: bỏ khoảng trắng/dấu, +84 → 0. Trả null nếu không hợp lệ. */
export function normalizePhone(s: string) {
  let d = s.replace(/[\s.\-()]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (d.startsWith('84') && d.length === 11) d = '0' + d.slice(2);
  return /^0\d{9}$/.test(d) ? d : null;
}

/** Link YouTube (watch, youtu.be, shorts, live, embed) → mã video 11 ký tự; link khác → null. */
export const youtubeId = (url: string | null | undefined) =>
  url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)?.[1] ?? null;

/** Đánh lại bậc đai 1, 2, 3… sau khi thêm / sửa / xoá đai (khỏi phải sửa tay từng đai khi chèn đai vào giữa).
 *  Đai vừa sửa (editedId) giữ đúng bậc đã gõ: đai đang ở bậc đó lùi xuống; nếu dời đai XUỐNG dưới (oldRank nhỏ hơn) thì nó đứng sau đai đang ở bậc đó.
 *  Trả về [id, bậc mới] của những đai cần đổi. */
export function rerank(rows: { id: number; rank: number }[], editedId = 0, oldRank?: number): [number, number][] {
  const edited = rows.find((r) => r.id === editedId);
  const down = !!edited && oldRank != null && edited.rank > oldRank;
  const tie = (r: { id: number }) => (r.id === editedId ? (down ? 1 : -1) : 0);
  const sorted = [...rows].sort((a, b) => a.rank - b.rank || tie(a) - tie(b) || a.id - b.id);
  return sorted.flatMap((r, i): [number, number][] => (r.rank === i + 1 ? [] : [[r.id, i + 1]]));
}

/** Khoảng thời gian [đầu, cuối) theo giờ VN của 'YYYY' hoặc 'YYYY-MM' → ms, để lọc published_at. */
export function vnRange(period: string): [number, number] {
  const [y, m] = period.split('-').map(Number);
  const H7 = 7 * 3600_000;
  return m ? [Date.UTC(y, m - 1, 1) - H7, Date.UTC(y, m, 1) - H7] : [Date.UTC(y, 0, 1) - H7, Date.UTC(y + 1, 0, 1) - H7];
}

/** Số trang cần hiện ở thanh phân trang: trang đầu, trang cuối, trang đang xem ±1; chỗ bỏ qua là null ("…").
 *  Khoảng bỏ qua chỉ có 1 trang thì hiện luôn số đó (1 2 3 thay vì 1 … 3). Vd. (6, 20) → [1, null, 5, 6, 7, null, 20]. */
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
