'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface PodiumProps {
  x: number;
  z: number;
  height: number;
  color: string | null; // null = wolne miejsce
  active: boolean;
  ready: boolean;
  highlight: 'none' | 'danger' | 'ok';
  lowDetail?: boolean;
  children?: React.ReactNode;
  onAnchor?: (o: THREE.Object3D | null) => void;
}

const FREE_RING = new THREE.Color('#3b4675');
const ACCENT = new THREE.Color('#9b82ff');
const DANGER = new THREE.Color('#ff4d6d');
const OK = new THREE.Color('#3ddc97');

/** Pojedynczy podest: ciemna kolumna z podświetloną krawędzią. */
export function Podium({ x, z, height, color, active, ready, highlight, lowDetail, children, onAnchor }: PodiumProps) {
  const group = useRef<THREE.Group>(null!);
  const column = useRef<THREE.Group>(null!);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null!);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null!);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null!);
  const plusMat = useRef<THREE.MeshBasicMaterial>(null!);
  const born = useRef<number | null>(null);
  const placed = useRef(false);
  const curHeight = useRef(height);

  const segs = lowDetail ? 24 : 44;
  const target = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!placed.current) curHeight.current = height;
  }, [height]);
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
      placed.current = true;
    } else {
      g.position.x = THREE.MathUtils.damp(g.position.x, x, 4, dt);
      g.position.z = THREE.MathUtils.damp(g.position.z, z, 4, dt);
    }
    curHeight.current = THREE.MathUtils.damp(curHeight.current, height, 4, dt);
    // Pojawienie się: podest wyrasta z podłoża.
    const k = Math.min(1, (t - born.current) / 0.6);
    const grow = 1 - Math.pow(1 - k, 3);
    column.current.scale.y = Math.max(0.001, grow * (curHeight.current / height));
    column.current.scale.x = column.current.scale.z = 0.85 + 0.15 * grow;

    // Kolor i intensywność krawędzi.
    let intensity = color ? 0.9 : 0.35;
    if (highlight === 'danger') target.copy(DANGER);
    else if (highlight === 'ok') target.copy(OK);
    else if (active) target.copy(ACCENT);
    else if (color) target.set(color);
    else target.copy(FREE_RING);
    if (active) intensity = 2.4 + Math.sin(t * 4) * 0.6;
    else if (highlight !== 'none') intensity = 2.2 + Math.sin(t * 6) * 0.5;
    else if (ready) intensity = 1.5;
    ringMat.current.emissive.lerp(target, 1 - Math.exp(-dt * 6));
    ringMat.current.color.copy(ringMat.current.emissive);
    ringMat.current.emissiveIntensity = THREE.MathUtils.damp(ringMat.current.emissiveIntensity, intensity, 6, dt);
    glowMat.current.color.copy(ringMat.current.emissive);
    glowMat.current.opacity = THREE.MathUtils.damp(glowMat.current.opacity, (active || highlight !== 'none' ? 0.55 : color ? 0.22 : 0.08) * grow, 5, dt);
    beamMat.current.opacity = THREE.MathUtils.damp(beamMat.current.opacity, active || highlight !== 'none' ? 0.09 : 0, 4, dt);
    beamMat.current.color.copy(ringMat.current.emissive);
    if (plusMat.current) plusMat.current.opacity = color ? 0 : 0.25 + Math.sin(t * 2 + x) * 0.12;
  });

  return (
    <group ref={group}>
      <group ref={column}>
        <mesh position={[0, height / 2, 0]} castShadow={!lowDetail} receiveShadow={!lowDetail}>
          <cylinderGeometry args={[0.72, 0.8, height, segs]} />
          <meshStandardMaterial color="#232b52" emissive="#0c1230" emissiveIntensity={0.6} roughness={0.42} metalness={0.15} />
        </mesh>
        <mesh position={[0, height + 0.025, 0]} receiveShadow={!lowDetail}>
          <cylinderGeometry args={[0.735, 0.735, 0.05, segs]} />
          <meshStandardMaterial color="#323d6e" roughness={0.35} metalness={0.15} />
        </mesh>
        <mesh position={[0, height + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.735, 0.026, 8, segs + 12]} />
          <meshStandardMaterial ref={ringMat} color="#3b4675" emissive="#3b4675" emissiveIntensity={0.4} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.014, 6, segs + 12]} />
          <meshBasicMaterial color="#5b6bb5" transparent opacity={0.35} />
        </mesh>
        {/* znak wolnego miejsca */}
        {!color && (
          <group position={[0, height + 0.07, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.42, 0.07]} />
              <meshBasicMaterial ref={plusMat} color="#8fa0e8" transparent opacity={0.3} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
              <planeGeometry args={[0.42, 0.07]} />
              <meshBasicMaterial color="#8fa0e8" transparent opacity={0.3} depthWrite={false} />
            </mesh>
          </group>
        )}
      </group>
      {/* poświata na podłodze */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.35, segs]} />
        <meshBasicMaterial ref={glowMat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* snop światła nad aktywnym podestem */}
      <mesh position={[0, height + 3.2, 0]}>
        <cylinderGeometry args={[0.55, 0.85, 6.2, 32, 1, true]} />
        <meshBasicMaterial ref={beamMat} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {children}
    </group>
  );
}
