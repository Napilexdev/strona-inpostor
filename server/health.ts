/**
 * Stan serwera dla /healthz (JSON) i /status (czytelna strona z odświeżaniem).
 * Pomiary są tanie: CPU i opóźnienie pętli zdarzeń liczone w tle co 5 s.
 * Celowo bez kodów pokoi i nicków — strona jest publiczna.
 */
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import type { Server } from 'socket.io';
import type { RoomManager } from './manager';

const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();

let cpuPercent = 0;
let lagP99 = 0;
let lagMax = 0;
let prevCpu = process.cpuUsage();
let prevAt = process.hrtime.bigint();
setInterval(() => {
  const now = process.hrtime.bigint();
  const cpu = process.cpuUsage(prevCpu);
  const elapsedUs = Number(now - prevAt) / 1000;
  cpuPercent = elapsedUs > 0 ? ((cpu.user + cpu.system) / elapsedUs) * 100 : 0;
  prevCpu = process.cpuUsage();
  prevAt = now;
  // pomiar zawiera samą rozdzielczość licznika (20 ms) — odejmujemy ją
  lagP99 = Math.max(0, loop.percentile(99) / 1e6 - 20);
  lagMax = Math.max(0, loop.max / 1e6 - 20);
  loop.reset();
}, 5000).unref();

/** Rozłączenia z ostatniej godziny wg powodu (pomaga zdiagnozować „wyrzucanie” graczy). */
const disconnects: { at: number; reason: string }[] = [];
const REASON_PL: Record<string, string> = {
  'ping timeout': 'brak odpowiedzi (słaba sieć / zamrożona karta)',
  'transport close': 'zerwane połączenie (sieć, zamknięta karta, proxy)',
  'transport error': 'błąd połączenia',
  'client namespace disconnect': 'gracz zamknął grę',
  'server namespace disconnect': 'rozłączony przez serwer',
  'server shutting down': 'restart serwera',
  'parse error': 'uszkodzone dane',
};
export function noteDisconnect(reason: string) {
  const now = Date.now();
  disconnects.push({ at: now, reason });
  while (disconnects.length && (disconnects[0].at < now - 3600_000 || disconnects.length > 5000)) disconnects.shift();
}
function disconnectSummary() {
  const since = Date.now() - 3600_000;
  const out: Record<string, number> = {};
  for (const d of disconnects) if (d.at >= since) out[REASON_PL[d.reason] ?? d.reason] = (out[REASON_PL[d.reason] ?? d.reason] ?? 0) + 1;
  return out;
}

const mb = (b: number) => Math.round((b / 1024 / 1024) * 10) / 10;
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export interface Version {
  commit: string | null;
  build: string | null;
  startedAt: string;
}

export function healthReport(manager: RoomManager, io: Server, version: Version) {
  let players = 0;
  let connected = 0;
  const phases: Record<string, number> = {};
  for (const room of manager.rooms.values()) {
    phases[room.phase] = (phases[room.phase] ?? 0) + 1;
    for (const p of room.players.values()) {
      players++;
      if (p.connected) connected++;
    }
  }
  const mem = process.memoryUsage();
  const load = os.loadavg();
  const cores = os.cpus().length || 1;
  const warnings: string[] = [];
  if (lagP99 > 200) warnings.push(`Serwer reaguje z opóźnieniem (${round(lagP99, 0)} ms).`);
  if (cpuPercent > 80) warnings.push(`Wysokie zużycie procesora przez grę (${round(cpuPercent, 0)}%).`);
  if (mem.rss > 900 * 1024 * 1024) warnings.push(`Gra zużywa dużo pamięci (${mb(mem.rss)} MB).`);
  if (os.freemem() < 100 * 1024 * 1024) warnings.push(`Mało wolnej pamięci na serwerze (${mb(os.freemem())} MB).`);
  if (load[0] > cores * 1.5) warnings.push(`Serwer jest przeciążony (obciążenie ${round(load[0], 2)} przy ${cores} rdzeniach).`);
  const status = lagP99 > 1000 ? 'error' : warnings.length ? 'warn' : 'ok';
  return {
    ok: status !== 'error',
    status,
    warnings,
    rooms: manager.rooms.size,
    roomsByPhase: phases,
    players,
    playersConnected: connected,
    sockets: io.engine.clientsCount,
    disconnectsLastHour: disconnectSummary(),
    process: {
      uptimeSec: Math.round(process.uptime()),
      cpuPercent: round(cpuPercent),
      memoryMB: { rss: mb(mem.rss), heapUsed: mb(mem.heapUsed), heapTotal: mb(mem.heapTotal) },
      eventLoopLagMs: { p99: round(lagP99), max: round(lagMax) },
      node: process.version,
    },
    system: {
      cores,
      load: load.map((l) => round(l, 2)),
      freeMemoryMB: mb(os.freemem()),
      totalMemoryMB: mb(os.totalmem()),
      uptimeSec: Math.round(os.uptime()),
    },
    ...version,
    now: new Date().toISOString(),
  };
}

const PHASE_PL: Record<string, string> = {
  lobby: 'poczekalnia',
  roles: 'losowanie ról',
  clues: 'skojarzenia',
  'continuation-vote': 'decyzja',
  discussion: 'dyskusja',
  'elimination-vote': 'głosowanie',
  reveal: 'ujawnienie',
  'last-guess': 'ostatnia próba',
  ended: 'koniec gry',
};

function duration(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min ${sec % 60} s`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Prosta strona HTML ze stanem serwera (odświeża się co 5 s). */
export function statusPage(r: ReturnType<typeof healthReport>) {
  const color = r.status === 'ok' ? '#3ddc97' : r.status === 'warn' ? '#ffd43b' : '#ff4d6d';
  const label = r.status === 'ok' ? 'Wszystko działa' : r.status === 'warn' ? 'Działa, ale uwaga' : 'Problem z serwerem';
  const phases = Object.entries(r.roomsByPhase)
    .map(([k, v]) => `${PHASE_PL[k] ?? k}: ${v}`)
    .join(' · ');
  const row = (k: string, v: string) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="5"><title>IMPOSTOR — status</title>
<style>body{margin:0;background:#0b0e1d;color:#e8e9f3;font:15px/1.5 system-ui,sans-serif;padding:24px}main{max-width:560px;margin:auto}
h1{font-size:22px;margin:0 0 16px}.badge{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#151a33;font-weight:600}
.dot{width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color}}table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:8px 0;border-bottom:1px solid #1d2342}td:first-child{color:#9aa0c3}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.warn{margin-top:12px;padding:10px 12px;border-radius:10px;background:#3a2f0b;color:#ffe08a}small{color:#6c7299}</style></head><body><main>
<h1>IMPOSTOR — status serwera</h1><span class="badge"><span class="dot"></span>${label}</span>
${r.warnings.map((w) => `<div class="warn">${esc(w)}</div>`).join('')}
<table>
${row('Pokoje', `${r.rooms}${phases ? ` <small>(${esc(phases)})</small>` : ''}`)}
${row('Gracze (połączeni / wszyscy)', `${r.playersConnected} / ${r.players}`)}
${row('Otwarte połączenia', String(r.sockets))}
${row('Rozłączenia (ostatnia godzina)', Object.keys(r.disconnectsLastHour).length ? Object.entries(r.disconnectsLastHour).map(([k, v]) => `${v}× <small>${esc(k)}</small>`).join('<br>') : '0')}
${row('Procesor (gra)', `${r.process.cpuPercent}%`)}
${row('Pamięć (gra)', `${r.process.memoryMB.rss} MB`)}
${row('Opóźnienie serwera', `${r.process.eventLoopLagMs.p99} ms <small>(maks. ${r.process.eventLoopLagMs.max} ms)</small>`)}
${row('Obciążenie systemu', `${r.system.load.join(' / ')} <small>(${r.system.cores} rdzeni)</small>`)}
${row('Wolna pamięć systemu', `${r.system.freeMemoryMB} / ${r.system.totalMemoryMB} MB`)}
${row('Gra działa od', duration(r.process.uptimeSec))}
${row('Wersja', esc(r.commit ?? 'nieznana'))}
</table><p><small>Odświeża się co 5 s · ${esc(r.now)} · dane w JSON: <a style="color:#9b82ff" href="/healthz">/healthz</a></small></p></main></body></html>`;
}
