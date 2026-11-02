export type Lang = 'vi' | 'en';

const dict = {
  vi: {
    nav_disciplines: 'Môn học',
    nav_schedule: 'Lịch học',
    nav_coaches: 'HLV',
    nav_fees: 'Học phí',
    nav_news: 'Tin tức',
    nav_contact: 'Liên hệ',
    cta_trial: 'Đăng ký học thử',
    cta_call: 'Gọi ngay',
    disciplines_title: 'Các môn',
    coaches_title: 'Fighters of Glory',
    coaches_sub: 'Đội ngũ HLV đai đen, võ sĩ đang thi đấu',
    fees_title: 'Các gói tập',
    per_month: 'VND / tháng',
    open_mat: 'Open mat – Sparring miễn phí · Chủ nhật 18:00 – 21:00',
    locations_title: 'Hai cơ sở',
    directions: 'Chỉ đường',
    menu: 'Menu',
    footer_rights: 'Bảo lưu mọi quyền.',
  },
  en: {
    nav_disciplines: 'Disciplines',
    nav_schedule: 'Schedule',
    nav_coaches: 'Coaches',
    nav_fees: 'Pricing',
    nav_news: 'News',
    nav_contact: 'Contact',
    cta_trial: 'Book a free trial',
    cta_call: 'Call now',
    disciplines_title: 'Disciplines',
    coaches_title: 'Fighters of Glory',
    coaches_sub: 'Black-belt coaches and active fighters',
    fees_title: 'Memberships',
    per_month: 'VND / month',
    open_mat: 'Free Open mat – Sparring · Sunday 18:00 – 21:00',
    locations_title: 'Two gyms',
    directions: 'Directions',
    menu: 'Menu',
    footer_rights: 'All rights reserved.',
  },
} as const;

export type DictKey = keyof (typeof dict)['vi'];

export const t = (lang: Lang, key: DictKey) => dict[lang][key];

/** Lấy cột song ngữ: tr(row, 'name', 'en') → row.nameEn, trống thì row.name. */
export function tr<T extends Record<string, unknown>>(row: T, field: string, lang: Lang): string {
  const vi = (row[field] as string | null) ?? '';
  return lang === 'en' ? ((row[`${field}En`] as string | null) || vi) : vi;
}

/** Đường dẫn theo ngôn ngữ: href('/hoc-phi', 'en') → '/en/hoc-phi'. */
export const href = (path: string, lang: Lang) => (lang === 'en' ? `/en${path === '/' ? '' : path}` : path);

export const formatVnd = (n: number) => n.toLocaleString('vi-VN');
