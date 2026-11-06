// Gợi ý buổi học thử (form Đăng ký học thử chạy ở trình duyệt; server dùng lại để kiểm tra; test chạy bằng node).
// Chỉ import util (không đụng DB) để chạy được ở cả 3 nơi.
import { vnNow } from './util.ts';

/** Tuổi tròn vào ngày `today` ('YYYY-MM-DD'), sinh ngày `birth` ('YYYY-MM-DD'). Chưa tới sinh nhật năm nay thì chưa cộng tuổi. */
export function ageOn(birth: string, today: string) {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Thứ theo cách gọi VN ('2'..'8') của một ngày 'YYYY-MM-DD'. */
export const weekdayOf = (date: string) => vnNow(new Date(`${date}T12:00:00+07:00`)).weekday;

type ClassLike = { id: number; days: string; startTime: string; disciplineIds: number[]; locationId: number; level?: string };
export type SessionFilter = { disciplineId?: number | null; locationId?: number | null; age?: number | null; days?: number; leadMinutes?: number };

/** Các buổi sắp diễn ra trong `days` ngày tới (giờ VN), sớm nhất trước: [{ cls, date }].
 *  Bỏ buổi hôm nay đã bắt đầu hoặc bắt đầu trong vòng `leadMinutes` phút (không kịp tới).
 *  Trẻ dưới 16 tuổi: ưu tiên lớp "Trẻ em" (nếu môn đó có); từ 16 tuổi: không gợi ý lớp trẻ em. */
export function upcomingSessions<T extends ClassLike>(classes: T[], now: Date, f: SessionFilter = {}) {
  const days = f.days ?? 14;
  const lead = f.leadMinutes ?? 60;
  let list = classes.filter((c) => (!f.disciplineId || c.disciplineIds.includes(f.disciplineId)) && (!f.locationId || c.locationId === f.locationId));
  if (f.age != null) {
    const kids = list.filter((c) => c.level === 'kids');
    list = f.age < 16 && kids.length ? kids : f.age >= 16 ? list.filter((c) => c.level !== 'kids') : list;
  }
  const cutoff = now.getTime() + lead * 60_000;
  const out: { cls: T; date: string }[] = [];
  for (let i = 0; i < days; i++) {
    const { date, weekday } = vnNow(new Date(now.getTime() + i * 86_400_000));
    for (const c of list) {
      if (c.days.includes(weekday) && Date.parse(`${date}T${c.startTime}:00+07:00`) > cutoff) out.push({ cls: c, date });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.cls.startTime.localeCompare(b.cls.startTime));
}
