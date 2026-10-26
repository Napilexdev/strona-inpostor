// Test nowych funkcji: wygląd postaci, ukrywanie kodu, dźwięki, własna paczka słów,
// podpowiedź impostora, chmurki ze słowami, punkty na mównicach.
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

// Kreator postaci na stronie głównej
await p.goto(`${BASE}/?quality=low`);
await p.fill('#nick', 'Adam');
await p.getByRole('radio', { name: /Kolor lawendowy/ }).click();
await p.getByRole('tab', { name: 'Czapka' }).click();
await p.getByRole('radio', { name: 'Cylinder' }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/20-creator.png` });
await p.getByRole('button', { name: 'Utwórz lobby' }).click();
await p.waitForSelector('[data-testid="lobby-panel"]');
const code = p.url().split('/').pop();

// Boty grające automatycznie
const PACK = ['kosmita', 'latawiec', 'karuzela', 'pustelnik', 'wiatrak', 'szałas'];
const bots = [];
for (const n of ['Kasia', 'Ola', 'Piotr']) {
  const s = io(BASE, { transports: ['websocket'] });
  const bot = { s, name: n, last: null, voted: new Set() };
  s.on('room:state', (st) => {
    bot.last = st;
    const r = st.room, me = st.self.playerId, g = r.game;
    if (r.phase === 'roles' && !r.players.find((x) => x.id === me)?.acknowledged) s.emit('game:ack-role', {}, () => {});
    if (r.phase === 'clues' && g.currentTurnPlayerId === me) s.emit('game:submit-clue', { word: `${n.toLowerCase()}${g.round}` }, () => {});
    if (r.phase === 'continuation-vote' && g.voters.includes(me) && !st.self.continuationVote) s.emit('game:submit-continuation-vote', { choice: 'vote' }, () => {});
    if (r.phase === 'elimination-vote' && g.voters.includes(me) && !st.self.eliminationVote) {
      const host = r.players.find((x) => x.isHost).id;
      const t = g.candidates.find((c) => c !== me && c === host) ?? g.candidates.find((c) => c !== me);
      s.emit('game:submit-elimination-vote', { targetId: t }, () => {});
    }
  });
  await new Promise((r) => s.on('connect', r));
  await s.emitWithAck('lobby:join', { code, nickname: n, appearance: { colorIndex: 4, hat: 4, face: 0, shirt: 2 } });
  await s.emitWithAck('lobby:ready', { ready: true });
  bots.push(bot);
}
await p.waitForTimeout(800);
const hostPub = bots[0].last.room.players.find((x) => x.nickname === 'Adam');
check('Host ma wybrany kolor i dodatek', hostPub.colorIndex === 4 && hostPub.hat === 5, `kolor ${hostPub.colorIndex}, czapka ${hostPub.hat}`);
const kasia = bots[0].last.room.players.find((x) => x.nickname === 'Kasia');
check('Zajęty kolor → przydzielono inny', kasia.colorIndex !== 4 && kasia.hat === 4);

// Ukrywanie kodu i wyciszanie
await p.getByTestId('hide-code').click();
check('Ukrycie kodu', (await p.getByTestId('room-code').textContent()) === '•••••');
await p.getByTestId('hide-code').click();
check('Pokazanie kodu', (await p.getByTestId('room-code').textContent()) === code);
await p.getByTestId('mute-btn').click();
check('Wyciszenie dźwięków', (await p.getByTestId('mute-btn').getAttribute('aria-pressed')) === 'true');
await p.getByTestId('mute-btn').click();

// Własna paczka słów
await p.getByRole('button', { name: 'Ustawienia pokoju' }).click();
await p.getByTestId('pack-text').fill(PACK.map((w) => `${w}; podp-${w}`).join('\n'));
await p.getByTestId('pack-upload').click();
await p.waitForTimeout(800);
check('Paczka wgrana i widoczna dla graczy (bez listy)', bots[0].last.room.customPack?.count === 6 && !JSON.stringify(bots[0].last).includes('pustelnik'));
await p.locator('select[aria-label="Czas dyskusji"]').selectOption('0');
await p.locator('select[aria-label="Maksymalna liczba rund"]').selectOption('1');
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/21-pack-settings.png` });
await p.keyboard.press('Escape');

// Gra
await p.getByTestId('start-btn').click();
await p.waitForSelector('[data-testid="role-card"]');
await p.waitForTimeout(500);
const states = bots.map((x) => x.last.self);
const all = [...states];
const hostRoleText = await p.getByTestId('role-card').textContent();
const hostIsImp = hostRoleText.includes('IMPOSTOREM');
const word = states.find((x) => x.role === 'crewmate')?.word ?? (await p.getByTestId('secret-word').textContent().catch(() => null));
check('Hasło pochodzi z własnej paczki', PACK.includes(word), word);
if (hostIsImp) {
  const hint = await p.getByTestId('impostor-hint').textContent();
  check('Impostor (host) widzi podpowiedź', hint.includes(`podp-${word}`), hint);
  await p.screenshot({ path: `${OUT}/22-impostor-hint.png` });
} else {
  const impBot = all.find((x) => x.role === 'impostor');
  check('Impostor (bot) dostał podpowiedź', impBot?.hint === `Skojarzenie: podp-${word}`, impBot?.hint);
}
check('Zwykli gracze nie dostają podpowiedzi', all.filter((x) => x.role === 'crewmate').every((x) => x.hint === null));
await p.getByRole('button', { name: 'Rozumiem' }).click();

// Tura hosta + chmurki
for (let i = 0; i < 40; i++) {
  if (await p.getByTestId('clue-input').isVisible().catch(() => false)) {
    await p.getByTestId('clue-input').fill('mojesłowo');
    await p.getByTestId('clue-submit').click();
    break;
  }
  await p.waitForTimeout(250);
}
await p.waitForSelector('[data-testid="elimination-panel"], [data-testid="discussion-panel"]', { timeout: 15000 });
await p.waitForTimeout(1200);
const bubbles = await p.getByTestId('bubble').allTextContents();
check('Chmurki ze słowami nad postaciami', bubbles.includes('mojesłowo') && bubbles.some((t) => t.startsWith('kasia')), bubbles.join(', '));
await p.screenshot({ path: `${OUT}/23-bubbles.png` });

// Host głosuje
const cand = p.getByTestId('candidate').first();
await cand.click();
await p.getByTestId('confirm-vote').click();
await p.waitForSelector('[data-testid="reveal-panel"], [data-testid="lastguess-panel"], [data-testid="end-panel"]', { timeout: 20000 });
// ostatnia próba (jeśli host jest wykrytym impostorem)
if (await p.getByTestId('guess-input').isVisible({ timeout: 7000 }).catch(() => false)) {
  await p.getByTestId('guess-input').fill('nie wiem');
  await p.getByRole('button', { name: 'Zgaduję' }).click();
}
for (const bot of bots) if (bot.last.self.canGuess) bot.s.emit('game:guess-word', { guess: 'xyz' }, () => {});
await p.waitForSelector('[data-testid="end-panel"]', { timeout: 40000 });
await p.waitForTimeout(1500);
const scores = bots[0].last.room.players.map((x) => x.score);
check('Punkty przyznane po grze', scores.some((x) => x > 0), scores.join(','));
await p.screenshot({ path: `${OUT}/24-end-scores.png` });

bots.forEach((x) => x.s.close());
check('Brak błędów JS na stronie', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close();
console.log(fails ? `${fails} sprawdzeń nie przeszło` : 'Wszystkie nowe funkcje działają');
