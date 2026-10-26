// Scenariusze powrotu do gry: odświeżenie, zamknięcie karty i ponowne otwarcie linku, powrót ze strony głównej, utrata sieci.
import { createRequire } from 'node:module';
import { io } from 'socket.io-client';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch();
let fails = 0;
const check = (n, ok, extra = '') => { console.log(`${ok ? '✔' : '✘'} ${n}${extra ? ' — ' + extra : ''}`); if (!ok) { fails++; process.exitCode = 1; } };

const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
let p = await ctx.newPage();
await p.goto(`${BASE}/?webgl=0`);
await p.fill('#nick', 'Adam');
await p.getByRole('button', { name: 'Utwórz lobby' }).click();
await p.waitForSelector('[data-testid="lobby-panel"]');
const code = p.url().split('/').pop();
const bots = [];
for (const n of ['Kasia', 'Ola']) {
  const s = io(BASE, { transports: ['websocket'] });
  await new Promise((r) => s.on('connect', r));
  await s.emitWithAck('lobby:join', { code, nickname: n });
  await s.emitWithAck('lobby:ready', { ready: true });
  bots.push(s);
}
await p.getByTestId('start-btn').click();
await p.waitForSelector('[data-testid="role-card"]');
const inGame = async (pg) => pg.waitForSelector('[data-testid="role-card"], [data-testid="clues-panel"], [data-testid="lobby-panel"]', { timeout: 8000 }).then(() => true).catch(() => false);

// 1. odświeżenie
await p.reload();
check('Odświeżenie strony', await inGame(p));

// 2. zamknięcie karty i otwarcie linku w nowej karcie
await p.close();
p = await ctx.newPage();
await p.goto(`${BASE}/room/${code}?webgl=0`);
const back = p.getByTestId('rejoin-btn');
await p.waitForTimeout(2500);
const hasBtn = await back.isVisible().catch(() => false);
if (!hasBtn) console.log('DEBUG strona:', (await p.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' / '), '| LS:', await p.evaluate(() => localStorage.getItem('impostor:last-session')));
if (hasBtn) await back.click();
check('Nowa karta z linkiem → powrót do gry', hasBtn && (await inGame(p)));

// 3. zamknięcie karty, wejście na stronę główną → „Wróć do gry”
await p.close();
p = await ctx.newPage();
await p.goto(`${BASE}/?webgl=0`);
const homeBtn = p.getByTestId('resume-btn');
await p.waitForTimeout(1500);
const hasHome = await homeBtn.isVisible().catch(() => false);
if (hasHome) await homeBtn.click();
check('Strona główna → „Wróć do gry”', hasHome && (await inGame(p)));

// 4. utrata sieci na 5 s
await ctx.setOffline(true);
await p.waitForTimeout(5000);
await ctx.setOffline(false);
await p.waitForTimeout(4000);
check('Utrata internetu i powrót', (await p.locator('[role=status]').filter({ hasText: 'Połączono' }).count()) > 0 || (await p.getByText('Połączono').count()) > 0);
check('Nadal w grze po utracie sieci', await inGame(p));

bots.forEach((s) => s.close());
await b.close();
console.log(fails ? `${fails} scenariuszy nie działa` : 'Wszystkie scenariusze powrotu działają');
