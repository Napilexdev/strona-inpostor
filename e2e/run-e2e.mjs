/**
 * Test end-to-end w prawdziwej przeglądarce (Playwright / Chromium).
 * Symuluje 4 graczy na różnych „urządzeniach” (desktop + telefon) i rozgrywa pełną grę.
 *
 * Użycie: uruchom serwer (npm run build && npm start), potem:
 *   BASE_URL=http://localhost:3000 node e2e/run-e2e.mjs
 * Wymaga pakietu `playwright` z przeglądarką Chromium (npx playwright install chromium).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Brak pakietu playwright. Zainstaluj: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.resolve('e2e/out');
// Na maszynach bez GPU (CI) część graczy używa widoku zastępczego, żeby nie przeciążyć CPU programowym WebGL.
const LIGHT = process.env.E2E_ALL_WEBGL ? '' : '?webgl=0';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) process.exitCode = 1;
}

const browser = await playwright.chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const consoleErrors = [];

async function newPlayer(name, device) {
  const ctx = await browser.newContext(device ?? { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${name}: ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`${name}: ${e.message}`));
  return { name, page, ctx };
}

const shot = (p, file) => p.page.screenshot({ path: path.join(OUT, file) });
const podiums = (p) => p.page.locator('[data-testid="arena"]').first().getAttribute('data-podiums');

try {
  // 1. Strona główna
  const host = await newPlayer('Adam');
  await host.page.goto(`${BASE}${process.env.E2E_ALL_WEBGL ? '' : '?quality=low'}`);
  await host.page.waitForTimeout(1500);
  await shot(host, '01-home.png');
  check('Strona główna zawiera przyciski', (await host.page.getByRole('button', { name: 'Utwórz lobby' }).count()) === 1 && (await host.page.getByRole('button', { name: 'Dołącz do gry' }).count()) === 1);

  // walidacja pustego nicku
  await host.page.getByRole('button', { name: 'Utwórz lobby' }).click();
  check('Pusty nick jest odrzucany', await host.page.locator('p[role=alert]').isVisible());

  // błędny kod
  await host.page.fill('#nick', 'Adam');
  await host.page.fill('#code', 'ZZZZZ');
  await host.page.getByRole('button', { name: 'Dołącz do gry' }).click();
  await host.page.waitForTimeout(600);
  check('Nieistniejący pokój → komunikat', (await host.page.locator('p[role=alert]').textContent())?.includes('nie istnieje'));

  // 2. Utworzenie lobby
  await host.page.getByRole('button', { name: 'Utwórz lobby' }).click();
  await host.page.waitForURL(/\/room\/[A-Z2-9]{5}$/);
  const code = host.page.url().split('/').pop();
  await host.page.waitForSelector('[data-testid="lobby-panel"]');
  check('Utworzono pokój z kodem', /^[A-Z2-9]{5}$/.test(code), code);
  check('Domyślnie 6 podestów', (await podiums(host)) === '6');

  // 3. Dołączanie przez link (desktop) i przez kod (telefon)
  const kasia = await newPlayer('Kasia', { viewport: { width: 1280, height: 800 } });
  await kasia.page.goto(`${BASE}/room/${code}${LIGHT}`);
  await kasia.page.fill('#join-nick', 'Kasia');
  await kasia.page.getByRole('button', { name: 'Dołącz do gry' }).click();
  await kasia.page.waitForSelector('[data-testid="lobby-panel"]');

  const michal = await newPlayer('Michał', { ...playwright.devices['iPhone 13'] });
  await michal.page.goto(BASE);
  await michal.page.fill('#nick', 'Michał');
  await michal.page.fill('#code', code);
  await michal.page.getByRole('button', { name: 'Dołącz do gry' }).click();
  await michal.page.waitForSelector('[data-testid="lobby-panel"]');

  const ola = await newPlayer('Ola', { ...playwright.devices['Pixel 7'] });
  await ola.page.goto(`${BASE}/room/${code}${LIGHT}`);
  await ola.page.fill('#join-nick', 'kasia'); // duplikat
  await ola.page.getByRole('button', { name: 'Dołącz do gry' }).click();
  await ola.page.waitForTimeout(500);
  check('Duplikat nicku odrzucony', (await ola.page.locator('p[role=alert]').textContent())?.includes('zajęty'));
  await ola.page.fill('#join-nick', 'Ola');
  await ola.page.getByRole('button', { name: 'Dołącz do gry' }).click();
  await ola.page.waitForSelector('[data-testid="lobby-panel"]');

  const all = [host, kasia, michal, ola];
  await host.page.waitForFunction(() => document.querySelector('[data-testid="seat-count"]')?.textContent?.includes('4/6'));
  check('Licznik miejsc 4/6 u hosta', true);

  // 4. Zmiana limitu → 8 podestów u wszystkich
  await host.page.getByRole('button', { name: 'Ustawienia pokoju' }).click();
  await host.page.getByRole('button', { name: 'Zwiększ limit graczy' }).click();
  await host.page.getByRole('button', { name: 'Zwiększ limit graczy' }).click();
  await host.page.waitForFunction(() => document.querySelector('[data-testid="limit-value"]')?.textContent === '8');
  await host.page.locator('select[aria-label="Czas dyskusji"]').selectOption('0');
  await host.page.locator('select[aria-label="Maksymalna liczba rund"]').selectOption('0');
  await host.page.keyboard.press('Escape');
  for (const p of all) {
    await p.page
      .waitForFunction(() => document.querySelector('[data-testid="arena"]')?.getAttribute('data-podiums') === '8', null, { timeout: 15000 })
      .catch(async (e) => {
        const info = await p.page.evaluate(() => [...document.querySelectorAll('[data-testid="arena"]')].map((a) => a.getAttribute('data-podiums')).join(',') + ' | ' + document.querySelector('[data-testid="seat-count"]')?.textContent);
        throw new Error(`${p.name}: ${info} — ${e.message}`);
      });
  }
  check('Zmiana limitu na 8 → 8 podestów na wszystkich urządzeniach', true);
  await kasia.page.waitForTimeout(1500);
  await shot(host, '02-lobby-8-desktop.png');
  await shot(kasia, '02b-lobby-fallback.png');
  await shot(michal, '03-lobby-8-mobile.png');

  // limit poniżej liczby graczy jest odrzucany przez serwer (UI blokuje przycisk przy 4)
  await host.page.getByRole('button', { name: 'Ustawienia pokoju' }).click();
  for (let i = 0; i < 6; i++) {
    const btn = host.page.getByRole('button', { name: 'Zmniejsz limit graczy' });
    if (await btn.isDisabled()) break;
    await btn.click();
    await host.page.waitForTimeout(150);
  }
  const minLimit = await host.page.locator('[data-testid="limit-value"]').textContent();
  check('Limitu nie da się zmniejszyć poniżej liczby graczy', minLimit === '4', `limit=${minLimit}`);
  await host.page.getByRole('button', { name: 'Zwiększ limit graczy' }).click();
  await host.page.getByRole('button', { name: 'Zwiększ limit graczy' }).click();
  await host.page.keyboard.press('Escape');

  // 5. Gotowość i start
  check('Start zablokowany, gdy nikt nie jest gotowy', await host.page.getByTestId('start-btn').isDisabled());
  for (const p of [kasia, michal, ola]) await p.page.getByTestId('ready-btn').click();
  await host.page.waitForFunction(() => !document.querySelector('[data-testid="start-btn"]')?.hasAttribute('disabled'));
  await host.page.getByTestId('start-btn').click();

  // 6. Role
  const roles = {};
  let secret = null;
  for (const p of all) {
    await p.page.waitForSelector('[data-testid="role-card"]');
    const text = await p.page.getByTestId('role-card').textContent();
    roles[p.name] = text.includes('IMPOSTOREM') ? 'impostor' : 'crewmate';
    if (roles[p.name] === 'crewmate') secret = await p.page.getByTestId('secret-word').textContent();
  }
  const impostorName = Object.keys(roles).find((n) => roles[n] === 'impostor');
  check('Dokładnie jeden impostor', Object.values(roles).filter((r) => r === 'impostor').length === 1, impostorName);
  const imp = all.find((p) => p.name === impostorName);
  const impHtml = await imp.page.content();
  check('Impostor nie ma hasła w DOM', !impHtml.includes(`>${secret}<`), `hasło: ${secret}`);
  await shot(imp, '04-role-impostor.png');
  await shot(all.find((p) => p !== imp), '05-role-crewmate.png');
  for (const p of all) await p.page.getByRole('button', { name: 'Rozumiem' }).click();

  // 7. Runda skojarzeń — tylko jeden gracz ma pole tekstowe
  async function playRound(n) {
    for (let i = 0; i < 4; i++) {
      let turnPage = null;
      for (let tries = 0; tries < 40 && !turnPage; tries++) {
        let vis = await Promise.all(all.map((p) => p.page.getByTestId('clue-input').isVisible().catch(() => false)));
        if (vis.filter(Boolean).length > 1) {
          // strony odświeżają się w różnych chwilach — sprawdź ponownie, gdy wszystkie dostaną nowy stan
          await host.page.waitForTimeout(800);
          vis = await Promise.all(all.map((p) => p.page.getByTestId('clue-input').isVisible().catch(() => false)));
          if (vis.filter(Boolean).length > 1) check('Tylko jedna osoba może pisać', false);
        }
        turnPage = all[vis.indexOf(true)] ?? null;
        if (!turnPage) await host.page.waitForTimeout(150);
      }
      if (!turnPage) throw new Error('Nikt nie ma tury');
      if (n === 1 && i === 1) {
        await shot(turnPage, '06-my-turn.png');
        await shot(host === turnPage ? kasia : host, '07-waiting-turn.png');
      }
      await turnPage.page.getByTestId('clue-input').fill(`${turnPage.name.toLowerCase()}${n}`);
      await turnPage.page.getByTestId('clue-submit').click();
      await turnPage.page.waitForTimeout(250);
    }
  }
  await playRound(1);
  check('Runda 1 rozegrana po kolei', true);

  // 8. Odświeżenie strony w trakcie gry → przywrócenie stanu
  await kasia.page.reload();
  await kasia.page.waitForSelector('[data-testid="continuation-panel"]', { timeout: 10000 });
  const hist = await kasia.page.getByTestId('history').textContent();
  check('Po odświeżeniu przywrócono etap i historię', hist.includes('adam1') && hist.includes('ola1'));

  // 9. Głosowanie decyzyjne: 2 za kolejną rundą, 2 za głosowaniem → remis → runda 2
  await host.page.getByTestId('cont-continue').click();
  await kasia.page.getByTestId('cont-continue').click();
  await michal.page.getByTestId('cont-vote').click();
  await ola.page.getByTestId('cont-vote').click();
  await host.page.waitForSelector('[data-testid="clues-panel"]');
  check('Remis w głosowaniu decyzyjnym → kolejna runda', (await host.page.getByTestId('stage-banner').textContent()).includes('Runda 2'));
  await playRound(2);
  for (const p of all) await p.page.getByTestId('cont-vote').click();

  // 10. Głosowanie eliminacyjne (dyskusja pominięta w ustawieniach)
  await host.page.waitForSelector('[data-testid="elimination-panel"]');
  await shot(michal, '08-elimination-mobile.png');
  for (const p of all) {
    const target = p === imp ? (p === host ? 'Kasia' : 'Adam') : impostorName;
    await p.page.getByTestId('candidate').filter({ hasText: target }).click();
    await p.page.getByTestId('confirm-vote').click();
  }
  await host.page.waitForSelector('[data-testid="reveal-panel"]');
  await host.page.waitForTimeout(1800);
  await shot(host, '09-reveal.png');

  // 11. Ostatnia próba — błędna odpowiedź
  await imp.page.waitForSelector('[data-testid="guess-input"]', { timeout: 10000 });
  await imp.page.getByTestId('guess-input').fill('zupełnie-nie-to');
  await imp.page.getByRole('button', { name: 'Zgaduję' }).click();
  for (const p of all) await p.page.waitForSelector('[data-testid="end-panel"]');
  const winner = await host.page.getByTestId('winner').textContent();
  check('Wygrana zwykłych graczy po nietrafionej próbie', winner.includes('zwykli gracze'), winner);
  check('Ekran końcowy pokazuje hasło', (await host.page.getByTestId('final-word').textContent()) === secret);
  await host.page.waitForTimeout(1200);
  await shot(host, '10-end-desktop.png');
  await shot(ola, '11-end-mobile.png');

  // 12. Zagraj ponownie
  await host.page.getByTestId('restart-btn').click();
  for (const p of all) await p.page.waitForSelector('[data-testid="role-card"]');
  check('Restart w tym samym lobby rozdaje nowe role', true);

  // 13. Widok zastępczy bez WebGL
  const nogl = await newPlayer('NoGL');
  await nogl.page.goto(`${BASE}/?webgl=0`);
  await nogl.page.goto(`${BASE}/room/${code}?webgl=0`);
  await nogl.page.waitForSelector('[data-testid="arena-fallback"]');
  check('Widok zastępczy bez WebGL', true);

  // 14. Responsywność: brak poziomego przewijania na telefonie
  const overflow = await michal.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('Brak poziomego przewijania na telefonie', !overflow);
  const canvas = await host.page.locator('canvas').count();
  check('Scena renderowana w WebGL (canvas)', canvas > 0);
} catch (err) {
  console.error(err);
  check('Scenariusz E2E bez wyjątków', false, String(err));
} finally {
  const relevant = consoleErrors.filter((e) => !/WebGL|GPU|swiftshader|Download the React DevTools/i.test(e));
  check('Brak błędów w konsoli przeglądarki', relevant.length === 0, relevant.slice(0, 5).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} sprawdzeń zaliczonych. Zrzuty ekranu: ${OUT}`);
}
