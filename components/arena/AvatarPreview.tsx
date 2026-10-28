'use client';

import { useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { PLAYER_COLORS, playerColor } from '@/shared/constants';
import { Character } from './Character';

function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    g.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.8) * 0.55;
  });
  return <group ref={g}>{children}</group>;
}

/** Odświeża podgląd ~30 razy na sekundę zamiast 60 — wystarczy i oszczędza procesor. */
function Limiter() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(() => invalidate(), 33);
    return () => clearInterval(id);
  }, [invalidate]);
  return null;
}

/** Mały podgląd 3D postaci w kreatorze wyglądu. */
export default function AvatarPreview({ colorIndex, skin, hat, face, shirt, eyes, beard }: { colorIndex: number; skin?: string | null; hat: number; face: number; shirt: number; eyes: number; beard: number }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 30, position: [0, 1.25, 4.2] }} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 1.05, 0)}>
      <Limiter />
      <hemisphereLight args={['#b8c4ff', '#141a33', 0.9]} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#7c5cff" />
      <Spin>
        <Character
          color={playerColor({ colorIndex, skin })}
          target={[0, 0, 0]}
          rotY={0}
          mood="idle"
          dimmed={false}
          hat={hat}
          face={face}
          eyes={eyes}
          beard={beard}
          shirt={shirt}
          seed={3}
          lowDetail
        />
      </Spin>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color={playerColor({ colorIndex, skin })} transparent opacity={0.18} />
      </mesh>
    </Canvas>
  );
}
