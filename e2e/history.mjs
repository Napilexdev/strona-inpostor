// Historia skojarzeń: najnowsze na górze, zwijanie panelu w bok.
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
await p.goto(`${BASE}/?quality=low`);
await p.evaluate(() => localStorage.removeItem('impostor:history-collapsed'));
await p.fill('#nick', 'Adam');
await p.getByRole('button', { name: 'Utwórz lobby' }).click();
await p.waitForSelector('[data-testid="lobby-panel"]');
const code = p.url().split('/').pop();
const bots = [];
for (const n of ['Kasia', 'Ola']) {
  const s = io(BASE, { transports: ['websocket'] });
  s.on('room:state', (st) => {
    const r = st.room, me = st.self.playerId, g = r.game;
    if (r.phase === 'roles' && !r.players.find((x) => x.id === me)?.acknowledged) s.emit('game:ack-role', {}, () => {});
    if (r.phase === 'clues' && g.currentTurnPlayerId === me) s.emit('game:submit-clue', { word: `${n.toLowerCase()}-r${g.round}` }, () => {});
    if (r.phase === 'continuation-vote' && !st.self.continuationVote) s.emit('game:submit-continuation-vote', { choice: 'continue' }, () => {});
  });
  await new Promise((r) => s.on('connect', r));
  await s.emitWithAck('lobby:join', { code, nickname: n });
  await s.emitWithAck('lobby:ready', { ready: true });
  bots.push(s);
}
await p.getByRole('button', { name: 'Ustawienia pokoju' }).click();
await p.locator('select[aria-label="Maksymalna liczba rund"]').selectOption('0');
await p.locator('select[aria-label="Czas na podanie słowa"]').selectOption('0');
await p.keyboard.press('Escape');
await p.getByTestId('start-btn').click();
await p.getByRole('button', { name: 'Rozumiem' }).click();
// dwie rundy: host podaje słowa, w głosowaniu wybiera „kolejna runda”
for (let round = 1; round <= 2; round++) {
  await p.getByTestId('clue-input').waitFor({ timeout: 20000 });
  await p.getByTestId('clue-input').fill(`adam-r${round}`);
  await p.getByTestId('clue-submit').click();
  if (round === 1) {
    await p.getByTestId('cont-continue').waitFor({ timeout: 20000 });
    await p.getByTestId('cont-continue').click();
  }
}
await p.waitForTimeout(1500);
const items = await p.locator('aside [data-testid="history"] li').allTextContents();
const headers = await p.locator('aside [data-testid="history"] h4').allTextContents();
check('Najnowsza runda na górze', headers[0]?.startsWith('Runda 2') && headers.at(-1)?.startsWith('Runda 1'), headers.join(' | '));
check('Najnowsze słowo na górze listy', /-r2/.test(items[0] ?? ''), items[0]);
check('Najstarsze słowo na dole', /1\..*-r1/.test(items.at(-1) ?? ''), items.at(-1));
await p.screenshot({ path: `${OUT}/40-history-newest-top.png` });

const w0 = (await p.locator('canvas').boundingBox()).width;
await p.getByTestId('history-collapse').click();
await p.waitForTimeout(800);
const w1 = (await p.locator('canvas').boundingBox()).width;
check('Panel zwinięty — arena szersza', w1 > w0 + 200, `${Math.round(w0)} → ${Math.round(w1)}`);
await p.screenshot({ path: `${OUT}/41-history-collapsed.png` });
await p.reload();
await p.waitForSelector('[data-testid="clues-panel"], [data-testid="continuation-panel"]', { timeout: 15000 });
check('Zwinięcie zapamiętane po odświeżeniu', (await p.getByTestId('history-expand').count()) === 1);
await p.getByTestId('history-expand').click();
check('Panel znów rozwinięty', (await p.locator('aside [data-testid="history"]').count()) === 1);
bots.forEach((s) => s.close());
await b.close();
console.log(fails ? `${fails} nie przeszło` : 'Historia działa');
