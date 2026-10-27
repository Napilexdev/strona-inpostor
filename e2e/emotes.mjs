// Emotki: animacje, ikonki nad postaciami, przerwa 2 s.
import { createRequire } from 'node:module';
import path from 'node:path';
import { io } from 'socket.io-client';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.resolve('e2e/out');
let fails = 0;
const check = (n, ok, extra = '') => { console.log(`${ok ? '✔' : '✘'} ${n}${extra ? ' — ' + extra : ''}`); if (!ok) { fails++; process.exitCode = 1; } };

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${BASE}/?quality=high`);
await p.fill('#nick', 'Adam');
await p.getByRole('button', { name: 'Utwórz lobby' }).click();
await p.waitForSelector('[data-testid="lobby-panel"]');
const code = p.url().split('/').pop();
const names = ['Kasia', 'Ola', 'Piotr', 'Ewa', 'Kuba'];
const emotes = ['six-seven', 'dance', 'facepalm', 'clap', 'flex'];
const bots = [];
for (const n of names) {
  const s = io(BASE, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  await s.emitWithAck('lobby:join', { code, nickname: n });
  bots.push(s);
}
const received = [];
bots[0].on('room:emote', (e) => received.push(e));
await p.waitForTimeout(2500);

// host: dab z menu
await p.getByTestId('emote-btn').click();
await p.getByTestId('emote-dab').click();
await p.waitForFunction(() => /\d+ s/.test(document.querySelector('[data-testid="emote-btn"]')?.textContent ?? ''), null, { timeout: 1800 }).catch(() => {});
const label = await p.getByTestId('emote-btn').textContent();
check('Przycisk pokazuje odliczanie przerwy', /\d+ s/.test(label), label);
check('Przycisk zablokowany w czasie przerwy', await p.getByTestId('emote-btn').isDisabled());
await Promise.all(bots.map((s, i) => s.emitWithAck('player:emote', { emote: emotes[i] })));
// przerwa trwa tylko 2 s — sprawdzamy od razu
const again = await bots[0].emitWithAck('player:emote', { emote: 'wave' });
check('Serwer odrzuca emotkę przed upływem 2 s', !again.ok && /Kolejna emotka/.test(again.error), again.error);
await p.waitForTimeout(700);
const icons = await p.getByTestId('emote-icon').count();
await p.screenshot({ path: `${OUT}/30-emotes.png` });
check('Ikony emotek nad postaciami', icons === 6, `${icons}`);
check('Inni gracze dostają emotkę hosta', received.some((e) => e.emote === 'dab'));
await p.waitForTimeout(3500);
check('Ikony znikają po animacji', (await p.getByTestId('emote-icon').count()) === 0);
check('Brak błędów JS', errors.length === 0, errors.join(' | '));
bots.forEach((s) => s.close());
await b.close();
console.log(fails ? `${fails} nie przeszło` : 'Emotki działają');
