'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mood } from './types';
import { Face, Hat, ShirtExtras, makeShirtTexture, sleeveColor, useTorsoGeometry } from './Outfit';

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeOutBounce = (x: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};
const damp = (cur: number, target: number, lambda: number, dt: number) => THREE.MathUtils.damp(cur, target, lambda, dt);

export interface CharacterProps {
  color: string;
  /** Docelowa pozycja (miejsce za mównicą). */
  target: [number, number, number];
  rotY: number;
  mood: Mood;
  dimmed: boolean;
  hat: number;
  face: number;
  shirt: number;
  lowDetail?: boolean;
  seed: number;
  children?: React.ReactNode;
  onAnchor?: (o: THREE.Object3D | null) => void;
}

/** Postać 3D zbudowana z prostych brył (styl low-poly). */
export function Character({ color, target, rotY, mood, dimmed, hat, face, shirt, lowDetail, seed, children, onAnchor }: CharacterProps) {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const spawnAt = useRef<number | null>(null);
  const moodAt = useRef<number | null>(null);
  const placed = useRef(false);
  const baseY = useRef<number | null>(null);
  const anchor = useRef<THREE.Group>(null!);

  useEffect(() => {
    onAnchor?.(anchor.current);
    return () => onAnchor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    moodAt.current = null; // zostanie ustawione w następnej klatce
  }, [mood]);

  const seg = lowDetail ? { cap: 3, rad: 7, sw: 10, sh: 8 } : { cap: 4, rad: 9, sw: 14, sh: 11 };

  const materials = useMemo(() => {
    const base = new THREE.Color(color);
    if (dimmed) base.lerp(new THREE.Color('#4a5068'), 0.65);
    const dark = base.clone().multiplyScalar(0.62);
    const mk = (c: THREE.Color) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05, flatShading: true, transparent: dimmed, opacity: dimmed ? 0.72 : 1 });
    return {
      body: mk(base),
      limb: mk(dark),
      white: new THREE.MeshStandardMaterial({ color: '#f6f7ff', roughness: 0.3 }),
      pupil: new THREE.MeshStandardMaterial({ color: '#141826', roughness: 0.4 }),
      accent: new THREE.MeshStandardMaterial({ color: base.clone().offsetHSL(0.08, 0, 0.12), roughness: 0.4, flatShading: true }),
    };
  }, [color, dimmed]);

  // Koszulka: tekstura na tułowiu + kolor rękawów.
  const outfit = useMemo(() => {
    const tex = makeShirtTexture(shirt, color);
    const torso = tex
      ? new THREE.MeshStandardMaterial({ map: tex, color: dimmed ? '#8a8fa6' : '#ffffff', roughness: 0.6, flatShading: true, transparent: dimmed, opacity: dimmed ? 0.72 : 1 })
      : materials.body;
    const sc = sleeveColor(shirt, color);
    const sleeve = sc
      ? new THREE.MeshStandardMaterial({ color: dimmed ? new THREE.Color(sc).lerp(new THREE.Color('#4a5068'), 0.65) : sc, roughness: 0.6, flatShading: true, transparent: dimmed, opacity: dimmed ? 0.72 : 1 })
      : materials.limb;
    return { tex, torso, sleeve, owned: [tex ? torso : null, sc ? sleeve : null] };
  }, [shirt, color, dimmed, materials]);
  useEffect(
    () => () => {
      outfit.tex?.dispose();
      outfit.owned.forEach((m) => m?.dispose());
    },
    [outfit],
  );
  const torsoGeo = useTorsoGeometry(0.32, 0.32, 4, lowDetail ? 12 : 16);

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (spawnAt.current === null) spawnAt.current = t;
    if (moodAt.current === null) moodAt.current = t;
    const ph = seed * 1.7;
    const sinceSpawn = t - spawnAt.current;
    const sinceMood = t - moodAt.current;
    const g = root.current;

    // Płynne przejście do (nowego) podestu.
    if (!placed.current) {
      g.position.set(target[0], target[1], target[2]);
      placed.current = true;
    } else {
      g.position.x = damp(g.position.x, target[0], 4, dt);
      g.position.z = damp(g.position.z, target[2], 4, dt);
    }
    g.rotation.y = damp(g.rotation.y, rotY, 4, dt);

    // Animacja wejścia: opadnięcie z góry z odbiciem.
    let yOff = 0;
    let s = 1;
    if (sinceSpawn < 0.9) {
      const k = sinceSpawn / 0.9;
      yOff = 2.6 * (1 - easeOutBounce(k));
      s = 0.55 + 0.45 * easeOutBack(Math.min(1, k * 1.4));
    }

    // Domyślna poza bezczynności.
    const breathe = Math.sin(t * 2.1 + ph);
    let bodyY = breathe * 0.018;
    let bodyRotX = 0;
    let bodyRotZ = Math.sin(t * 0.9 + ph) * 0.025;
    let headRotX = Math.sin(t * 1.3 + ph) * 0.04;
    let headRotZ = Math.sin(t * 0.7 + ph * 2) * 0.05;
    let armLz = -0.12 - breathe * 0.04;
    let armRz = 0.12 + breathe * 0.04;
    let armLx = 0;
    let armRx = 0;
    let shakeX = 0;

    switch (mood) {
      case 'active': {
        if (sinceMood < 0.55) yOff += Math.sin((Math.PI * sinceMood) / 0.55) * 0.42; // podskok na start tury
        armRz = 2.45 + Math.sin(t * 6.5) * 0.32; // machanie
        bodyRotX = 0.07;
        headRotX = -0.08 + Math.sin(t * 3) * 0.04;
        bodyY += Math.abs(Math.sin(t * 3.2)) * 0.03;
        break;
      }
      case 'caught': {
        if (sinceMood < 0.8) shakeX = Math.sin(sinceMood * 55) * 0.06 * (1 - sinceMood / 0.8);
        const k = Math.min(1, sinceMood / 0.8);
        armLz = -2.7 * k;
        armRz = 2.7 * k;
        bodyRotX = -0.22 * k;
        headRotX = -0.25 * k;
        if (sinceMood < 0.4) yOff += Math.sin((Math.PI * sinceMood) / 0.4) * 0.3;
        break;
      }
      case 'innocent':
      case 'lose': {
        const k = Math.min(1, sinceMood / 0.6);
        headRotX = 0.38 * k + Math.sin(t * 1.2 + ph) * 0.02;
        headRotZ = Math.sin(t * 1.8) * 0.12 * k;
        armLz = -0.05;
        armRz = 0.05;
        bodyRotX = 0.12 * k;
        bodyY -= 0.05 * k;
        break;
      }
      case 'surprised': {
        if (sinceMood < 0.45) yOff += Math.sin((Math.PI * sinceMood) / 0.45) * 0.22;
        armLz = -0.7;
        armRz = 0.7;
        break;
      }
      case 'win': {
        const hop = Math.abs(Math.sin(t * 4 + ph));
        yOff += hop * 0.3;
        armLz = -2.6 + Math.sin(t * 8) * 0.25;
        armRz = 2.6 - Math.sin(t * 8) * 0.25;
        headRotX = -0.15;
        break;
      }
      case 'eliminated': {
        headRotX = 0.45;
        bodyRotX = 0.18;
        bodyY -= 0.1;
        armLz = 0;
        armRz = 0;
        armLx = 0.3;
        armRx = 0.3;
        break;
      }
      default:
        break;
    }

    baseY.current = baseY.current === null ? target[1] : damp(baseY.current, target[1], 4, dt);
    g.position.y = baseY.current + yOff;
    anchor.current.position.set(g.position.x, baseY.current, g.position.z);
    g.scale.setScalar(s);
    body.current.position.y = damp(body.current.position.y, bodyY, 10, dt);
    body.current.position.x = shakeX;
    body.current.rotation.x = damp(body.current.rotation.x, bodyRotX, 8, dt);
    body.current.rotation.z = damp(body.current.rotation.z, bodyRotZ, 8, dt);
    head.current.rotation.x = damp(head.current.rotation.x, headRotX, 8, dt);
    head.current.rotation.z = damp(head.current.rotation.z, headRotZ, 8, dt);
    armL.current.rotation.z = damp(armL.current.rotation.z, armLz, 10, dt);
    armR.current.rotation.z = damp(armR.current.rotation.z, armRz, 10, dt);
    armL.current.rotation.x = damp(armL.current.rotation.x, armLx, 8, dt);
    armR.current.rotation.x = damp(armR.current.rotation.x, armRx, 8, dt);
  });

  const shadow = !lowDetail;
  return (
    <>
    <group ref={anchor} />
    <group ref={root}>
      <group ref={body}>
        {/* nogi */}
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.27, 0]} material={materials.limb} castShadow={shadow}>
            <capsuleGeometry args={[0.12, 0.28, seg.cap, seg.rad]} />
          </mesh>
        ))}
        {/* korpus */}
        {/* tułów obrócony o 180°, żeby szew tekstury był z tyłu */}
        <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI, 0]} geometry={torsoGeo} material={outfit.torso} castShadow={shadow} />
        <ShirtExtras kind={shirt} accent={outfit.sleeve === materials.limb ? materials.accent : outfit.sleeve} />
        {/* ręce */}
        <group ref={armL} position={[-0.37, 1.2, 0]}>
          <mesh position={[0, -0.25, 0]} material={outfit.sleeve} castShadow={shadow}>
            <capsuleGeometry args={[0.085, 0.32, seg.cap, seg.rad]} />
          </mesh>
        </group>
        <group ref={armR} position={[0.37, 1.2, 0]}>
          <mesh position={[0, -0.25, 0]} material={outfit.sleeve} castShadow={shadow}>
            <capsuleGeometry args={[0.085, 0.32, seg.cap, seg.rad]} />
          </mesh>
        </group>
        {/* głowa */}
        <group ref={head} position={[0, 1.62, 0]}>
          <mesh material={materials.body} castShadow={shadow}>
            <sphereGeometry args={[0.34, seg.sw, seg.sh]} />
          </mesh>
          {[-0.12, 0.12].map((x) => (
            <group key={x} position={[x, 0.04, 0.27]}>
              <mesh material={materials.white}>
                <sphereGeometry args={[0.085, 10, 8]} />
              </mesh>
              <mesh position={[0, -0.005, 0.06]} material={materials.pupil}>
                <sphereGeometry args={[0.042, 8, 6]} />
              </mesh>
            </group>
          ))}
          <Face kind={face} />
          <Hat kind={hat} accent={materials.accent} />
        </group>
      </group>
      {children}
    </group>
    </>
  );
}

