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
