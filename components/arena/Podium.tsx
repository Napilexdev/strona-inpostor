'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export interface PodiumProps {
  x: number;
  z: number;
  /** Wysokość podwyższenia, na którym stoi postać (tylny rząd stoi wyżej). */
  height: number;
  rotY: number;
  color: string | null; // null = wolne miejsce
  active: boolean;
  ready: boolean;
  highlight: 'none' | 'danger' | 'ok';
  lowDetail?: boolean;
  onAnchor?: (o: THREE.Object3D | null) => void;
}

const FREE = new THREE.Color('#3b4675');
const ACCENT = new THREE.Color('#9b82ff');
const DANGER = new THREE.Color('#ff4d6d');
const OK = new THREE.Color('#3ddc97');

/** Wymiary mównicy (w jednostkach sceny). */
export const LECTERN = { width: 1.1, height: 0.8, depth: 0.42, offsetZ: 0.48 };

/**
 * Mównica: pulpit przed postacią (od strony widza) z podświetlonym frontem
 * w kolorze gracza. Przy dwóch rzędach tylny rząd stoi na podwyższeniu.
 */
export function Podium({ x, z, height, rotY, color, active, ready, highlight, lowDetail, onAnchor }: PodiumProps) {
  const group = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const stripMat = useRef<THREE.MeshStandardMaterial>(null!);
  const edgeMat = useRef<THREE.MeshStandardMaterial>(null!);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null!);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null!);
  const plusMat = useRef<THREE.MeshBasicMaterial>(null!);
  const born = useRef<number | null>(null);
  const placed = useRef(false);
  const riserH = useRef(height);
  const riser = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Color(), []);
  const smooth = lowDetail ? 2 : 4;

  useEffect(() => {
    onAnchor?.(group.current);
    return () => onAnchor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (born.current === null) born.current = t;
    const g = group.current;
    if (!placed.current) {
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      placed.current = true;
    } else {
      g.position.x = THREE.MathUtils.damp(g.position.x, x, 4, dt);
      g.position.z = THREE.MathUtils.damp(g.position.z, z, 4, dt);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, rotY, 4, dt);
    }
    // Pojawienie się: mównica wysuwa się z podłogi.
    const k = Math.min(1, (t - born.current) / 0.6);
    const grow = 1 - Math.pow(1 - k, 3);
    body.current.scale.y = Math.max(0.001, grow);
    riserH.current = THREE.MathUtils.damp(riserH.current, height, 4, dt);
    riser.current.scale.y = Math.max(0.001, (riserH.current / Math.max(height, 0.01)) * grow);
    body.current.position.y = riserH.current * grow;

    let intensity = color ? 1.1 : 0.35;
    if (highlight === 'danger') target.copy(DANGER);
    else if (highlight === 'ok') target.copy(OK);
    else if (active) target.copy(ACCENT);
    else if (color) target.set(color);
    else target.copy(FREE);
    if (active) intensity = 2.6 + Math.sin(t * 4) * 0.6;
    else if (highlight !== 'none') intensity = 2.4 + Math.sin(t * 6) * 0.5;
    else if (ready) intensity = 1.6;
    const lerpK = 1 - Math.exp(-dt * 6);
    for (const m of [stripMat.current, edgeMat.current]) {
      m.emissive.lerp(target, lerpK);
      m.color.copy(m.emissive);
    }
    stripMat.current.emissiveIntensity = THREE.MathUtils.damp(stripMat.current.emissiveIntensity, intensity, 6, dt);
    edgeMat.current.emissiveIntensity = stripMat.current.emissiveIntensity * 0.7;
    glowMat.current.color.copy(stripMat.current.emissive);
    glowMat.current.opacity = THREE.MathUtils.damp(glowMat.current.opacity, (active || highlight !== 'none' ? 0.5 : color ? 0.2 : 0.07) * grow, 5, dt);
    beamMat.current.opacity = THREE.MathUtils.damp(beamMat.current.opacity, active || highlight !== 'none' ? 0.08 : 0, 4, dt);
    beamMat.current.color.copy(stripMat.current.emissive);
    if (plusMat.current) plusMat.current.opacity = color ? 0 : 0.3 + Math.sin(t * 2 + x) * 0.12;
  });

  const { width: W, height: H, depth: D, offsetZ } = LECTERN;
  const hasRiser = height > 0.3;
  return (
    <group ref={group}>
      {/* podwyższenie (tylko tylny rząd) / niski cokół */}
      <mesh ref={riser} position={[0, 0, 0.1]} receiveShadow={!lowDetail} castShadow={!lowDetail}>
        <boxGeometry args={[hasRiser ? 1.9 : 1.6, Math.max(height, 0.01) * 2, hasRiser ? 1.6 : 1.3]} />
        <meshStandardMaterial color="#1b2244" emissive="#0a0f28" emissiveIntensity={0.6} roughness={0.5} metalness={0.15} />
      </mesh>

      <group ref={body}>
        <group position={[0, 0, offsetZ]}>
          {/* korpus mównicy — lekko zwężający się ku dołowi */}
          <RoundedBox args={[W, H, D]} radius={0.06} smoothness={smooth} position={[0, H / 2, 0]} castShadow={!lowDetail} receiveShadow={!lowDetail}>
            <meshStandardMaterial color="#232b52" emissive="#0c1230" emissiveIntensity={0.6} roughness={0.42} metalness={0.15} />
          </RoundedBox>
          {/* skośny blat */}
          <mesh position={[0, H + 0.04, -0.02]} rotation={[0.22, 0, 0]} castShadow={!lowDetail}>
            <boxGeometry args={[W + 0.14, 0.06, D + 0.16]} />
            <meshStandardMaterial color="#323d6e" roughness={0.35} metalness={0.2} />
          </mesh>
          {/* podświetlona krawędź blatu od strony widza */}
          <mesh position={[0, H + 0.02, D / 2 + 0.085]} rotation={[0.22, 0, 0]}>
            <boxGeometry args={[W + 0.14, 0.03, 0.03]} />
            <meshStandardMaterial ref={edgeMat} color="#3b4675" emissive="#3b4675" emissiveIntensity={0.4} toneMapped={false} />
          </mesh>
          {/* świecący pas na froncie */}
          <mesh position={[0, H * 0.62, D / 2 + 0.006]}>
            <planeGeometry args={[W * 0.78, 0.09]} />
            <meshStandardMaterial ref={stripMat} color="#3b4675" emissive="#3b4675" emissiveIntensity={0.4} toneMapped={false} />
          </mesh>
          {/* panel frontowy */}
          <mesh position={[0, H * 0.36, D / 2 + 0.004]}>
            <planeGeometry args={[W * 0.78, H * 0.36]} />
            <meshStandardMaterial color="#1a2146" roughness={0.6} />
          </mesh>
          {/* znak wolnego miejsca na froncie */}
          {!color && (
            <group position={[0, H * 0.36, D / 2 + 0.01]}>
              <mesh>
                <planeGeometry args={[0.26, 0.05]} />
                <meshBasicMaterial ref={plusMat} color="#8fa0e8" transparent opacity={0.3} depthWrite={false} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <planeGeometry args={[0.26, 0.05]} />
                <meshBasicMaterial color="#8fa0e8" transparent opacity={0.3} depthWrite={false} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* poświata na podłodze */}
      <mesh position={[0, 0.012, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.45, lowDetail ? 24 : 44]} />
        <meshBasicMaterial ref={glowMat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* snop światła nad aktywnym graczem */}
      <mesh position={[0, height + 3.4, -0.1]}>
        <cylinderGeometry args={[0.5, 0.9, 6.2, 32, 1, true]} />
        <meshBasicMaterial ref={beamMat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
