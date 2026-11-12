// Share trial slot logic between the browser, server, and tests.
// Import only utilities so the module stays independent of the database.
import { vnNow } from './util.ts';

/** Age in whole years on the given ISO date. */
export function ageOn(birth: string, today: string) {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Map an ISO date to the club's weekday codes. */
export const weekdayOf = (date: string) => vnNow(new Date(`${date}T12:00:00+07:00`)).weekday;

type ClassLike = { id: number; days: string; startTime: string; disciplineIds: number[]; locationId: number; level?: string };
export type SessionFilter = { disciplineId?: number | null; locationId?: number | null; age?: number | null; days?: number; leadMinutes?: number };

/** Return upcoming sessions in Vietnam time, earliest first.
 *  Exclude sessions at or before the minimum lead time.
 *  Prefer kids' classes when available for under-16s and exclude them for older visitors. */
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
