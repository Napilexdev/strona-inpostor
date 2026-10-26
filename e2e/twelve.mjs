// Podgląd areny dla 12 graczy: host w przeglądarce + 11 botów przez Socket.IO.
import { createRequire } from 'node:module';
import { io } from 'socket.io-client';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const h = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await h.goto(`${BASE}/?quality=high`);
await h.fill('#nick', 'Gospodarz');
await h.getByRole('button', { name: 'Utwórz lobby' }).click();
await h.waitForSelector('[data-testid="lobby-panel"]');
const code = h.url().split('/').pop();
await h.getByRole('button', { name: 'Ustawienia pokoju' }).click();
for (let i = 0; i < 6; i++) { await h.getByRole('button', { name: 'Zwiększ limit graczy' }).click(); }
await h.keyboard.press('Escape');
const names = ['Kasia', 'Michał', 'Ola', 'Piotr', 'Zosia', 'Bartek', 'Ewa', 'Tomek', 'Ania', 'Kuba'];
const bots = [];
for (const n of names) {
  const s = io(BASE, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  await s.emitWithAck('lobby:join', { code, nickname: n });
  await s.emitWithAck('lobby:ready', { ready: true });
  bots.push(s);
}
await h.waitForTimeout(3500);
await h.screenshot({ path: 'e2e/out/12-twelve-desktop.png' });
const m = await (await b.newContext(devices['iPhone 13'])).newPage();
await m.goto(`${BASE}/?quality=low`);
await m.fill('#nick', 'Magdalena');
await m.fill('#code', code);
await m.getByRole('button', { name: 'Dołącz do gry' }).click();
await m.waitForSelector('[data-testid="lobby-panel"]');
await m.waitForTimeout(3000);
await h.waitForTimeout(500);
await m.screenshot({ path: 'e2e/out/13-twelve-mobile-full.png' });
bots.forEach((s) => s.close());
await b.close();
