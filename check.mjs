// npm run check: runs the unit tests, builds the app, reads the built bundle, then opens
// the built app in Edge. Every line must say PASS; the script exits 1 otherwise.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright-core';

let failures = 0;
function check(ok, text) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${text}`);
  if (!ok) failures++;
}
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.log(e.stdout ?? '', e.stderr ?? '');
    throw new Error(`command failed: ${cmd}`);
  }
}

// 1. Unit tests. Each spec prints one RESULT line: what compiled it, the onPush flag, the view.
console.log('--- unit tests (ng test, Vitest, jsdom)');
const testOut = run('npx ng test --watch=false');
const rows = new Map(
  [...testOut.matchAll(/RESULT (\{.*\})/g)].map((m) => {
    const r = JSON.parse(m[1]);
    return [r.label, r];
  }),
);
const expected = [
  ['A plain TestBed', 'AOT', true, 'Checking...'],
  ['B overrideComponent, fake Pinger', 'JIT', false, 'Checking...'],
  ['B2 overrideComponent, real Pinger', 'JIT', false, 'Checking...'],
  ['A again, after B', 'AOT', true, 'Checking...'],
  ['C StatusBar, plain TestBed', 'AOT', true, 'Checking...'],
  ['D StatusBar, badge overridden', 'JIT', false, 'Online'],
  ['E StatusBar, override sets OnPush', 'JIT', true, 'Checking...'],
  ['fix 1 OnPush on the component, overridden', 'JIT', true, 'Checking...'],
  ['fix 2 changeDetection in the override', 'JIT', true, 'Checking...'],
  ['overrideProvider, fake Pinger', 'AOT', true, 'Checking...'],
  ['signal, plain TestBed', 'AOT', true, 'Online'],
  ['signal, overrideComponent', 'JIT', false, 'Online'],
  ['click, plain TestBed', 'AOT', true, 'Online'],
  ['click, overrideComponent', 'JIT', false, 'Online'],
  ['Eager on the component, plain TestBed', 'AOT', false, 'Checking...'],
];
for (const [label, compiled, onPush, view] of expected) {
  const r = rows.get(label);
  const ok = !!r && r.compiled === compiled && r.onPush === onPush && r.view === view;
  const got = r ? `${r.compiled}  onPush=${r.onPush}  view "${r.view}"` : 'missing';
  check(ok, `${label.padEnd(44)} ${got}`);
}
const stale = rows.get('stale parent: override after an earlier render');
check(stale?.calls === 0 && stale?.view === 'Checking...', 'stale parent: a later override of the child is ignored (fake called 0 times)');
check(/Tests\s+17 passed \(17\)/.test(testOut), 'all 17 specs passed (three of them expect NG0100 to be thrown)');

// 2. The production build, and what the AOT compiler wrote for each badge.
console.log('--- ng build (production)');
run('npx ng build');
const dist = join('dist', 'angular22-overridecomponent-onpush-demo', 'browser');
const mainJs = readdirSync(dist).find((f) => /^main-.*\.js$/.test(f));
const bundle = readFileSync(join(dist, mainJs), 'utf8');
function defOf(selector) {
  const i = bundle.indexOf(`selectors:[["${selector}"]]`);
  return i < 0 ? null : bundle.slice(i, bundle.indexOf('})', i) + 2);
}
const noLine = defOf('app-connection-badge');
const onPushDef = defOf('app-onpush-badge');
const eagerDef = defOf('app-eager-badge');
check(noLine && !/changeDetection:/.test(noLine), 'app-connection-badge (no line): no changeDetection key in the built def, so OnPush');
check(onPushDef && !/changeDetection:/.test(onPushDef), 'app-onpush-badge (OnPush written): no changeDetection key either');
check(eagerDef && /changeDetection:1\}\)$/.test(eagerDef), 'app-eager-badge (Eager written): changeDetection:1 in the built def');
check(noLine?.replaceAll('app-connection-badge', 'X') === onPushDef?.replaceAll('app-onpush-badge', 'X'),
  'the no-line badge and the OnPush badge compile to the same definition');

// 3. The built app in Edge.
console.log('--- the built app in Edge');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const profilePrefix = 'playwright_chromiumdev_profile-';
const countProfiles = () => readdirSync(tmpdir()).filter((f) => f.startsWith(profilePrefix)).length;
const profilesBefore = countProfiles();

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForSelector('app-status-bar .badge');
  const read = () =>
    page.evaluate(() => ({
      noLine: document.querySelector('app-status-bar .badge').textContent.trim(),
      onPush: document.querySelector('#onpush .badge').textContent.trim(),
      eager: document.querySelector('#eager .badge').textContent.trim(),
      signal: document.querySelector('#signal .badge').textContent.trim(),
      details: !!document.querySelector('app-status-bar .details'),
    }));
  const show = (s) => `no line "${s.noLine}"  OnPush "${s.onPush}"  Eager "${s.eager}"  signal "${s.signal}"`;

  await page.waitForTimeout(1500);
  const afterTimer = await read();
  console.log(`after 1.5 s:         ${show(afterTimer)}`);
  check(afterTimer.noLine === 'Checking...' && afterTimer.onPush === 'Checking...' && afterTimer.eager === 'Checking...',
    'after the pings: the three plain-field badges still say "Checking..." (zoneless: nothing told Angular)');
  check(afterTimer.signal === 'Online', 'after the pings: the signal badge says "Online" by itself');

  await page.click('app-status-bar button');
  await page.waitForSelector('app-status-bar .details');
  await page.waitForTimeout(300);
  const afterClick = await read();
  console.log(`after click details: ${show(afterClick)}`);
  check(afterClick.details, 'the click re-rendered the status bar (the details line is there)');
  check(afterClick.eager === 'Online', 'the Eager badge was checked by that pass and says "Online"');
  check(afterClick.noLine === 'Checking...', 'the badge with no changeDetection line still says "Checking...": the build runs it as OnPush');
  check(afterClick.onPush === 'Checking...', 'the badge with OnPush written behaves the same');
} finally {
  await browser.close();
  server.close();
}
check(countProfiles() <= profilesBefore, 'Edge left no temporary profile folder behind');

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks PASS');
process.exit(failures ? 1 : 0);
