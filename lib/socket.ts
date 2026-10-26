'use client';

import { io, type Socket } from 'socket.io-client';
import type { Ack } from '@/shared/types';

let socket: Socket | null = null;

/** Jedno połączenie Socket.IO na kartę przeglądarki. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 10000,
    });
  }
  return socket;
}

/** Wysyła zdarzenie i czeka na potwierdzenie serwera. */
export async function request<T = undefined>(event: string, payload: unknown = {}): Promise<Ack<T>> {
  const s = getSocket();
  if (!s.connected) {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        s.off('connect', ok);
        reject(new Error('timeout'));
      }, 8000);
      const ok = () => {
        clearTimeout(t);
        resolve();
      };
      s.once('connect', ok);
    }).catch(() => undefined);
    if (!s.connected) return { ok: false, error: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.' };
  }
  try {
    return (await s.timeout(8000).emitWithAck(event, payload)) as Ack<T>;
  } catch {
    return { ok: false, error: 'Serwer nie odpowiada. Spróbuj ponownie.' };
  }
}
