// End-to-end API checks against a disposable local D1. Run with npm run test:api.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { upcomingSessions } from '../src/lib/schedule.ts';
import { vnNow } from '../src/lib/util.ts';

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
const state = await mkdtemp(join(tmpdir(), 'glory-api-'));
const run = (...args) => {
  try { return execFileSync(process.execPath, [wrangler, ...args], { stdio: 'pipe' }); }
  catch (e) { throw new Error(`${e.stdout?.toString() ?? ''}\n${e.stderr?.toString() ?? ''}`); }
};
const d1 = (...args) => run('d1', ...args, '--local', '--persist-to', state);
const port = await new Promise((ok, fail) => {
  const server = createServer();
  server.once('error', fail);
  server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => ok(p)); });
});
let worker;
try {
  d1('migrations', 'apply', 'glory-db');
  d1('execute', 'glory-db', '--file=seed/seed.sql');
  d1('execute', 'glory-db', '--file=seed/sample.sql');
  d1('execute', 'glory-db', '--command', "INSERT INTO trial_registrations (id, full_name, phone, age, status) VALUES (999999, 'Smoke test', '0900000099', 25, 'new')");
  d1('execute', 'glory-db', '--command', "INSERT INTO disciplines (id, slug, name, is_public) VALUES (99999, 'hidden-smoke', 'Hidden smoke', 0)");
  d1('execute', 'glory-db', '--command', "INSERT INTO fee_plans (id, name, price_per_month, is_public) VALUES (99999, 'Hidden smoke', 1, 0)");
  d1('execute', 'glory-db', '--command', "INSERT INTO classes (id, name, discipline_ids, location_id, days, start_time, end_time, level) VALUES (99999, 'Hidden smoke class', '[99999]', 1, '246', '08:30', '09:30', 'all'), (99998, 'MMA', '[1]', 2, '246', '08:30', '09:30', 'all'), (99997, 'Kids smoke class', '[1]', 1, '246', '09:30', '10:30', 'kids')");
  d1('execute', 'glory-db', '--command', "INSERT INTO trial_registrations (id, full_name, phone, age, status, location_id, class_id) VALUES (999998, 'Moved class', '0900000098', 25, 'new', 1, 99998), (999997, 'Matching class', '0900000097', 25, 'new', 2, 99998)");
  worker = spawn(process.execPath, [wrangler, 'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', String(port), '--infer-origin-from-routes=false', '--var', 'PUBLIC_HOST:smoke.invalid', '--log-level', 'error'], { stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (worker.exitCode != null) throw new Error(`wrangler dev exited ${worker.exitCode}`);
    try { const r = await fetch(`${base}/admin`, { redirect: 'manual' }); if (r.status === 200) { ready = true; break; } } catch {}
    await new Promise((ok) => setTimeout(ok, 500));
  }
  assert.ok(ready, 'local Worker started');
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'glory2026' }) });
  assert.equal(login.status, 200, `demo owner login: ${await login.clone().text()}`);
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'session cookie');
  for (const prefix of ['', '/en']) {
    for (const [path, method] of [['/api/admin/students', 'GET'], ['/api/auth/login', 'POST']]) {
      const status = await new Promise((ok, fail) => {
        const req = request(`${base}${prefix}${path}`, { method, headers: { host: 'smoke.invalid', cookie } }, (res) => {
          res.resume();
          ok(res.statusCode);
        });
        req.on('error', fail);
        req.end();
      });
      assert.equal(status, 404, `${prefix}${path} stays closed on the public host`);
    }
  }
  const api = (path, body, method = 'POST') => fetch(`${base}/api/admin/${path}`, { method, headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await api('settings/hero', { title: 123 }, 'PUT')).status, 400);
  assert.equal((await api('settings/about', { values: 'wrong type' }, 'PUT')).status, 400);
  const settings = await (await fetch(`${base}/api/admin/settings`, { headers: { cookie } })).json();
  const { updated: policyVersion } = settings.policy;
  const partner = { name: 'Smoke partner', nameEn: 'Smoke sponsor EN', kind: 'sponsor', imageKey: 'public/smoke-partner.png', website: 'https://example.com', isPublic: true };
  assert.equal((await api('content/partners', { ...partner, imageKey: null })).status, 400);
  const partnerResponse = await api('content/partners', partner);
  assert.equal(partnerResponse.status, 201);
  const { id: partnerId } = await partnerResponse.json();
  const partnerList = await fetch(`${base}/api/admin/content/partners`, { headers: { cookie } });
  assert.ok((await partnerList.json()).some((row) => row.id === partnerId));
  for (const [path, name] of [['/', partner.name], ['/en/gioi-thieu', partner.nameEn]]) {
    const page = await fetch(base + path);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes(name));
  }
  assert.equal((await api(`content/partners/${partnerId}`, { isPublic: false }, 'PUT')).status, 200);
  assert.ok(!(await (await fetch(base + '/')).text()).includes('id="doi-tac"'));
  assert.equal((await api(`content/partners/${partnerId}`, undefined, 'DELETE')).status, 200);
  for (const path of ['students', 'posts', 'trials']) {
    const response = await fetch(`${base}/api/admin/${path}?page=1.25`, { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).page, 1);
  }
  const studentData = { fullName: 'Code reservation', joinedAt: vnNow().date, status: 'active', locationId: 2, classIds: [99998] };
  const created = await api('students', studentData);
  assert.equal(created.status, 201);
  const deleted = await created.json();
  assert.equal((await api('content/classes/99998', { locationId: 1 }, 'PUT')).status, 409, 'cannot move a class with students');
  assert.equal((await fetch(`${base}/api/admin/students/${deleted.id}`, { method: 'DELETE', headers: { cookie } })).status, 200);
  const replacement = await api('students', { ...studentData, classIds: [] });
  assert.equal(replacement.status, 201);
  assert.notEqual((await replacement.json()).code, deleted.code, 'deleted code is never issued again');
  const staleImport = await api('students/import', { rows: [{ code: deleted.code, status: 'quit' }] });
  assert.equal((await staleImport.json()).updated, 0, 'old spreadsheet cannot edit a replacement student');

  const getDisciplines = async () => (await fetch(`${base}/api/admin/content/disciplines`, { headers: { cookie } })).json();
  const ids = (await getDisciplines()).map((row) => row.id);
  assert.ok(ids.length > 1);
  for (const invalid of [ids.slice(1), [...ids.slice(1), ids[1]], [...ids.slice(1), 999999]]) {
    assert.equal((await api('content/disciplines/order', { ids: invalid }, 'PUT')).status, 409);
  }
  assert.deepEqual((await getDisciplines()).map((row) => row.id), ids);
  const reversed = [...ids].reverse();
  assert.equal((await api('content/disciplines/order', { ids: reversed }, 'PUT')).status, 200);
  assert.deepEqual((await getDisciplines()).map((row) => row.id), reversed);
  assert.equal((await api('content/disciplines/order', { ids }, 'PUT')).status, 200);

  const imported = await api('students/import', { rows: [{ fullName: 'Import fixture', phone: '0900000077' }] });
  assert.equal(imported.status, 200);
  assert.equal((await imported.json()).created, 1);
  const list = await fetch(`${base}/api/admin/students?q=Import%20fixture`, { headers: { cookie } });
  const student = (await list.json()).rows[0];
  const repeated = await api('students/import', { rows: [
    { code: student.code, status: 'paused' },
    { code: student.code.toLowerCase(), status: 'quit' },
  ] });
  const repeatedResult = await repeated.json();
  assert.equal(repeatedResult.updated, 0);
  assert.deepEqual(repeatedResult.errors.map((e) => e.row), [2, 3]);
  const today = vnNow().date;
  const futureYear = Number(today.slice(0, 4)) + 1;
  const futureBirth = await api('students', { fullName: 'Future birth', birthYear: futureYear, joinedAt: today, status: 'active' });
  assert.equal(futureBirth.status, 400);
  const futureImport = await api('students/import', { rows: [{ fullName: 'Future birth', birthYear: String(futureYear) }] });
  assert.equal((await futureImport.json()).created, 0);
  const wrongClass = await api('students', { fullName: 'Wrong class', joinedAt: '2026-11-11', status: 'active', locationId: 2, classIds: [1] });
  assert.equal(wrongClass.status, 400, 'student class must belong to the selected location');
  const partial = await api('students/import', { rows: [
    { fullName: 'Partial import fixture' },
    { fullName: 'Invalid import fixture', location: 'Unknown location' },
  ] });
  const partialResult = await partial.json();
  assert.equal(partialResult.created, 1);
  assert.deepEqual(partialResult.errors.map((e) => e.row), [3], 'only unsaved rows need retry');
  const duplicateClass = await api('students/import', { rows: [{ fullName: 'Other location fixture', location: 'Cơ sở 2 — Sport House Gò Vấp', classes: 'MMA 246 08:30' }] });
  assert.equal((await duplicateClass.json()).created, 1, 'import resolves duplicate class names within the chosen location');
  const otherList = await fetch(`${base}/api/admin/students?q=Other%20location%20fixture`, { headers: { cookie } });
  const otherStudent = (await otherList.json()).rows[0];
  const movedWithoutClass = await api('students/import', { rows: [{ code: otherStudent.code, location: 'Cơ sở 1 — An Phú Đông' }] });
  assert.deepEqual((await movedWithoutClass.json()).errors.map((e) => e.row), [2], 'changing location cannot keep classes at another location');
  const updated = await api('students/import', { rows: [{ code: student.code, status: 'paused' }] });
  assert.equal((await updated.json()).updated, 1, 'import can update status without a name column');
  const invalidFee = await api('fees', { studentId: student.id, month: '2026-02', amount: 1000000, paidAt: '2026-02-31', method: 'cash' });
  assert.equal(invalidFee.status, 400, 'impossible payment date rejected');
  const paid = await api('fees', { studentId: student.id, month: '2026-02', amount: 1000000, paidAt: '2026-02-28', method: 'cash' });
  assert.equal(paid.status, 201);
  const privateUser = await api('users', { username: 'audit-posts', fullName: 'Posts only', password: 'local-test-password', role: 'coach', permissions: ['posts'] });
  assert.equal(privateUser.status, 201);
  const coachLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'audit-posts', password: 'local-test-password' }) });
  const coachCookie = coachLogin.headers.get('set-cookie')?.split(';')[0];
  const dashboard = await fetch(`${base}/api/admin/dashboard`, { headers: { cookie: coachCookie } });
  const stats = await dashboard.json();
  assert.equal(stats.activeTotal, 0);
  assert.equal(stats.trialsNew, 0);
  assert.deepEqual(stats.byLocation, []);

  const converted = await api('trials/999999/convert', {});
  assert.equal(converted.status, 201, 'trial conversion');
  assert.ok((await converted.json()).studentId);
  assert.equal((await api('trials/999999/convert', {})).status, 409, 'second conversion cannot create a duplicate');
  for (const [id, expected] of [[999998, []], [999997, [99998]]]) {
    const response = await api(`trials/${id}/convert`, {});
    assert.equal(response.status, 201);
    const converted = await response.json();
    assert.equal(converted.classAssigned, expected.length > 0);
    const student = await (await fetch(`${base}/api/admin/students/${converted.studentId}`, { headers: { cookie } })).json();
    assert.deepEqual(student.classIds, expected);
  }

  const date = upcomingSessions([{ id: 1, days: '246', startTime: '08:30', disciplineIds: [1], locationId: 1 }], new Date())[0].date;
  const trial = (locationId, age = 25, version = policyVersion) => fetch(`${base}/api/public/trial`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: 'Smoke visitor', phone: '0900000088', age, classId: 1, trialDate: date, disciplineId: 1, locationId, agree: true, policyVersion: version }) });
  const stalePolicy = await trial(1, 25, '2026-01-01');
  assert.equal(stalePolicy.status, 409);
  assert.equal((await stalePolicy.json()).code, 'policy_changed');
  assert.equal((await trial(1, null)).status, 400, 'trial needs age or birth date');
  assert.equal((await trial(2)).status, 400, 'class and location cannot disagree');
  assert.equal((await trial(1)).status, 200, 'matching future class is accepted');
  const childTrial = await fetch(`${base}/api/public/trial`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.43' }, body: JSON.stringify({ fullName: 'Child fixture', phone: '0900000088', age: 10, classId: 1, trialDate: date, disciplineId: 1, locationId: 1, agree: true, policyVersion }) });
  assert.equal(childTrial.status, 400, 'adult class is not offered when a kids class exists');
  const hiddenTrial = (extra) => fetch(`${base}/api/public/trial`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.42' }, body: JSON.stringify({ fullName: 'Hidden fixture', phone: '0900000088', age: 25, agree: true, policyVersion, ...extra }) });
  assert.equal((await hiddenTrial({ disciplineId: 99999 })).status, 400, 'hidden discipline is unavailable');
  assert.equal((await hiddenTrial({ feePlanId: 99999 })).status, 400, 'hidden plan is unavailable');
  assert.equal((await hiddenTrial({ classId: 99999, trialDate: date })).status, 400, 'class with only hidden disciplines is unavailable');
  const schedule = await (await fetch(`${base}/lich-hoc`)).text();
  assert.ok(!schedule.includes('Hidden smoke class'), 'hidden discipline class stays off the public schedule');

  const post = await api('posts', { title: 'Smoke test', content: '<p>Training</p>', publishedAt: Date.now(), isPublic: false, media: [{ type: 'image', key: 'public/smoke-test.jpg' }] });
  assert.equal(post.status, 201, 'post with media');
  const postId = (await post.json()).id;
  const saved = await fetch(`${base}/api/admin/posts/${postId}`, { headers: { cookie } });
  assert.equal((await saved.json()).media[0].key, 'public/smoke-test.jpg', 'post media committed');

  const image = new FormData();
  image.append('file', new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'smoke.png');
  image.append('variantOf', 'public/existing.jpg');
  assert.equal((await fetch(`${base}/api/admin/upload`, { method: 'POST', headers: { cookie }, body: image })).status, 400, 'cannot overwrite an existing thumbnail');
  console.log('API smoke passed: conversion, trial slot, post media, image overwrite guard');
} finally {
  if (worker && worker.exitCode == null) {
    worker.kill();
    await new Promise((ok) => worker.once('exit', ok));
  }
  assert.ok(resolve(state).startsWith(resolve(tmpdir()) + sep), 'disposable D1 stays in temp directory');
  await rm(state, { recursive: true, force: true, maxRetries: 12, retryDelay: 500 });
}
