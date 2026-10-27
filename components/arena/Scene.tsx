'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { computeCameraFrame, computePodiumLayout } from '@/shared/layout';
import { Character } from './Character';
import { TagProjector, type TagStore } from './NameTag';
import { Podium } from './Podium';
import { Studio } from './Studio';
import type { ArenaProps, Mood } from './types';

const CHAR_TAG_Y = 2.12;

function CameraRig({ count }: { count: number }) {
  const { camera, size } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 1.5, 0));
  const first = useRef(true);
  const layout = computePodiumLayout(count);
  const frame = useMemo(() => computeCameraFrame(layout, size.width / Math.max(1, size.height)), [layout, size.width, size.height]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const [px, py, pz] = frame.position;
    const [tx, ty, tz] = frame.target;
    // Delikatny ruch kamery, bez gwałtownych skoków.
    const drift = Math.sin(state.clock.elapsedTime * 0.15) * 0.25;
    if (first.current) {
      camera.position.set(px, py + 1.5, pz + 3);
      first.current = false;
    }
    const k = 1 - Math.exp(-dt * 2.2);
    tmp.set(px + drift, py, pz);
    camera.position.lerp(tmp, k);
    tmp.set(tx, ty, tz);
    lookAt.current.lerp(tmp, k);
    camera.lookAt(lookAt.current);
  });
  return null;
}

function Floor({ low }: { low: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!low}>
      <circleGeometry args={[60, 48]} />
      <meshStandardMaterial color="#0a0d1d" roughness={0.55} metalness={0.25} />
    </mesh>
  );
}

function ActiveSpot({ target }: { target: [number, number, number] | null }) {
  const light = useRef<THREE.SpotLight>(null!);
  const obj = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const l = light.current;
    if (!l) return;
    const want = target ? 26 : 0;
    l.intensity = THREE.MathUtils.damp(l.intensity, want, 5, dt);
    if (target) {
      obj.position.x = THREE.MathUtils.damp(obj.position.x, target[0], 6, dt);
      obj.position.y = target[1];
      obj.position.z = THREE.MathUtils.damp(obj.position.z, target[2], 6, dt);
      l.position.set(obj.position.x, target[1] + 7, obj.position.z + 1.5);
    }
  });
  return (
    <>
      <primitive object={obj} />
      <spotLight ref={light} target={obj} angle={0.32} penumbra={0.75} intensity={0} distance={16} decay={1.2} color="#d8ceff" />
    </>
  );
}

/** Cienie przeliczane co drugą klatkę — wystarczy przy spokojnych animacjach. */
function ShadowThrottle() {
  const frame = useRef(0);
  useFrame(({ gl }) => {
    gl.shadowMap.autoUpdate = false;
    if (frame.current++ % 2 === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

function moodFor(id: string, p: ArenaProps): Mood {
  if (p.phase === 'ended' && p.winners) return p.winners.has(id) ? 'win' : 'lose';
  if (p.phase === 'reveal' && p.reveal) {
    if (p.reveal.playerId === id) return p.reveal.role === 'impostor' ? 'caught' : 'innocent';
    return 'surprised';
  }
  const pl = p.players.find((x) => x.id === id);
  if (pl?.eliminated && p.phase !== 'ended') return 'eliminated';
  if (p.phase === 'clues' && p.activeId === id) return 'active';
  return 'idle';
}

export function Scene(props: ArenaProps & { revealedImpostors: Set<string>; tags: TagStore }) {
  const { maxPlayers, players, phase, activeId, reveal, showReady, quality = 'high', revealedImpostors, tags } = props;
  const low = quality === 'low';
  const layout = computePodiumLayout(maxPlayers);
  const bySeat = new Map(players.map((p) => [p.seat, p]));
  const activeSlot = activeId ? layout.slots[players.find((p) => p.id === activeId)?.seat ?? -1] : undefined;

  return (
    <>
      <color attach="background" args={['#070a14']} />
      <fog attach="fog" args={['#070a14', 28, 70]} />
      <hemisphereLight args={['#93a4ff', '#0a0f1f', 0.55]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[5, 13, 9]}
        intensity={1.55}
        color="#fff4ea"
        castShadow={!low}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-radius={4}
      />
      <directionalLight position={[-7, 6, -10]} intensity={0.9} color="#7c5cff" />
      {!low && <pointLight position={[0, 5, 6]} intensity={6} distance={20} color="#ff4d6d" decay={1.6} />}
      {!low && <ActiveSpot target={phase === 'clues' && activeSlot ? [activeSlot.x, activeSlot.height, activeSlot.z] : null} />}

      <Floor low={low} />
      <Studio layout={layout} phase={phase} low={low} />

      {layout.slots.map((slot) => {
        const occ = bySeat.get(slot.seat);
        const isRevealed = !!occ && (revealedImpostors.has(occ.id) || (phase === 'reveal' && reveal?.playerId === occ.id));
        const highlight: 'none' | 'danger' | 'ok' =
          occ && phase === 'reveal' && reveal?.playerId === occ.id
            ? reveal.role === 'impostor'
              ? 'danger'
              : 'ok'
            : occ && phase === 'ended' && isRevealed
              ? 'danger'
              : 'none';
        return (
          <Podium
            key={`seat-${slot.seat}`}
            x={slot.x}
            z={slot.z}
            height={slot.height}
            rotY={slot.rotY}
            color={occ?.color ?? null}
            score={occ ? occ.score : null}
            active={phase === 'clues' && !!occ && occ.id === activeId}
            ready={showReady && !!occ?.ready}
            highlight={highlight}
            lowDetail={low}
            onAnchor={(o) => tags.setAnchor(`seat-${slot.seat}`, o, slot.height + 1.3)}
          />
        );
      })}

      {players.map((p) => {
        const slot = layout.slots[p.seat];
        if (!slot) return null;
        return (
          <Character
            key={p.id}
            color={p.color}
            target={[slot.x - Math.sin(slot.rotY) * 0.18, slot.height, slot.z - Math.cos(slot.rotY) * 0.18]}
            rotY={slot.rotY}
            mood={moodFor(p.id, props)}
            dimmed={p.eliminated || !p.connected}
            hat={p.hat}
            face={p.face}
            eyes={p.eyes}
            beard={p.beard}
            shirt={p.shirt}
            emote={p.emote ?? null}
            lowDetail={low}
            seed={p.seat + 1}
            onAnchor={(o) => tags.setAnchor(p.id, o, CHAR_TAG_Y)}
          />
        );
      })}
      {!low && <ShadowThrottle />}
      <CameraRig count={maxPlayers} />
      <TagProjector store={tags} />
    </>
  );
}
