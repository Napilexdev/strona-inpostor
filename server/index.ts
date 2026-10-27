import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parse } from 'node:url';
import next from 'next';
import { createGameServer } from './socket';
import { healthReport, statusPage } from './health';

const dev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
if (!dev) (process.env as Record<string, string>).NODE_ENV = 'production';
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);

/** Informacja o wersji — widoczna pod /healthz, żeby łatwo sprawdzić, czy serwer działa na nowym kodzie. */
function versionInfo() {
  const read = (fn: () => string) => {
    try {
      return fn().trim();
    } catch {
      return null;
    }
  };
  return {
    commit: read(() => execSync('git log -1 --format="%h %s"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()),
    build: read(() => readFileSync('.next/BUILD_ID', 'utf8')),
    startedAt: new Date().toISOString(),
  };
}

async function main() {
  const version = versionInfo();
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (path === '/healthz' || path === '/status') {
      const report = healthReport(manager, io, version);
      const code = report.ok ? 200 : 503;
      if (path === '/healthz') {
        res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify(report));
      } else {
        res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(statusPage(report));
      }
      return;
    }
    handle(req, res, parse(req.url ?? '/', true));
  });

  const { manager, io } = createGameServer(httpServer, { corsOrigin: corsOrigin?.length ? corsOrigin : undefined });

  httpServer.listen(port, hostname, () => {
    console.log(`▶ IMPOSTOR działa na http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port} (${dev ? 'dev' : 'production'})`);
    console.log(`  wersja: ${version.commit ?? 'nieznana'} · build ${version.build ?? '-'}`);
  });

  const shutdown = () => {
    console.log('Zamykanie serwera…');
    io.close();
    manager.closeAll();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
