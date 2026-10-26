'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Appearance, JoinResult, RoomStatePayload } from '@/shared/types';
import { getSocket, request } from './socket';
import { adoptRemembered, clearSession, loadRemembered, loadSession, saveSession, type StoredSession } from './session';

export type RoomStatus = 'connecting' | 'need-join' | 'in-room' | 'kicked' | 'replaced' | 'closed';
export type ConnStatus = 'connected' | 'reconnecting' | 'offline';

export function useRoomConnection(code: string) {
  const [payload, setPayload] = useState<RoomStatePayload | null>(null);
  const [status, setStatus] = useState<RoomStatus>('connecting');
  const [conn, setConn] = useState<ConnStatus>('reconnecting');
  const [message, setMessage] = useState<string | null>(null);
  /** Zapamiętana sesja z tej przeglądarki (np. po zamknięciu karty) — do przycisku „Wróć do gry”. */
  const [remembered, setRemembered] = useState<StoredSession | null>(null);
  const offset = useRef(0);
  const replaced = useRef(false);
  const left = useRef(false);

  const tryReconnect = useCallback(async () => {
    if (replaced.current || left.current) return;
    const sess = loadSession(code);
    if (!sess) {
      setRemembered(loadRemembered(code));
      setStatus((s) => (s === 'kicked' ? s : 'need-join'));
      return;
    }
    const r = await request<JoinResult>('player:reconnect', { code, token: sess.token });
    if (!r.ok) {
      clearSession(code);
      setRemembered(null);
      setPayload(null);
      if (/nie istnieje|zamknięty/.test(r.error)) {
        setStatus('closed');
        setMessage('Ten pokój nie istnieje lub został już zamknięty.');
      } else {
        setStatus('need-join');
        setMessage(r.error);
      }
    }
  }, [code]);

  useEffect(() => {
    const s = getSocket();
    const onState = (p: RoomStatePayload) => {
      if (p.room.code !== code) return;
      offset.current = p.room.serverNow - Date.now();
      setPayload(p);
      setStatus('in-room');
    };
    const onConnect = () => {
      setConn('connected');
      void tryReconnect();
    };
    const onDisconnect = () => setConn('reconnecting');
    const onFail = () => setConn('offline');
    const onKicked = (e: { message: string }) => {
      clearSession(code);
      setPayload(null);
      setStatus('kicked');
      setMessage(e.message);
    };
    const onReplaced = (e: { message: string }) => {
      replaced.current = true;
      setStatus('replaced');
      setMessage(e.message);
    };
    s.on('room:state', onState);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.io.on('reconnect_failed', onFail);
    s.on('connect_error', onDisconnect);
    s.on('lobby:kicked', onKicked);
    s.on('session:replaced', onReplaced);
    // Telefon wraca z tła — połącz od razu, bez czekania na kolejną próbę.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !s.connected) s.connect();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    if (s.connected) onConnect();
    else if (!s.active) s.connect();
    return () => {
      s.off('room:state', onState);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.io.off('reconnect_failed', onFail);
      s.off('connect_error', onDisconnect);
      s.off('lobby:kicked', onKicked);
      s.off('session:replaced', onReplaced);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [code, tryReconnect]);

  const join = useCallback(
    async (nickname: string, appearance?: Appearance) => {
      const r = await request<JoinResult>('lobby:join', { code, nickname, appearance });
      if (r.ok) {
        saveSession({ ...r.data, nickname });
        setMessage(null);
      }
      return r;
    },
    [code],
  );

  const reclaim = useCallback(async () => {
    replaced.current = false;
    setStatus('connecting');
    await tryReconnect();
  }, [tryReconnect]);

  /** Powrót do gry na podstawie sesji zapamiętanej w tej przeglądarce. */
  const rejoin = useCallback(async () => {
    if (!adoptRemembered(code)) return;
    replaced.current = false;
    setStatus('connecting');
    await tryReconnect();
  }, [code, tryReconnect]);

  const leave = useCallback(async () => {
    left.current = true;
    await request('lobby:leave');
    clearSession(code);
  }, [code]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);

  return { payload, status, conn, message, join, leave, reclaim, rejoin, remembered, serverNow };
}
