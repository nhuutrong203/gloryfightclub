// Định nghĩa các mục nội dung "đơn giản" của CMS. Một nguồn duy nhất cho:
//  - API (src/api/content.ts): sinh zod schema + danh sách cột được phép ghi
//  - giao diện CMS (ResourcePage): sinh danh sách + form
// Học viên, học phí, học thử, tin tức, cài đặt, tài khoản có màn hình riêng.

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'bool' | 'image' | 'select' | 'multi' | 'color' | 'time' | 'date' | 'days' | 'url';

export type Field = {
  name: string; // tên property Drizzle (camelCase)
  label: string;
  type: FieldType;
  required?: boolean;
  /** Có bản tiếng Anh `${name}En` không */
  en?: boolean;
  /** select/multi: lấy lựa chọn từ resource khác hoặc danh sách cố định */
  ref?: ResourceKey;
  options?: { value: string; label: string }[];
  help?: string;
  /** Chỉ hiện ô này khi điều kiện đúng (ô ẩn được lưu là trống). */
  showIf?: (row: Record<string, any>) => boolean;
};

export type Resource = {
  key: ResourceKey;
  title: string;
  /** cột hiển thị ở danh sách */
  listTitle: (row: any) => string;
  listSub?: (row: any) => string;
  fields: Field[];
  /** sinh slug tự động từ cột này nếu bảng có slug */
  slugFrom?: string;
  /** 'sort' = sắp xếp bằng nút ↑↓ trong danh sách; server tự đặt sort cho mục mới. */
  orderBy?: string;
  /** Mục mới lên đầu danh sách thay vì xuống cuối. */
  newFirst?: boolean;
  /** Trang web hiện mục này (nút "Xem trên web"); mục có slug mở thẳng `${publicPath}/${slug}`. */
  publicPath?: string;
  /** Kiểm tra giữa các ô (chạy ở cả CMS lẫn API); trả câu lỗi hoặc null. */
  check?: (row: Record<string, any>) => string | null;
};

export type ResourceKey =
  | 'locations' | 'disciplines' | 'classes' | 'coaches' | 'belts'
  | 'feePlans' | 'gallery' | 'testimonials' | 'faqs' | 'achievements';

const pub: Field = { name: 'isPublic', label: 'Hiện trên website', type: 'bool' };

export const DAY_LABEL: Record<string, string> = { '2': 'T2', '3': 'T3', '4': 'T4', '5': 'T5', '6': 'T6', '7': 'T7', '8': 'CN' };
export const daysLabel = (d: string) => [...d].map((c) => DAY_LABEL[c] ?? c).join('·');

export const LEVELS = [
  { value: 'all', label: 'Mọi trình độ' },
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung cấp' },
  { value: 'advanced', label: 'Nâng cao' },
  { value: 'kids', label: 'Trẻ em' },
];

export const RESOURCES: Record<ResourceKey, Resource> = {
  classes: {
    key: 'classes',
    title: 'Lịch học',
    publicPath: '/lich-hoc',
    listTitle: (r) => r.name,
    listSub: (r) => `${daysLabel(r.days)} · ${r.startTime}–${r.endTime}`,
    orderBy: 'startTime',
    check: (r) => (r.startTime && r.endTime && r.endTime <= r.startTime ? 'Giờ kết thúc phải sau giờ bắt đầu' : null),
    fields: [
      { name: 'name', label: 'Tên lớp', type: 'text', required: true, en: true, help: 'Vd: MMA, MMA / Muay Thái' },
      { name: 'locationId', label: 'Cơ sở', type: 'select', ref: 'locations', required: true },
      { name: 'days', label: 'Các thứ trong tuần', type: 'days', required: true },
      { name: 'startTime', label: 'Giờ bắt đầu', type: 'time', required: true },
      { name: 'endTime', label: 'Giờ kết thúc', type: 'time', required: true },
      { name: 'disciplineIds', label: 'Môn', type: 'multi', ref: 'disciplines' },
      { name: 'coachId', label: 'HLV phụ trách', type: 'select', ref: 'coaches' },
      { name: 'level', label: 'Trình độ', type: 'select', options: LEVELS, help: 'Khác "Mọi trình độ" thì hiện nhãn (vd. Trẻ em) cạnh tên lớp trên Lịch học.' },
      { name: 'note', label: 'Ghi chú', type: 'text', en: true, help: 'Hiện dưới tên lớp trên Lịch học và trang môn / HLV. Vd: Mang găng tay riêng.' },
      { name: 'isActive', label: 'Đang mở lớp', type: 'bool' },
      pub,
    ],
  },
  coaches: {
    key: 'coaches',
    title: 'HLV',
    publicPath: '/huan-luyen-vien',
    listTitle: (r) => r.fullName,
    listSub: (r) => r.title ?? '',
    slugFrom: 'fullName',
    orderBy: 'sort',
    fields: [
      { name: 'fullName', label: 'Họ tên', type: 'text', required: true },
      { name: 'photoKey', label: 'Ảnh', type: 'image' },
      { name: 'title', label: 'Chức danh', type: 'text', en: true, help: 'Vd: HLV Jiujitsu' },
      { name: 'achievements', label: 'Thành tích', type: 'textarea', en: true, help: 'Mỗi dòng một thành tích. Ghi HCV / HCB / HCĐ (hoặc "huy chương vàng…", "1 vàng, 1 bạc…") để web tô màu huy chương; "Vô địch…" hiện cúp, "Đai đen…" hiện đai. Thành tích có ẢNH: thêm ở mục Thành tích và chọn HLV này.' },
      { name: 'bio', label: 'Giới thiệu', type: 'textarea', en: true },
      { name: 'disciplineIds', label: 'Môn dạy', type: 'multi', ref: 'disciplines' },
      { name: 'isFeatured', label: 'Nổi bật ở trang chủ', type: 'bool' },
      pub,
    ],
  },
  disciplines: {
    key: 'disciplines',
    title: 'Môn học',
    publicPath: '/mon-hoc',
    listTitle: (r) => r.name,
    slugFrom: 'name',
    orderBy: 'sort',
    fields: [
      { name: 'name', label: 'Tên môn', type: 'text', required: true, en: true },
      { name: 'coverKey', label: 'Ảnh bìa', type: 'image' },
      { name: 'summary', label: 'Mô tả ngắn', type: 'textarea', en: true },
      { name: 'description', label: 'Mô tả chi tiết', type: 'textarea', en: true },
      { name: 'hasBelts', label: 'Có hệ thống đai', type: 'bool' },
      pub,
    ],
  },
  locations: {
    key: 'locations',
    title: 'Liên hệ · Cơ sở',
    publicPath: '/lien-he',
    listTitle: (r) => r.name,
    listSub: (r) => r.address,
    orderBy: 'sort',
    fields: [
      { name: 'name', label: 'Tên cơ sở', type: 'text', required: true, en: true },
      { name: 'address', label: 'Địa chỉ', type: 'textarea', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text' },
      { name: 'mapUrl', label: 'Link Google Maps', type: 'url', help: 'Mở Google Maps → Chia sẻ → Sao chép đường liên kết' },
      { name: 'scheduleImageKey', label: 'Ảnh lịch tập (tuỳ chọn)', type: 'image', help: 'Có ảnh thì trang Lịch học hiện ảnh này cho cơ sở' },
    ],
  },
  feePlans: {
    key: 'feePlans',
    title: 'Bảng giá học phí',
    publicPath: '/hoc-phi',
    listTitle: (r) => r.name,
    listSub: (r) => `${Number(r.pricePerMonth).toLocaleString('vi-VN')} đ/tháng`,
    orderBy: 'pricePerMonth',
    fields: [
      { name: 'name', label: 'Tên gói', type: 'text', required: true, en: true },
      { name: 'pricePerMonth', label: 'Giá / tháng (VND)', type: 'money', required: true },
      { name: 'headline', label: 'Tiêu đề', type: 'text', en: true, help: 'Vd: Tập tất cả các môn' },
      { name: 'condition', label: 'Điều kiện', type: 'text', en: true, help: 'Vd: Trừ lớp trẻ em' },
      { name: 'features', label: 'Quyền lợi', type: 'textarea', en: true, help: 'Mỗi dòng một ý' },
      { name: 'badge', label: 'Nhãn nổi bật', type: 'text', help: 'Vd: BEST CHOICE' },
      { name: 'isFeatured', label: 'Gói nổi bật', type: 'bool' },
      pub,
    ],
  },
  belts: {
    key: 'belts',
    title: 'Cấp đai',
    publicPath: '/cap-dai',
    listTitle: (r) => r.name,
    listSub: (r) => `Bậc ${r.rank}`,
    orderBy: 'rank',
    fields: [
      { name: 'disciplineId', label: 'Môn', type: 'select', ref: 'disciplines', required: true },
      { name: 'name', label: 'Tên đai', type: 'text', required: true, en: true },
      { name: 'color', label: 'Màu đai', type: 'color', required: true },
      { name: 'rank', label: 'Bậc (1 = thấp nhất)', type: 'number', required: true, help: 'Chèn đai vào giữa: gõ bậc muốn đặt, các đai từ bậc đó trở đi tự lùi xuống 1 bậc.' },
      { name: 'minMonths', label: 'Số tháng tối thiểu', type: 'number' },
      { name: 'requirements', label: 'Yêu cầu', type: 'textarea', en: true },
    ],
  },
  gallery: {
    key: 'gallery',
    title: 'Thư viện',
    publicPath: '/thu-vien',
    listTitle: (r) => r.caption || (r.type === 'video' ? 'Video' : 'Ảnh'),
    listSub: (r) => r.album ?? '',
    orderBy: 'sort',
    newFirst: true,
    check: (r) => (r.type === 'photo' && !r.key ? 'Chọn ảnh' : r.type === 'video' && !r.videoUrl ? 'Nhập link video' : null),
    fields: [
      { name: 'type', label: 'Loại', type: 'select', required: true, options: [{ value: 'photo', label: 'Ảnh' }, { value: 'video', label: 'Video (link YouTube/Facebook)' }] },
      { name: 'key', label: 'Ảnh', type: 'image', showIf: (r) => r.type === 'photo' },
      { name: 'videoUrl', label: 'Link video', type: 'url', help: 'Link YouTube (hiện ngay trên web) hoặc Facebook. Muốn tải video từ điện thoại lên: đăng ở Nhật ký lớp.', showIf: (r) => r.type === 'video' },
      { name: 'caption', label: 'Chú thích', type: 'text', en: true },
      { name: 'album', label: 'Album', type: 'text', help: 'Vd: Giải đấu 2025' },
      pub,
    ],
  },
  testimonials: {
    key: 'testimonials',
    title: 'Cảm nhận',
    publicPath: '/cam-nhan',
    listTitle: (r) => r.authorName,
    listSub: (r) => r.authorRole ?? '',
    orderBy: 'sort',
    fields: [
      { name: 'authorName', label: 'Tên người viết', type: 'text', required: true },
      { name: 'authorRole', label: 'Là ai', type: 'text', en: true, help: 'Vd: Phụ huynh bé Minh' },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true, en: true },
      { name: 'photoKey', label: 'Ảnh', type: 'image' },
      pub,
    ],
  },
  faqs: {
    key: 'faqs',
    title: 'Hỏi đáp',
    publicPath: '/hoi-dap',
    listTitle: (r) => r.question,
    orderBy: 'sort',
    fields: [
      { name: 'question', label: 'Câu hỏi', type: 'text', required: true, en: true },
      { name: 'answer', label: 'Trả lời', type: 'textarea', required: true, en: true },
      pub,
    ],
  },
  achievements: {
    key: 'achievements',
    title: 'Thành tích',
    publicPath: '/thanh-tich',
    listTitle: (r) => r.title,
    listSub: (r) => r.eventName ?? '',
    orderBy: 'sort',
    newFirst: true,
    fields: [
      { name: 'title', label: 'Thành tích', type: 'text', required: true, en: true, help: 'Vd: HCV Kudo quốc gia' },
      { name: 'eventName', label: 'Giải đấu / sự kiện', type: 'text' },
      { name: 'eventDate', label: 'Ngày', type: 'date' },
      { name: 'coachId', label: 'HLV / võ sĩ', type: 'select', ref: 'coaches', help: 'Chọn HLV thì ảnh thành tích hiện cả ở trang của HLV đó' },
      { name: 'imageKey', label: 'Ảnh huy chương / giấy chứng nhận / lên bục', type: 'image', help: 'Ảnh thật giúp khách tin hơn — hiện ở trang chủ, trang HLV và trang Thành tích.' },
      { name: 'description', label: 'Mô tả', type: 'textarea', en: true },
      pub,
    ],
  },
};

/** Tên cột → nhãn tiếng Việt, để báo lỗi dễ hiểu. */
export const fieldLabels = (r: Resource) => Object.fromEntries(r.fields.flatMap((f) => (f.en ? [[f.name, f.label], [`${f.name}En`, `${f.label} (English)`]] : [[f.name, f.label]])));

/** Tất cả cột được phép ghi (kể cả bản EN). */
export const writableColumns = (r: Resource) => r.fields.flatMap((f) => (f.en ? [f.name, `${f.name}En`] : [f.name]));
