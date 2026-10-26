import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { createGameServer } from './socket';

const dev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
if (!dev) (process.env as Record<string, string>).NODE_ENV = 'production';
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: manager.rooms.size }));
      return;
    }
    handle(req, res, parse(req.url ?? '/', true));
  });

  const { manager, io } = createGameServer(httpServer, { corsOrigin: corsOrigin?.length ? corsOrigin : undefined });

  httpServer.listen(port, hostname, () => {
    console.log(`▶ IMPOSTOR działa na http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port} (${dev ? 'dev' : 'production'})`);
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
