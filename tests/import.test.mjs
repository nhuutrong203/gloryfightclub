// Chạy: npm test (Node 24 đọc thẳng file .ts). Test các quy tắc dễ sai khi nhập dữ liệu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byName, fixPhone, parseDate } from '../src/lib/import.ts';
import { normalizePhone, youtubeId } from '../src/lib/util.ts';
import { textToHtml, toText } from '../src/lib/html.ts';
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

test('nhật ký: HTML → chữ thường cho đoạn trích, bài cũ → HTML', () => {
  assert.equal(toText('<h2>Buổi tối</h2><p>Tập <b>đá</b> &amp; vật</p><ul><li>A</li><li>B</li></ul>'), 'Buổi tối\nTập đá & vật\nA\nB');
  assert.equal(toText('<p><br></p>'), '');
  assert.equal(textToHtml('Dòng 1\nDòng 2\n\n<b>x</b>'), '<p>Dòng 1<br>Dòng 2</p><p>&lt;b&gt;x&lt;/b&gt;</p>');
});

test('youtubeId nhận các kiểu link YouTube', () => {
  for (const u of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtube.com/shorts/dQw4w9WgXcQ']) assert.equal(youtubeId(u), 'dQw4w9WgXcQ', u);
  assert.equal(youtubeId('https://facebook.com/video/1'), null);
});

test('huy chương: đọc vàng/bạc/đồng từ chữ tự do, không nhầm "đai vàng", "đồng bằng"', async () => {
  const { classify, tally } = await import('../src/lib/medals.ts');
  const m = (s) => classify(s).medals;
  assert.deepEqual(m('HCV giải Kudo quốc gia 2024'), { gold: 1, silver: 0, bronze: 0 });
  assert.deepEqual(m('HCB, HCĐ Đại hội TDTT ĐBSCL'), { gold: 0, silver: 1, bronze: 1 });
  assert.deepEqual(m('Huy chương bạc giải vô địch cúp gấu đỏ 2022 (Gi)'), { gold: 0, silver: 1, bronze: 0 });
  assert.deepEqual(m('1 vàng, 1 bạc, 1 đồng giải Đại hội thể thao đồng bằng sông Cửu Long 2023'), { gold: 1, silver: 1, bronze: 1 });
  assert.deepEqual(m('2 HCV Open Jiujitsu'), { gold: 2, silver: 0, bronze: 0 });
  assert.deepEqual(m('Huy chương bạc và đồng giải C88 Jiujitsu Championship 2024 (No-gi)'), { gold: 0, silver: 1, bronze: 1 });
  assert.deepEqual(m('Huy chương vàng, bạc giải mở rộng'), { gold: 1, silver: 1, bronze: 0 });
  assert.deepEqual(m('2 huy chương vàng giải trẻ'), { gold: 2, silver: 0, bronze: 0 });
  assert.deepEqual(m('Huy chương đồng giải vận động viên xuất sắc Jujitsu quốc gia 2025 (Gi)'), { gold: 0, silver: 0, bronze: 1 });
  assert.deepEqual(m('2 vàng, 2 đồng giải Street Jiujitsu 2026 (Gi, no-gi)'), { gold: 2, silver: 0, bronze: 2 });
  assert.equal(classify('Đai vàng Kudo').kind, 'belt');
  assert.equal(classify('Đai đen Kudo chính thức do Liên đoàn Kudo thế giới cấp').kind, 'belt');
  assert.equal(classify('Vô địch giải MMA 2025').kind, 'title');
  assert.equal(classify('Võ sĩ MMA đang thi đấu').kind, 'other');
  assert.deepEqual(tally(['HCV a', 'HCB, HCĐ b', '1 vàng, 1 bạc, 1 đồng c']), { gold: 2, silver: 2, bronze: 2 });
  const { beltColor } = await import('../src/lib/medals.ts');
  assert.equal(beltColor('Đai tím BJJ'), '#6b2fb3');
  assert.equal(beltColor('Đai đen Kudo'), '#0a0a0a');
  assert.equal(beltColor('Võ sĩ MMA'), null);
});

test('lọc HTML nhật ký: chỉ giữ thẻ an toàn, bỏ mã chạy được, link chỉ http(s)', async () => {
  const { tagAction, safeHref } = await import('../src/lib/html.ts');
  for (const t of ['script', 'SCRIPT', 'iframe', 'style', 'svg', 'img', 'object', 'form', 'video']) assert.equal(tagAction(t), 'drop', t);
  for (const t of ['p', 'b', 'strong', 'h2', 'h3', 'ul', 'li', 'blockquote', 'a', 'br']) assert.equal(tagAction(t), 'keep', t);
  for (const t of ['font', 'table', 'section', 'h1']) assert.equal(tagAction(t), 'unwrap', t);
  assert.equal(safeHref('https://glory.vn/a?b=1'), 'https://glory.vn/a?b=1');
  for (const h of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.com', 'https://x"onmouseover=1', "https://x'y", 'https://a b', '', null]) assert.equal(safeHref(h), null, String(h));
});
