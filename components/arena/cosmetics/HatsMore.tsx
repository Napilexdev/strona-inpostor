'use client';

/**
 * Dodatkowe nakrycia głowy i fryzury (indeksy 26–75 w `HATS`).
 * Głowa: kula o promieniu 0.34 ze środkiem w (0,0,0), przód = +Z.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { X, col } from './mats';

const HAIR = col('#3b2416');
const HAIR_BLACK = col('#16131a');
const HAIR_BLOND = col('#e8c25a');
const HAIR_PINK = col('#ff6ab8');
const HAIR_BLUE = col('#4dabf7');

/** Czasza na czubku głowy (np. włosy, czapka). `cut` = jak nisko schodzi (0..1 półkuli). */
function Cap({ mat, r = 0.355, cut = 0.5, sy = 1, y = 0, segs = 18 }: { mat: THREE.Material; r?: number; cut?: number; sy?: number; y?: number; segs?: number }) {
  return (
    <mesh position={[0, y, 0]} scale={[1, sy, 1]} material={mat}>
      <sphereGeometry args={[r, segs, 10, 0, Math.PI * 2, 0, Math.PI * cut]} />
    </mesh>
  );
}

function Brim({ r, mat, y = 0, h = 0.025, sz = 1 }: { r: number; mat: THREE.Material; y?: number; h?: number; sz?: number }) {
  return (
    <mesh position={[0, y, 0]} scale={[1, 1, sz]} material={mat}>
      <cylinderGeometry args={[r, r, h, 24]} />
    </mesh>
  );
}

function Neon67() {
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.font = '800 110px "Space Grotesk Variable", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ff4d9d';
    g.shadowBlur = 18;
    g.fillStyle = '#ffffff';
    g.fillText('67', 128, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.62 + Math.sin(clock.elapsedTime * 2.2) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 0.62, 0]}>
      <mesh>
        <planeGeometry args={[0.5, 0.25]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RainCloud() {
  const drops = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    drops.current?.children.forEach((d, i) => {
      d.position.y = -0.08 - (((clock.elapsedTime * 0.9 + i * 0.27) % 1) * 0.3);
    });
  });
  return (
    <group position={[0, 0.72, 0]}>
      {[
        [0, 0, 0, 0.13],
        [-0.13, -0.02, 0, 0.1],
        [0.13, -0.02, 0, 0.1],
        [0.06, 0.07, 0, 0.1],
        [-0.06, 0.06, 0.02, 0.09],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={X.lightGrey}>
          <sphereGeometry args={[r, 12, 10]} />
        </mesh>
      ))}
      <group ref={drops}>
        {[-0.12, -0.04, 0.04, 0.12].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.02]} material={X.sweat}>
            <sphereGeometry args={[0.018, 6, 5]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SharkFin() {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.17, 0);
    sh.quadraticCurveTo(-0.02, 0.12, 0.1, 0.36);
    sh.quadraticCurveTo(0.08, 0.15, 0.15, 0);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -0.02);
    return g;
  }, []);
  return <mesh geometry={geo} position={[0, 0.3, -0.02]} rotation={[0, -Math.PI / 2 + 0.7, 0]} material={X.grey} />;
}

function Antler({ side }: { side: number }) {
  const m = X.tan;
  return (
    <group position={[side * 0.16, 0.28, -0.02]} rotation={[0, 0, -side * 0.35]}>
      <mesh position={[0, 0.14, 0]} material={m}>
        <cylinderGeometry args={[0.022, 0.03, 0.28, 6]} />
      </mesh>
      {[0.08, 0.17].map((y, i) => (
        <mesh key={y} position={[side * 0.05, y, 0]} rotation={[0, 0, -side * (0.9 + i * 0.2)]} material={m}>
          <cylinderGeometry args={[0.015, 0.02, 0.13, 5]} />
        </mesh>
      ))}
      <mesh position={[-side * 0.04, 0.24, 0]} rotation={[0, 0, side * 0.6]} material={m}>
        <cylinderGeometry args={[0.014, 0.018, 0.12, 5]} />
      </mesh>
    </group>
  );
}

export function HatMore({ kind, accent }: { kind: number; accent: THREE.Material }) {
  switch (kind) {
    case 26: // czapka tyłem
      return (
        <group position={[0, 0.1, 0]} rotation={[0, Math.PI, 0]}>
          <Cap mat={accent} sy={0.72} />
          <mesh position={[0, 0.02, 0.32]} rotation={[0.18, 0, 0]} material={accent}>
            <boxGeometry args={[0.42, 0.025, 0.26]} />
          </mesh>
          <mesh position={[0, 0.12, -0.33]} material={X.white}>
            <boxGeometry args={[0.12, 0.04, 0.02]} />
          </mesh>
        </group>
      );
    case 27: // snapback
      return (
        <group position={[0, 0.1, 0]}>
          <Cap mat={X.black} sy={0.75} />
          <mesh position={[0, 0.03, 0.36]} material={X.black}>
            <boxGeometry args={[0.44, 0.03, 0.3]} />
          </mesh>
          <mesh position={[0, 0.045, 0.36]} material={accent}>
            <boxGeometry args={[0.44, 0.005, 0.3]} />
          </mesh>
          <mesh position={[0, 0.17, 0.3]} rotation={[-0.5, 0, 0]} material={X.gold}>
            <boxGeometry args={[0.14, 0.06, 0.01]} />
          </mesh>
        </group>
      );
    case 28: // kapelusz bucket
      return (
        <group position={[0, 0.18, 0]}>
          <mesh position={[0, 0.06, 0]} material={accent}>
            <cylinderGeometry args={[0.27, 0.33, 0.22, 20, 1, true]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} material={accent}>
            <cylinderGeometry args={[0.27, 0.27, 0.02, 20]} />
          </mesh>
          <mesh position={[0, -0.04, 0]} rotation={[0, 0, 0]} material={accent}>
            <cylinderGeometry args={[0.33, 0.46, 0.06, 22, 1, true]} />
          </mesh>
        </group>
      );
    case 29: // beanie
      return (
        <group position={[0, 0.05, 0]}>
          <Cap mat={accent} r={0.36} sy={1.08} cut={0.5} />
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={accent}>
            <torusGeometry args={[0.355, 0.05, 8, 24]} />
          </mesh>
        </group>
      );
    case 30: // uszanka
      return (
        <group position={[0, 0.08, 0]}>
          <Cap mat={X.brown} r={0.365} sy={0.9} />
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={X.cream}>
            <torusGeometry args={[0.36, 0.07, 8, 24]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.34, -0.15, 0.02]} scale={[0.45, 1, 0.9]} material={X.cream}>
              <sphereGeometry args={[0.14, 10, 8]} />
            </mesh>
          ))}
        </group>
      );
    case 31: // bandana
      return (
        <group position={[0, 0.12, 0]}>
          <Cap mat={X.red} r={0.36} sy={0.85} cut={0.42} />
          <mesh position={[0, 0.02, -0.36]} rotation={[0.3, 0, 0]} material={X.red}>
            <coneGeometry args={[0.07, 0.14, 4]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.06, -0.08, -0.37]} rotation={[0.3, 0, s * 0.6]} material={X.red}>
              <boxGeometry args={[0.05, 0.14, 0.01]} />
            </mesh>
          ))}
        </group>
      );
    case 32: // turban
      return (
        <group position={[0, 0.2, 0]}>
          {[0, 0.07, 0.13].map((y, i) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, i * 0.4]} scale={[1 - i * 0.12, 1 - i * 0.12, 1]} material={X.white}>
              <torusGeometry args={[0.3, 0.08, 8, 22]} />
            </mesh>
          ))}
          <Cap mat={X.white} r={0.28} sy={0.7} y={0.05} />
          <mesh position={[0, 0.08, 0.36]} material={X.red}>
            <sphereGeometry args={[0.04, 8, 6]} />
          </mesh>
        </group>
      );
    case 33: // sombrero
      return (
        <group position={[0, 0.27, 0]}>
          <Brim r={0.75} mat={X.tan} />
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={X.red}>
            <torusGeometry args={[0.74, 0.03, 6, 32]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} material={X.tan}>
            <coneGeometry args={[0.25, 0.4, 16]} />
          </mesh>
          <mesh position={[0, 0.07, 0]} material={X.red}>
            <cylinderGeometry args={[0.21, 0.23, 0.05, 16]} />
          </mesh>
        </group>
      );
    case 34: // fedora
      return (
        <group position={[0, 0.25, 0]} rotation={[-0.08, 0, 0.05]}>
          <Brim r={0.42} mat={X.grey} sz={0.92} />
          <mesh position={[0, 0.12, 0]} scale={[1, 1, 0.85]} material={X.grey}>
            <cylinderGeometry args={[0.2, 0.25, 0.22, 16]} />
          </mesh>
          <mesh position={[0, 0.04, 0]} scale={[1, 1, 0.85]} material={X.black}>
            <cylinderGeometry args={[0.252, 0.252, 0.05, 16]} />
          </mesh>
          <mesh position={[0, 0.235, 0]} scale={[1, 0.3, 0.85]} material={X.grey}>
            <sphereGeometry args={[0.2, 14, 8]} />
          </mesh>
        </group>
      );
    case 35: // melonik
      return (
        <group position={[0, 0.25, 0]}>
          <Brim r={0.34} mat={X.black} />
          <Cap mat={X.black} r={0.25} sy={1.1} y={0.01} />
          <mesh position={[0, 0.04, 0]} material={X.darkRed}>
            <cylinderGeometry args={[0.252, 0.252, 0.04, 18]} />
          </mesh>
        </group>
      );
    case 36: // czapka kapitana
      return (
        <group position={[0, 0.22, 0]}>
          <mesh position={[0, 0.03, 0]} material={X.navy}>
            <cylinderGeometry args={[0.31, 0.3, 0.1, 20]} />
          </mesh>
          <mesh position={[0, 0.12, 0]} scale={[1, 0.35, 1]} material={X.white}>
            <sphereGeometry args={[0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, -0.01, 0.3]} rotation={[0.35, 0, 0]} material={X.black}>
            <boxGeometry args={[0.36, 0.02, 0.16]} />
          </mesh>
          <mesh position={[0, 0.04, 0.31]} material={X.gold}>
            <torusGeometry args={[0.04, 0.012, 6, 12]} />
          </mesh>
          <mesh position={[0, 0.02, 0.305]} material={X.gold}>
            <boxGeometry args={[0.3, 0.015, 0.01]} />
          </mesh>
        </group>
      );
    case 37: // czapka marynarza
      return (
        <group position={[0, 0.24, 0]} rotation={[-0.1, 0, 0.1]}>
          <mesh material={X.white}>
            <cylinderGeometry args={[0.24, 0.22, 0.14, 18, 1, true]} />
          </mesh>
          <mesh position={[0, 0.07, 0]} material={X.white}>
            <cylinderGeometry args={[0.24, 0.24, 0.02, 18]} />
          </mesh>
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={X.white}>
            <torusGeometry args={[0.24, 0.035, 6, 20]} />
          </mesh>
          <mesh position={[0, -0.02, 0.235]} material={X.blue}>
            <boxGeometry args={[0.12, 0.03, 0.01]} />
          </mesh>
        </group>
      );
    case 38: // czapka policjanta
      return (
        <group position={[0, 0.22, 0]}>
          <mesh position={[0, 0.02, 0]} material={X.navy}>
            <cylinderGeometry args={[0.3, 0.29, 0.11, 20]} />
          </mesh>
          <mesh position={[0, 0.11, 0.02]} scale={[1, 0.3, 1]} material={X.navy}>
            <sphereGeometry args={[0.37, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.02, 0.29]} material={X.black}>
            <boxGeometry args={[0.3, 0.035, 0.02]} />
          </mesh>
          <mesh position={[0, -0.02, 0.32]} rotation={[0.4, 0, 0]} material={X.black}>
            <boxGeometry args={[0.36, 0.02, 0.14]} />
          </mesh>
          <mesh position={[0, 0.1, 0.32]} rotation={[-0.4, 0, 0]} material={X.gold}>
            <cylinderGeometry args={[0.045, 0.045, 0.01, 6]} />
          </mesh>
        </group>
      );
    case 39: // biret absolwenta
      return (
        <group position={[0, 0.25, 0]}>
          <Cap mat={X.black} r={0.3} sy={0.4} y={-0.02} />
          <mesh position={[0, 0.09, 0]} rotation={[0, Math.PI / 4, 0]} material={X.black}>
            <boxGeometry args={[0.6, 0.025, 0.6]} />
          </mesh>
          <mesh position={[0, 0.11, 0]} material={X.yellow}>
            <sphereGeometry args={[0.025, 6, 5]} />
          </mesh>
          <mesh position={[0.22, 0.02, 0.2]} material={X.yellow}>
            <cylinderGeometry args={[0.006, 0.006, 0.18, 4]} />
          </mesh>
          <mesh position={[0.22, -0.08, 0.2]} material={X.yellow}>
            <coneGeometry args={[0.025, 0.07, 6]} />
          </mesh>
        </group>
      );
    case 40: // hełm strażaka
      return (
        <group position={[0, 0.1, 0]}>
          <Cap mat={X.red} r={0.37} sy={0.85} />
          <mesh position={[0, 0, -0.04]} scale={[1, 1, 1.25]} material={X.red}>
            <cylinderGeometry args={[0.42, 0.44, 0.03, 22]} />
          </mesh>
          <mesh position={[0, 0.2, 0.3]} rotation={[-0.5, 0, 0]} material={X.gold}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 6]} />
          </mesh>
          <mesh position={[0, 0.29, 0]} rotation={[0, 0, 0]} scale={[0.15, 0.25, 1]} material={X.red}>
            <sphereGeometry args={[0.35, 10, 8]} />
          </mesh>
        </group>
      );
    case 41: // kask górnika
      return (
        <group position={[0, 0.1, 0]}>
          <Cap mat={X.yellow} r={0.37} sy={0.82} />
          <Brim r={0.42} mat={X.yellow} y={0.0} />
          <mesh position={[0, 0.14, 0.33]} rotation={[Math.PI / 2 - 0.4, 0, 0]} material={X.grey}>
            <cylinderGeometry args={[0.06, 0.07, 0.07, 12]} />
          </mesh>
          <mesh position={[0, 0.155, 0.365]} rotation={[-0.4, 0, 0]} material={X.glowYellow}>
            <circleGeometry args={[0.05, 12]} />
          </mesh>
        </group>
      );
    case 42: // hełm astronauty
      return (
        <group position={[0, -0.02, 0]}>
          <mesh material={X.glass}>
            <sphereGeometry args={[0.47, 22, 16]} />
          </mesh>
          <mesh position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]} material={X.white}>
            <torusGeometry args={[0.32, 0.06, 8, 22]} />
          </mesh>
          <mesh position={[0.3, 0.3, 0]} material={X.white}>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 5]} />
          </mesh>
          <mesh position={[0.3, 0.41, 0]} material={X.glowRed}>
            <sphereGeometry args={[0.025, 6, 5]} />
          </mesh>
        </group>
      );
    case 43: // hełm rycerza
      return (
        <group>
          <mesh scale={[1, 1.05, 1]} material={X.steel}>
            <sphereGeometry args={[0.38, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          </mesh>
          <mesh position={[0, 0.02, 0.37]} material={X.black}>
            <boxGeometry args={[0.3, 0.03, 0.02]} />
          </mesh>
          <mesh position={[0, 0.08, 0.36]} material={X.black}>
            <boxGeometry args={[0.26, 0.02, 0.02]} />
          </mesh>
          <mesh position={[0, 0.36, -0.05]} rotation={[0.3, 0, 0]} scale={[0.2, 1, 1]} material={X.red}>
            <sphereGeometry args={[0.16, 8, 8]} />
          </mesh>
        </group>
      );
    case 44: // hełm samuraja
      return (
        <group position={[0, 0.08, 0]}>
          <Cap mat={X.black} r={0.37} sy={0.9} />
          <mesh position={[0, -0.04, -0.05]} material={X.darkRed}>
            <cylinderGeometry args={[0.4, 0.5, 0.18, 20, 1, true]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0.32, 0.25]} rotation={[0.2, 0, -s * 0.55]} material={X.gold}>
              <boxGeometry args={[0.05, 0.32, 0.015]} />
            </mesh>
          ))}
          <mesh position={[0, 0.22, 0.32]} material={X.gold}>
            <sphereGeometry args={[0.04, 8, 6]} />
          </mesh>
        </group>
      );
    case 45: // czapka błazna
      return (
        <group position={[0, 0.16, 0]}>
          <Cap mat={X.purple} r={0.36} sy={0.65} />
          {[
            [-1, X.purple],
            [0, X.yellow],
            [1, X.purple],
          ].map(([s, m], i) => (
            <group key={i} position={[(s as number) * 0.22, 0.17, -0.02]} rotation={[0, 0, -(s as number) * 0.9]}>
              <mesh position={[0, 0.14, 0]} material={i === 1 ? X.red : (m as THREE.Material)}>
                <coneGeometry args={[0.09, 0.32, 10]} />
              </mesh>
              <mesh position={[0, 0.31, 0]} material={X.gold}>
                <sphereGeometry args={[0.04, 8, 6]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 46: // kapelusz wiedźmy
      return (
        <group position={[0, 0.26, 0]} rotation={[-0.06, 0, 0.08]}>
          <Brim r={0.55} mat={X.black} />
          <mesh position={[0, 0.25, 0]} rotation={[-0.15, 0, 0.1]} material={X.black}>
            <coneGeometry args={[0.24, 0.6, 16]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={X.purple}>
            <cylinderGeometry args={[0.235, 0.24, 0.06, 16]} />
          </mesh>
          <mesh position={[0, 0.05, 0.24]} material={X.gold}>
            <boxGeometry args={[0.07, 0.06, 0.01]} />
          </mesh>
        </group>
      );
    case 47: // czapka elfa
      return (
        <group position={[0, 0.16, 0]}>
          <Cap mat={X.green} r={0.36} sy={0.6} />
          <mesh position={[0.08, 0.32, -0.06]} rotation={[0, 0, -0.7]} material={X.green}>
            <coneGeometry args={[0.18, 0.5, 14]} />
          </mesh>
          <mesh position={[0.28, 0.48, -0.06]} material={X.gold}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={X.red}>
            <torusGeometry args={[0.355, 0.04, 6, 24]} />
          </mesh>
        </group>
      );
    case 48: // poroże renifera
      return (
        <group>
          <Antler side={-1} />
          <Antler side={1} />
          <mesh position={[0, 0.3, -0.01]} rotation={[0.1, 0, 0]} material={X.brown}>
            <torusGeometry args={[0.24, 0.02, 6, 20, Math.PI]} />
          </mesh>
        </group>
      );
    case 49: // róg jednorożca
      return (
        <group position={[0, 0.3, 0.12]} rotation={[0.35, 0, 0]}>
          <mesh position={[0, 0.13, 0]} material={X.gold}>
            <coneGeometry args={[0.055, 0.3, 12]} />
          </mesh>
          {[0.04, 0.1, 0.16].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={X.pink}>
              <torusGeometry args={[0.048 - y * 0.18, 0.008, 4, 12]} />
            </mesh>
          ))}
        </group>
      );
    case 50: // wianek z kwiatów
      return (
        <group position={[0, 0.2, 0]}>
          <mesh rotation={[Math.PI / 2 - 0.1, 0, 0]} material={X.green}>
            <torusGeometry args={[0.28, 0.025, 6, 24]} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2;
            const c = [X.pink, X.yellow, X.white, X.hotPink, X.purple][i % 5];
            return (
              <mesh key={i} position={[Math.sin(a) * 0.28, 0.02 + Math.cos(a) * 0.03, Math.cos(a) * 0.28]} material={c}>
                <sphereGeometry args={[0.055, 8, 6]} />
              </mesh>
            );
          })}
        </group>
      );
    case 51: // wieniec laurowy
      return (
        <group position={[0, 0.17, 0]} rotation={[-0.15, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={X.gold}>
            <torusGeometry args={[0.335, 0.012, 6, 30]} />
          </mesh>
          {Array.from({ length: 22 }, (_, i) => {
            const side = i < 11 ? -1 : 1;
            const t = (i % 11) / 10; // 0 = przód, 1 = tył
            const a = side * (0.25 + t * 2.5);
            return (
              <group key={i} position={[Math.sin(a) * 0.34, 0.035, Math.cos(a) * 0.34]} rotation={[0, a, 0]}>
                <mesh rotation={[0, 0, side * 0.9]} scale={[0.4, 1, 0.12]} material={col('#c9a227', { metalness: 0.6, roughness: 0.3 })}>
                  <sphereGeometry args={[0.065, 8, 6]} />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    case 52: // diadem
      return (
        <group position={[0, 0.24, 0.05]} rotation={[-0.25, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={X.silver}>
            <torusGeometry args={[0.27, 0.014, 6, 26, Math.PI]} />
          </mesh>
          {[-0.5, -0.25, 0, 0.25, 0.5].map((a, i) => (
            <mesh key={a} position={[Math.sin(a) * 0.27, 0.05 + (i === 2 ? 0.04 : 0), Math.cos(a) * 0.27]} material={i === 2 ? X.glowPink : X.silver}>
              <octahedronGeometry args={[i === 2 ? 0.05 : 0.03]} />
            </mesh>
          ))}
        </group>
      );
    case 53: // srebrna korona
      return (
        <group position={[0, 0.3, 0]}>
          <mesh material={X.silver}>
            <cylinderGeometry args={[0.2, 0.22, 0.12, 14, 1, true]} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2;
            return (
              <group key={i}>
                <mesh position={[Math.sin(a) * 0.2, 0.1, Math.cos(a) * 0.2]} material={X.silver}>
                  <coneGeometry args={[0.035, 0.1, 4]} />
                </mesh>
                <mesh position={[Math.sin(a) * 0.205, 0.15, Math.cos(a) * 0.205]} material={X.glowCyan}>
                  <sphereGeometry args={[0.018, 6, 5]} />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    case 54: // garnek
      return (
        <group position={[0, 0.2, 0]} rotation={[0, 0, 0.12]}>
          <mesh rotation={[Math.PI, 0, 0]} material={X.steel}>
            <cylinderGeometry args={[0.3, 0.3, 0.3, 20, 1, true]} />
          </mesh>
          <mesh position={[0, 0.15, 0]} material={X.steel}>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 20]} />
          </mesh>
          <mesh position={[0.42, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} material={X.black}>
            <cylinderGeometry args={[0.025, 0.025, 0.25, 6]} />
          </mesh>
        </group>
      );
    case 55: // pachołek drogowy
      return (
        <group position={[0, 0.3, 0]}>
          <mesh position={[0, 0.25, 0]} material={X.orange}>
            <coneGeometry args={[0.22, 0.55, 16, 1, true]} />
          </mesh>
          {[0.15, 0.3].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={X.white}>
              <cylinderGeometry args={[0.22 - y * 0.4 + 0.004, 0.22 - (y - 0.05) * 0.4 + 0.004, 0.05, 16, 1, true]} />
            </mesh>
          ))}
          <mesh material={X.orange}>
            <boxGeometry args={[0.5, 0.03, 0.5]} />
          </mesh>
        </group>
      );
    case 56: // kapelusz muchomora
      return (
        <group position={[0, 0.2, 0]}>
          <mesh scale={[1, 0.6, 1]} material={X.red}>
            <sphereGeometry args={[0.46, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2;
            const t = i % 2 ? 0.55 : 0.95;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.4 * Math.sin(t), 0.27 * Math.cos(t * 0.6) + 0.02, Math.cos(a) * 0.4 * Math.sin(t)]} material={X.white}>
                <sphereGeometry args={[0.045, 8, 6]} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.27, 0]} material={X.white}>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        </group>
      );
    case 57: // czapka żaby
      return (
        <group position={[0, 0.1, 0]}>
          <Cap mat={X.lime} r={0.365} sy={0.85} />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.15, 0.3, 0.1]}>
              <mesh material={X.lime}>
                <sphereGeometry args={[0.1, 12, 10]} />
              </mesh>
              <mesh position={[0, 0.01, 0.08]} material={X.white}>
                <sphereGeometry args={[0.055, 10, 8]} />
              </mesh>
              <mesh position={[0, 0.01, 0.125]} material={X.black}>
                <sphereGeometry args={[0.025, 8, 6]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 58: // płetwa rekina
      return <SharkFin />;
    case 59: // kurczak na głowie
      return (
        <group position={[0, 0.38, -0.02]}>
          <mesh scale={[1, 0.85, 1.2]} material={X.white}>
            <sphereGeometry args={[0.15, 14, 10]} />
          </mesh>
          <mesh position={[0, 0.13, 0.12]} material={X.white}>
            <sphereGeometry args={[0.08, 12, 10]} />
          </mesh>
          <mesh position={[0, 0.13, 0.21]} rotation={[Math.PI / 2, 0, 0]} material={X.orange}>
            <coneGeometry args={[0.025, 0.06, 6]} />
          </mesh>
          <mesh position={[0, 0.22, 0.11]} scale={[0.4, 1, 1]} material={X.red}>
            <sphereGeometry args={[0.04, 8, 6]} />
          </mesh>
          <mesh position={[0, 0.09, 0.19]} material={X.red}>
            <sphereGeometry args={[0.018, 6, 5]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.035, 0.15, 0.185]} material={X.black}>
              <sphereGeometry args={[0.012, 5, 4]} />
            </mesh>
          ))}
          <mesh position={[0, 0.06, -0.18]} rotation={[0.6, 0, 0]} scale={[1, 0.3, 1]} material={X.white}>
            <coneGeometry args={[0.08, 0.14, 5]} />
          </mesh>
        </group>
      );
    case 60: // pizza na głowie
      return (
        <group position={[0, 0.38, -0.32]} rotation={[0.3, 0.25, 0]} scale={1.35}>
          <mesh position={[0, -0.01, 0]} material={X.tan}>
            <cylinderGeometry args={[0.36, 0.36, 0.05, 14, 1, false, -0.4, 0.8]} />
          </mesh>
          <mesh material={X.yellow}>
            <cylinderGeometry args={[0.31, 0.31, 0.05, 14, 1, false, -0.36, 0.72]} />
          </mesh>
          {[
            [0.02, 0.2],
            [-0.05, 0.12],
            [0.06, 0.26],
            [0, 0.08],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.028, z]} material={X.darkRed}>
              <cylinderGeometry args={[0.025, 0.025, 0.01, 10]} />
            </mesh>
          ))}
        </group>
      );
    case 61: // kaczuszka
      return (
        <group position={[0, 0.39, 0]}>
          <mesh scale={[1, 0.8, 1.2]} material={X.yellow}>
            <sphereGeometry args={[0.14, 14, 10]} />
          </mesh>
          <mesh position={[0, 0.13, 0.08]} material={X.yellow}>
            <sphereGeometry args={[0.085, 12, 10]} />
          </mesh>
          <mesh position={[0, 0.11, 0.18]} scale={[1.3, 0.45, 1]} material={X.orange}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.04, 0.16, 0.15]} material={X.black}>
              <sphereGeometry args={[0.013, 5, 4]} />
            </mesh>
          ))}
          <mesh position={[0, 0.05, -0.16]} rotation={[-0.8, 0, 0]} material={X.yellow}>
            <coneGeometry args={[0.05, 0.1, 6]} />
          </mesh>
        </group>
      );
    case 62: // irokez
      return (
        <group>
          {Array.from({ length: 8 }, (_, i) => {
            const t = -0.65 + (i / 7) * 2.35;
            return (
              <mesh key={i} position={[0, Math.cos(t) * 0.36, -Math.sin(t) * 0.36]} rotation={[-t, 0, 0]} scale={[0.45, 1, 1]} material={HAIR_PINK}>
                <coneGeometry args={[0.09, 0.34 - Math.abs(t - 0.5) * 0.06, 8]} />
              </mesh>
            );
          })}
        </group>
      );
    case 63: // afro
      return (
        <group position={[0, 0.16, -0.05]}>
          <mesh scale={[1.12, 0.95, 1.05]} material={col('#2a1a10', { roughness: 0.95 })}>
            <icosahedronGeometry args={[0.38, 2]} />
          </mesh>
        </group>
      );
    case 64: // kucyk
      return (
        <group>
          <Cap mat={HAIR_BLOND} r={0.352} cut={0.47} y={0.02} />
          <mesh position={[0, 0.16, -0.34]} rotation={[Math.PI / 2, 0, 0]} material={X.pink}>
            <torusGeometry args={[0.04, 0.015, 6, 10]} />
          </mesh>
          <mesh position={[0, -0.02, -0.4]} rotation={[0.35, 0, 0]} material={HAIR_BLOND}>
            <capsuleGeometry args={[0.055, 0.3, 4, 8]} />
          </mesh>
        </group>
      );
    case 65: // dwa kucyki
      return (
        <group>
          <Cap mat={HAIR} r={0.352} cut={0.47} y={0.02} />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.33, 0.1, -0.06]} rotation={[0, 0, s * 0.5]}>
              <mesh position={[s * 0.08, -0.12, 0]} material={HAIR}>
                <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]} material={X.red}>
                <torusGeometry args={[0.04, 0.015, 6, 10]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 66: // kok
      return (
        <group>
          <Cap mat={HAIR_BLACK} r={0.352} cut={0.47} y={0.02} />
          <mesh position={[0, 0.38, -0.08]} material={HAIR_BLACK}>
            <sphereGeometry args={[0.12, 14, 12]} />
          </mesh>
          <mesh position={[0, 0.38, -0.08]} rotation={[0.3, 0, 0.8]} material={X.red}>
            <cylinderGeometry args={[0.008, 0.008, 0.34, 5]} />
          </mesh>
        </group>
      );
    case 67: // czub
      return (
        <group>
          <Cap mat={HAIR_BLACK} r={0.352} cut={0.42} y={0.02} />
          <mesh position={[0, 0.32, 0.14]} rotation={[-0.5, 0, 0]} scale={[1, 0.6, 1.2]} material={HAIR_BLACK}>
            <sphereGeometry args={[0.17, 14, 10]} />
          </mesh>
        </group>
      );
    case 68: // kolce anime
      return (
        <group>
          <Cap mat={HAIR_BLOND} r={0.352} cut={0.45} y={0.02} />
          {Array.from({ length: 11 }, (_, i) => {
            const a = (i / 11) * Math.PI * 2;
            const tilt = 0.9;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.2 - 0.02]} rotation={[Math.cos(a) * tilt, 0, -Math.sin(a) * tilt]} material={HAIR_BLOND}>
                <coneGeometry args={[0.08, 0.3, 6]} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.44, -0.02]} material={HAIR_BLOND}>
            <coneGeometry args={[0.08, 0.28, 6]} />
          </mesh>
        </group>
      );
    case 69: // grzywka emo
      return (
        <group>
          <Cap mat={HAIR_BLACK} r={0.355} cut={0.5} y={0.01} />
          <mesh position={[0.06, 0.1, 0.27]} rotation={[0.2, 0, -0.5]} scale={[1.4, 0.5, 0.45]} material={HAIR_BLACK}>
            <sphereGeometry args={[0.18, 12, 10]} />
          </mesh>
          <mesh position={[-0.2, 0.17, 0.23]} rotation={[0, 0, 0.2]} scale={[0.6, 0.4, 0.4]} material={HAIR_BLUE}>
            <sphereGeometry args={[0.13, 10, 8]} />
          </mesh>
        </group>
      );
    case 70: // łysina z wiankiem
      return (
        <group>
          <mesh position={[0, -0.01, -0.02]} rotation={[Math.PI / 2, 0, Math.PI * 0.2]} material={X.lightGrey}>
            <torusGeometry args={[0.33, 0.065, 8, 24, Math.PI * 1.6]} />
          </mesh>
          <mesh position={[0.1, 0.3, 0.13]} rotation={[-0.5, 0.3, 0]} material={X.basicWhite}>
            <circleGeometry args={[0.045, 12]} />
          </mesh>
          <mesh position={[0, 0.345, 0.02]} rotation={[0, 0, 0]} material={X.lightGrey}>
            <torusGeometry args={[0.035, 0.006, 4, 10, Math.PI]} />
          </mesh>
        </group>
      );
    case 71: // nauszniki
      return (
        <group>
          <mesh position={[0, 0.02, 0]} material={X.white}>
            <torusGeometry args={[0.37, 0.022, 6, 18, Math.PI]} />
          </mesh>
          {[-0.36, 0.36].map((x) => (
            <mesh key={x} position={[x, 0, 0]} material={X.hotPink}>
              <sphereGeometry args={[0.11, 12, 10]} />
            </mesh>
          ))}
        </group>
      );
    case 72: // czapka pilota z goglami
      return (
        <group position={[0, 0.06, 0]}>
          <Cap mat={X.brown} r={0.365} sy={0.95} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.33, -0.17, 0.02]} scale={[0.4, 1, 0.85]} material={X.brown}>
              <sphereGeometry args={[0.13, 10, 8]} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <group key={`g${s}`} position={[s * 0.1, 0.27, 0.22]} rotation={[-0.75, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={X.gold}>
                <torusGeometry args={[0.07, 0.018, 6, 14]} />
              </mesh>
              <mesh material={X.darkGlass}>
                <circleGeometry args={[0.065, 14]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 73: // czapka z szopa
      return (
        <group position={[0, 0.08, 0]}>
          <Cap mat={X.grey} r={0.365} sy={0.95} />
          <mesh position={[0.15, 0.0, -0.36]} rotation={[0.9, 0, 0.3]} material={X.grey}>
            <capsuleGeometry args={[0.06, 0.32, 4, 8]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.19 + i * 0.03, -0.07 - i * 0.09, -0.44 - i * 0.05]} rotation={[0.9, 0, 0.3]} material={X.black}>
              <cylinderGeometry args={[0.063, 0.063, 0.035, 10]} />
            </mesh>
          ))}
        </group>
      );
    case 74: // neon 67
      return <Neon67 />;
    case 75: // chmurka z deszczem
      return <RainCloud />;
    default:
      return null;
  }
}
