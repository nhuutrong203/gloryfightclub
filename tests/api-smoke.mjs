// End-to-end API checks against a disposable local D1. Run with npm run test:api.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { upcomingSessions } from '../src/lib/schedule.ts';

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
  worker = spawn(process.execPath, [wrangler, 'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', String(port), '--var', 'PUBLIC_HOST:smoke.invalid', '--log-level', 'error'], { stdio: 'ignore' });
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
  const api = (path, body) => fetch(`${base}/api/admin/${path}`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });

  const converted = await api('trials/999999/convert', {});
  assert.equal(converted.status, 201, 'trial conversion');
  assert.ok((await converted.json()).studentId);
  assert.equal((await api('trials/999999/convert', {})).status, 409, 'second conversion cannot create a duplicate');

  const date = upcomingSessions([{ id: 1, days: '246', startTime: '08:30', disciplineIds: [1], locationId: 1 }], new Date())[0].date;
  const trial = (locationId) => fetch(`${base}/api/public/trial`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: 'Smoke visitor', phone: '0900000088', classId: 1, trialDate: date, disciplineId: 1, locationId, agree: true }) });
  assert.equal((await trial(2)).status, 400, 'class and location cannot disagree');
  assert.equal((await trial(1)).status, 200, 'matching future class is accepted');

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
