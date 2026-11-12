// Run with npm test using Node 24 TypeScript support.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS_IN, byName, fixPhone, fold, parseDate, updatableColumns } from '../src/lib/import.ts';
import { normalizePhone, pageList, policyVersionText, vnNow, vnRange, youtubeId } from '../src/lib/util.ts';
import { textToHtml, toText } from '../src/lib/html.ts';
import { RESOURCES } from '../src/admin/resources.ts';

test('Parse Vietnamese and ISO dates', () => {
  assert.equal(parseDate('5/8/2026'), '2026-08-05');
  assert.equal(parseDate('15.08.2026'), '2026-08-15');
  assert.equal(parseDate('2026-8-1T00:00:00Z'), '2026-08-01');
  assert.equal(parseDate('tháng 8'), null);
  assert.equal(parseDate(''), null);
  // Invalid dates should fail rather than rolling over or defaulting to today.
  assert.equal(parseDate('11/25/2026'), null);
  assert.equal(parseDate('2026-13-01'), null);
  assert.equal(parseDate('15/08/26'), null);
  assert.equal(parseDate('0/8/2026'), null);
  assert.equal(parseDate('31/02/2026'), null); // Impossible date.
  assert.equal(parseDate('29/02/2028'), '2028-02-29'); // Leap year.
  assert.equal(parseDate('31/12/2026'), '2026-12-31');
});

test('Reject unknown student statuses', () => {
  assert.equal(STATUS_IN[fold('Đã nghỉ')], 'quit');
  assert.equal(STATUS_IN[fold('Tạm nghỉ')], 'paused');
  assert.equal(STATUS_IN[fold('Nghỉ học')], undefined);
});

test('Update only supplied columns and preserve blank status and join date', () => {
  const values = { fullName: 'A', phone: null, locationId: null, status: 'active', joinedAt: '2026-11-05' };
  // Missing columns preserve existing values.
  assert.deepEqual(updatableColumns(values, { fullName: 'A' }), { fullName: 'A' });
  // Blank status and join date preserve existing values.
  assert.deepEqual(updatableColumns(values, { fullName: 'A', status: '', joinedAt: '' }), { fullName: 'A' });
  // A present optional blank clears the value. Location maps to locationId.
  assert.deepEqual(updatableColumns(values, { fullName: 'A', status: 'Đang học', phone: '', location: '' }),
    { fullName: 'A', phone: null, locationId: null, status: 'active' });
});

test('Use Vietnam time and encode Sunday as 8', () => {
  assert.equal(vnNow(new Date('2026-11-08T05:00:00Z')).weekday, '8'); // Sunday at noon in Vietnam.
  assert.equal(vnNow(new Date('2026-11-08T17:30:00Z')).weekday, '2'); // Monday at 00:30 in Vietnam.
});

test('Distinguish rule revisions saved on the same day', () => {
  assert.equal(policyVersionText('2026-11-06'), '06/11/2026');
  assert.match(policyVersionText('2026-11-06T08:00:00.000Z'), /06\/11\/2026.*15:00/);
  assert.notEqual(policyVersionText('2026-11-06T08:00:00.000Z'), policyVersionText('2026-11-06T08:01:00.000Z'));
});

test('Restore a leading zero removed by Excel', () => {
  assert.equal(fixPhone('912345678'), '0912345678');
  assert.equal(fixPhone('0912 345 678'), '0912 345 678');
  assert.equal(fixPhone(''), null);
});

test('Normalize Vietnamese phone numbers and reject invalid input', () => {
  assert.equal(normalizePhone('+84 912.345.678'), '0912345678');
  assert.equal(normalizePhone('84912345678'), '0912345678');
  assert.equal(normalizePhone('12345'), null);
});

test('Match names and initials without accents and reject unknown names', () => {
  const plans = [{ id: 1, name: 'Premium' }, { id: 4, name: 'Học sinh – Sinh viên' }];
  assert.equal(byName(plans, 'premium'), 1);
  assert.equal(byName(plans, 'hoc sinh – sinh vien'), 4);
  assert.equal(byName(plans, 'HSSV'), 4);
  assert.equal(byName(plans, 'Gói VIP'), null);
  assert.equal(byName(plans, ''), null);
});

test('Validate class times and gallery media', () => {
  assert.match(RESOURCES.classes.check({ startTime: '19:00', endTime: '18:00' }), /Giờ kết thúc/);
  assert.equal(RESOURCES.classes.check({ startTime: '18:00', endTime: '19:30' }), null);
  assert.equal(RESOURCES.gallery.check({ type: 'photo', key: null }), 'Chọn ảnh');
  assert.equal(RESOURCES.gallery.check({ type: 'video', videoUrl: 'https://youtu.be/x' }), null);
});

test('Set content order through the list controls', () => {
  for (const r of Object.values(RESOURCES)) assert.ok(!r.fields.some((f) => f.name === 'sort'), r.key);
});

test('Convert between diary HTML and plain text', () => {
  assert.equal(toText('<h2>Buổi tối</h2><p>Tập <b>đá</b> &amp; vật</p><ul><li>A</li><li>B</li></ul>'), 'Buổi tối\nTập đá & vật\nA\nB');
  assert.equal(toText('<p><br></p>'), '');
  assert.equal(textToHtml('Dòng 1\nDòng 2\n\n<b>x</b>'), '<p>Dòng 1<br>Dòng 2</p><p>&lt;b&gt;x&lt;/b&gt;</p>');
});

test('Extract video IDs from supported YouTube URLs', () => {
  for (const u of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtube.com/shorts/dQw4w9WgXcQ']) assert.equal(youtubeId(u), 'dQw4w9WgXcQ', u);
  assert.equal(youtubeId('https://facebook.com/video/1'), null);
});

test('Count medals without confusing belts or unrelated words', async () => {
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

test('Renumber belts after insertions, moves, and deletions', async () => {
  const { rerank } = await import('../src/lib/util.ts');
  const apply = (rows, ch) => rows.map((r) => ({ ...r, rank: ch.find(([id]) => id === r.id)?.[1] ?? r.rank })).sort((a, b) => a.rank - b.rank).map((r) => r.id);
  const kudo = [1, 2, 3, 4, 5].map((id) => ({ id, rank: id })); // White, purple, blue, yellow, and green belts.
  // Inserting at rank four shifts yellow and green down.
  const ins = [...kudo, { id: 9, rank: 4 }];
  assert.deepEqual(apply(ins, rerank(ins, 9)), [1, 2, 3, 9, 4, 5]);
  // Moving down keeps the edited belt at its requested rank.
  const down = kudo.map((r) => (r.id === 2 ? { ...r, rank: 4 } : r));
  assert.deepEqual(apply(down, rerank(down, 2, 2)), [1, 3, 4, 2, 5]);
  // Move rank five to rank two.
  const up = kudo.map((r) => (r.id === 5 ? { ...r, rank: 2 } : r));
  assert.deepEqual(apply(up, rerank(up, 5, 5)), [1, 5, 2, 3, 4]);
  // Deletion closes gaps and leaves an already contiguous list alone.
  assert.deepEqual(rerank(kudo.filter((r) => r.id !== 3)), [[4, 3], [5, 4]]);
  assert.deepEqual(rerank(kudo), []);
});

test('Combine written and linked coach achievements without double counting', async () => {
  const { extraAwards, tally } = await import('../src/lib/medals.ts');
  const title = (r) => ({ title: r.title, event: r.eventName });
  // Match the existing 2024 award and retain the separate 2025 award.
  const trung = ['Đai đen Kudo chính thức do Liên đoàn Kudo thế giới cấp', 'Võ sĩ MMA đang thi đấu', 'HCV giải Kudo quốc gia 2024', 'Hơn 5 năm kinh nghiệm huấn luyện'];
  const rows = [
    { title: 'HCV Kudo quốc gia', eventName: 'Giải Kudo quốc gia 2024', eventDate: null },
    { title: 'HCV Kudo quốc gia', eventName: 'Giải Kudo quốc gia 2025', eventDate: null },
    { title: 'HCB giải trẻ TP.HCM', eventName: null, eventDate: '2026-03-01' },
  ];
  const extra = extraAwards(trung, rows, title).map((r) => r.eventName ?? r.title);
  assert.deepEqual(extra, ['Giải Kudo quốc gia 2025', 'HCB giải trẻ TP.HCM']);
  assert.deepEqual(tally([...trung, ...extraAwards(trung, rows, title).map((r) => r.title)]), { gold: 2, silver: 1, bronze: 0 });
  // Ignore the unrelated date field when matching the 2024 event.
  const cloud = [{ title: 'HCV Kudo quốc gia', eventName: 'HCV Kudo quốc gia', eventDate: '2026-11-18' }];
  assert.deepEqual(extraAwards(trung, cloud, title), []);
  // All three linked awards already appear in the coach's written achievements.
  const phong = ['HCB giải các CLB Jujitsu quốc gia', 'HCB, HCĐ Đại hội TDTT ĐBSCL', 'HCV Open Jiujitsu Cần Thơ'];
  assert.deepEqual(extraAwards(phong, [{ title: 'HCV Open Jiujitsu' }, { title: 'HCB Jujitsu' }, { title: 'HCB, HCĐ' }], (r) => ({ title: r.title })), []);
  // Include linked awards when the written field is empty and deduplicate identical entries.
  assert.equal(extraAwards([], [{ title: 'Vô địch MMA' }, { title: 'Vô địch MMA' }], (r) => ({ title: r.title })).length, 1);
});

test('Allow safe diary HTML and HTTP links', async () => {
  const { tagAction, safeHref } = await import('../src/lib/html.ts');
  // Unwrapping raw-text elements could expose executable HTML in workerd.
  for (const t of ['script', 'SCRIPT', 'iframe', 'style', 'svg', 'img', 'object', 'form', 'video', 'xmp', 'noembed', 'noframes', 'plaintext', 'textarea', 'title', 'noscript']) assert.equal(tagAction(t), 'drop', t);
  for (const t of ['p', 'b', 'strong', 'h2', 'h3', 'ul', 'li', 'blockquote', 'a', 'br']) assert.equal(tagAction(t), 'keep', t);
  for (const t of ['font', 'table', 'section', 'h1']) assert.equal(tagAction(t), 'unwrap', t);
  assert.equal(safeHref('https://glory.vn/a?b=1'), 'https://glory.vn/a?b=1');
  for (const h of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.com', 'https://x"onmouseover=1', "https://x'y", 'https://a b', '', null]) assert.equal(safeHref(h), null, String(h));
});

test('Calculate Vietnam-time archive ranges and pagination', () => {
  // Vietnam midnight begins at 17:00 UTC on the previous day.
  const [from, to] = vnRange('2026-11');
  assert.equal(new Date(from).toISOString(), '2026-10-31T17:00:00.000Z');
  assert.equal(new Date(to).toISOString(), '2026-11-30T17:00:00.000Z');
  assert.ok(Date.parse('2026-10-31T16:30:00Z') < from);
  const [y0, y1] = vnRange('2026');
  assert.equal(new Date(y0).toISOString(), '2025-12-31T17:00:00.000Z');
  assert.equal(new Date(y1).toISOString(), '2026-12-31T17:00:00.000Z');
  assert.equal(vnRange('2026-12')[1], y1); // December ends when the year ends.

  assert.deepEqual(pageList(1, 1), [1]);
  assert.deepEqual(pageList(1, 3), [1, 2, 3]);
  assert.deepEqual(pageList(6, 20), [1, null, 5, 6, 7, null, 20]);
  assert.deepEqual(pageList(3, 20), [1, 2, 3, 4, null, 20]); // Show nearby pages without a redundant ellipsis.
  assert.deepEqual(pageList(20, 20), [1, null, 19, 20]);
});

test('Calculate age and suggest eligible trial sessions', async () => {
  const { ageOn, weekdayOf, upcomingSessions } = await import('../src/lib/schedule.ts');
  assert.equal(ageOn('2010-11-07', '2026-11-06'), 15); // Turns 16 tomorrow.
  assert.equal(ageOn('2010-11-06', '2026-11-06'), 16);
  assert.equal(ageOn('2008-02-29', '2026-02-28'), 17);
  assert.equal(weekdayOf('2026-11-06'), '6'); // Friday.
  assert.equal(weekdayOf('2026-11-08'), '8'); // Sunday.

  const C = [
    { id: 1, days: '246', startTime: '18:30', disciplineIds: [1], locationId: 1, level: 'all' }, // MMA T2-4-6
    { id: 2, days: '357', startTime: '19:00', disciplineIds: [2], locationId: 1, level: 'all' }, // Kudo T3-5-7
    { id: 3, days: '7', startTime: '08:00', disciplineIds: [1], locationId: 2, level: 'kids' },  // Saturday kids' MMA.
  ];
  // A session 45 minutes away is inside the 60-minute cutoff.
  const now = new Date('2026-11-06T17:45:00+07:00');
  const mma = upcomingSessions(C, now, { disciplineId: 1, age: 25 });
  assert.deepEqual(mma.slice(0, 2).map((s) => `${s.cls.id}@${s.date}`), ['1@2026-11-09', '1@2026-11-11']);
  assert.ok(mma.every((s) => s.cls.level !== 'kids')); // Adults do not receive kids' class suggestions.
  // At 17:00, the 18:30 class is still available.
  assert.equal(upcomingSessions(C, new Date('2026-11-06T17:00:00+07:00'), { disciplineId: 1, age: 25 })[0].date, '2026-11-06');
  // Prefer the Saturday kids' class at location 2 for a ten-year-old.
  assert.deepEqual(upcomingSessions(C, now, { disciplineId: 1, age: 10 }).map((s) => s.cls.id), [3, 3]);
  // Fall back to regular classes when the discipline has no kids' class.
  assert.equal(upcomingSessions(C, now, { disciplineId: 2, age: 10 })[0].cls.id, 2);
  // Apply the location filter and skip sessions that have already passed.
  assert.ok(upcomingSessions(C, now, { locationId: 2 }).every((s) => s.cls.locationId === 2));
  assert.ok(upcomingSessions(C, new Date('2026-11-06T23:50:00+07:00')).every((s) => s.date > '2026-11-06'));
});

test('Parse club rules into sections and list items', async () => {
  const { policySections } = await import('../src/lib/html.ts');
  assert.deepEqual(policySections(['Mở đầu', '', '1. Học phí', 'Đóng trước khi tập.', '  Không hoàn trả.  ', '2. Bảo lưu', 'Tối đa 1 tháng.'].join('\r\n')), [
    { title: null, items: ['Mở đầu'] },
    { title: '1. Học phí', items: ['Đóng trước khi tập.', 'Không hoàn trả.'] },
    { title: '2. Bảo lưu', items: ['Tối đa 1 tháng.'] },
  ]);
  assert.deepEqual(policySections(''), []);
  assert.deepEqual(policySections(null), []);
  assert.equal(policySections('1.5 triệu là học phí')[0].title, null); // A numbered heading requires a space after the dot.
});
