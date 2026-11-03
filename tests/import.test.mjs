// Chạy: npm test (Node 24 đọc thẳng file .ts). Test các quy tắc dễ sai khi nhập dữ liệu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byName, fixPhone, parseDate } from '../src/lib/import.ts';
import { normalizePhone } from '../src/lib/util.ts';
import { RESOURCES } from '../src/admin/resources.ts';

test('parseDate đọc ngày kiểu Việt Nam và ISO', () => {
  assert.equal(parseDate('5/8/2026'), '2026-08-05');
  assert.equal(parseDate('15.08.2026'), '2026-08-15');
  assert.equal(parseDate('2026-8-1T00:00:00Z'), '2026-08-01');
  assert.equal(parseDate('tháng 8'), null);
  assert.equal(parseDate(''), null);
});

test('fixPhone thêm lại số 0 Excel làm mất', () => {
  assert.equal(fixPhone('912345678'), '0912345678');
  assert.equal(fixPhone('0912 345 678'), '0912 345 678');
  assert.equal(fixPhone(''), null);
});

test('normalizePhone chuẩn hoá +84 và loại số sai', () => {
  assert.equal(normalizePhone('+84 912.345.678'), '0912345678');
  assert.equal(normalizePhone('84912345678'), '0912345678');
  assert.equal(normalizePhone('12345'), null);
});

test('byName khớp không dấu, viết tắt; tên lạ thì null (không ghi đè dữ liệu cũ)', () => {
  const plans = [{ id: 1, name: 'Premium' }, { id: 4, name: 'Học sinh – Sinh viên' }];
  assert.equal(byName(plans, 'premium'), 1);
  assert.equal(byName(plans, 'hoc sinh – sinh vien'), 4);
  assert.equal(byName(plans, 'HSSV'), 4);
  assert.equal(byName(plans, 'Gói VIP'), null);
  assert.equal(byName(plans, ''), null);
});

test('kiểm tra giữa các ô: giờ lớp, thư viện ảnh/video', () => {
  assert.match(RESOURCES.classes.check({ startTime: '19:00', endTime: '18:00' }), /Giờ kết thúc/);
  assert.equal(RESOURCES.classes.check({ startTime: '18:00', endTime: '19:30' }), null);
  assert.equal(RESOURCES.gallery.check({ type: 'photo', key: null }), 'Chọn ảnh');
  assert.equal(RESOURCES.gallery.check({ type: 'video', videoUrl: 'https://youtu.be/x' }), null);
});

test('form nội dung không còn ô "Thứ tự hiển thị" (tự đặt + nút ↑↓)', () => {
  for (const r of Object.values(RESOURCES)) assert.ok(!r.fields.some((f) => f.name === 'sort'), r.key);
});
