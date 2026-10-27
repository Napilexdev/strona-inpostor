'use client';

/**
 * Stroje postaci: nakrycia głowy (HATS), dodatki na twarz (FACES) i koszulki (SHIRTS).
 * Wszystko zbudowane z prostych brył Three.js, a koszulki to tekstury rysowane w <canvas>
 * — bez wczytywania plików z zewnątrz. Numery zgodne z listami w shared/outfits.ts.
 */
import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });

const M = {
  gold: std('#ffcf3f', { metalness: 0.6, roughness: 0.3 }),
  black: std('#15151c'),
  white: std('#f4f5fb'),
  red: std('#e03131'),
  pink: std('#ff8fb8'),
  brown: std('#8b5a2b'),
  darkBrown: std('#5c3a1e'),
  cream: std('#efe2c4'),
  yellow: std('#ffd43b'),
  grey: std('#adb5bd', { metalness: 0.4 }),
  navy: std('#25305e'),
  green: std('#2f9e44'),
  blue: std('#4dabf7'),
  purple: std('#5f3dc4'),
  lens: new THREE.MeshStandardMaterial({ color: '#1a2240', metalness: 0.4, roughness: 0.1, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  shades: std('#0b0d14', { metalness: 0.6, roughness: 0.15, flatShading: false }),
  halo: new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffd43b', emissiveIntensity: 1.6, toneMapped: false }),
  blush: new THREE.MeshBasicMaterial({ color: '#ff6b9a', transparent: true, opacity: 0.55, depthWrite: false }),
  lens3dRed: new THREE.MeshBasicMaterial({ color: '#ff2d4a', transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  lens3dBlue: new THREE.MeshBasicMaterial({ color: '#22b8ff', transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  goggle: std('#ff9f1c', { metalness: 0.7, roughness: 0.12, emissive: '#7a3a00', emissiveIntensity: 0.3, flatShading: false }),
  plaster: std('#e8b98d'),
  freckle: new THREE.MeshBasicMaterial({ color: '#8a4b2a', transparent: true, opacity: 0.75, depthWrite: false }),
  brow: std('#1d1a22'),
  stubble: new THREE.MeshStandardMaterial({ color: '#2b2420', transparent: true, opacity: 0.38, roughness: 1, depthWrite: false }),
  glowEye: new THREE.MeshStandardMaterial({ color: '#c7f9ff', emissive: '#5ee6ff', emissiveIntensity: 2, toneMapped: false }),
  golf: std('#2b2b33'),
  puffer: std('#ff6b35'),
  wing: new THREE.MeshStandardMaterial({ color: '#e7f5ff', transparent: true, opacity: 0.6, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }),
  heart: new THREE.MeshStandardMaterial({ color: '#ff3b6b', emissive: '#a5002e', emissiveIntensity: 0.5, side: THREE.DoubleSide }),
  starEye: new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffb703', emissiveIntensity: 0.9, side: THREE.DoubleSide }),
};

const BEARD_COLORS = { dark: std('#4a2f19'), ginger: std('#c4561b'), grey: std('#d9d9de'), black: std('#1b1a1f') };

// ───────────────────────────── nakrycia głowy ─────────────────────────────

function Propeller() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 9;
  });
  return (
    <group position={[0, 0.5, 0]}>
      <mesh material={M.grey}>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 6]} />
      </mesh>
      <group ref={ref} position={[0, 0.06, 0]}>
        {[0, Math.PI].map((r) => (
          <mesh key={r} rotation={[0.2, r, 0]} position={[Math.cos(r) * 0.12, 0, 0]} material={r ? M.red : M.blue}>
            <boxGeometry args={[0.24, 0.01, 0.06]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Nakrycie głowy. `accent` = materiał w kolorze gracza. */
export function Hat({ kind, accent }: { kind: number; accent: THREE.Material }) {
  switch (kind) {
    case 1: // antenka
      return (
        <group position={[0, 0.32, 0]}>
          <mesh position={[0, 0.12, 0]} material={accent}>
            <cylinderGeometry args={[0.018, 0.018, 0.24, 6]} />
          </mesh>
          <mesh position={[0, 0.27, 0]} material={accent}>
            <sphereGeometry args={[0.06, 8, 6]} />
          </mesh>
        </group>
      );
    case 2: // czapeczka imprezowa
      return (
        <group position={[0, 0.36, 0]} rotation={[-0.12, 0, 0.12]}>
          <mesh material={accent}>
            <coneGeometry args={[0.2, 0.32, 8]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} material={M.yellow}>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        </group>
      );
    case 3: // słuchawki
      return (
        <group>
          <mesh position={[0, 0.02, 0]} material={accent}>
            <torusGeometry args={[0.36, 0.03, 6, 16, Math.PI]} />
          </mesh>
          {[-0.36, 0.36].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={accent}>
              <cylinderGeometry args={[0.09, 0.09, 0.08, 10]} />
            </mesh>
          ))}
        </group>
      );
    case 4: // korona
      return (
        <group position={[0, 0.3, 0]}>
          <mesh material={M.gold}>
            <cylinderGeometry args={[0.2, 0.22, 0.12, 10, 1, true]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.2, 0.11, Math.cos(a) * 0.2]} material={M.gold}>
                <coneGeometry args={[0.05, 0.12, 4]} />
              </mesh>
            );
          })}
        </group>
      );
    case 5: // cylinder
      return (
        <group position={[0, 0.3, 0]} rotation={[-0.08, 0, 0.06]}>
          <mesh material={M.black}>
            <cylinderGeometry args={[0.3, 0.3, 0.03, 16]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} material={M.black}>
            <cylinderGeometry args={[0.18, 0.19, 0.32, 14]} />
          </mesh>
          <mesh position={[0, 0.06, 0]} material={M.red}>
            <cylinderGeometry args={[0.195, 0.195, 0.05, 14]} />
          </mesh>
        </group>
      );
    case 6: // kokarda
      return (
        <group position={[0.2, 0.25, 0.08]} rotation={[0, 0, 0.5]}>
          {[-0.08, 0.08].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2]} material={M.pink}>
              <coneGeometry args={[0.07, 0.15, 4]} />
            </mesh>
          ))}
          <mesh material={M.pink}>
            <sphereGeometry args={[0.04, 6, 5]} />
          </mesh>
        </group>
      );
    case 7: // czapka z daszkiem
      return (
        <group position={[0, 0.1, 0]}>
          <mesh scale={[1, 0.72, 1]} material={accent}>
            <sphereGeometry args={[0.355, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.02, 0.32]} rotation={[0.18, 0, 0]} material={accent}>
            <boxGeometry args={[0.42, 0.025, 0.26]} />
          </mesh>
          <mesh position={[0, 0.26, 0]} material={M.white}>
            <sphereGeometry args={[0.035, 6, 5]} />
          </mesh>
        </group>
      );
    case 8: // czapka zimowa z pomponem
      return (
        <group position={[0, 0.07, 0]}>
          <mesh scale={[1, 0.95, 1]} material={accent}>
            <sphereGeometry args={[0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={M.white}>
            <torusGeometry args={[0.35, 0.055, 6, 18]} />
          </mesh>
          <mesh position={[0, 0.38, 0]} material={M.white}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
        </group>
      );
    case 9: // kapelusz kowbojski
      return (
        <group position={[0, 0.25, 0]} rotation={[-0.06, 0, 0]}>
          <mesh scale={[1, 1, 0.85]} material={M.brown}>
            <cylinderGeometry args={[0.56, 0.56, 0.03, 18]} />
          </mesh>
          <mesh scale={[1, 1, 0.85]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={M.brown}>
            <torusGeometry args={[0.55, 0.035, 5, 18]} />
          </mesh>
          <mesh position={[0, 0.14, 0]} scale={[1, 1, 0.85]} material={M.brown}>
            <cylinderGeometry args={[0.2, 0.25, 0.26, 12]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} scale={[1, 1, 0.85]} material={M.darkBrown}>
            <cylinderGeometry args={[0.252, 0.252, 0.05, 12]} />
          </mesh>
        </group>
      );
    case 10: // kask budowlany
      return (
        <group position={[0, 0.08, 0]}>
          <mesh material={M.yellow}>
            <sphereGeometry args={[0.37, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.005, 0.04]} scale={[1, 1, 1.1]} material={M.yellow}>
            <cylinderGeometry args={[0.44, 0.44, 0.03, 18]} />
          </mesh>
          <mesh position={[0, 0.33, 0]} material={M.yellow}>
            <boxGeometry args={[0.08, 0.08, 0.6]} />
          </mesh>
        </group>
      );
    case 11: // czapka kucharza
      return (
        <group position={[0, 0.28, 0]}>
          <mesh position={[0, 0.06, 0]} material={M.white}>
            <cylinderGeometry args={[0.24, 0.26, 0.16, 14]} />
          </mesh>
          {[[-0.1, 0], [0.1, 0], [0, 0.1], [0, -0.1], [0, 0]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.27, z]} material={M.white}>
              <sphereGeometry args={[0.17, 10, 8]} />
            </mesh>
          ))}
        </group>
      );
    case 12: // beret
      return (
        <group position={[0.04, 0.28, 0]} rotation={[0, 0, -0.3]}>
          <mesh scale={[1, 0.32, 1]} material={accent}>
            <sphereGeometry args={[0.34, 14, 8]} />
          </mesh>
          <mesh position={[0, 0.12, 0]} material={accent}>
            <cylinderGeometry args={[0.015, 0.02, 0.06, 6]} />
          </mesh>
        </group>
      );
    case 13: // czapka Mikołaja
      return (
        <group position={[0, 0.24, 0]} rotation={[-0.2, 0, 0.35]}>
          <mesh position={[0, 0.2, 0]} material={M.red}>
            <coneGeometry args={[0.3, 0.46, 12]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={M.white}>
            <torusGeometry args={[0.3, 0.07, 6, 18]} />
          </mesh>
          <mesh position={[0, 0.45, 0]} material={M.white}>
            <sphereGeometry args={[0.08, 8, 6]} />
          </mesh>
        </group>
      );
    case 14: // rogi diabła
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.17, 0.3, 0.06]} rotation={[0.2, 0, -s * 0.45]} material={M.red}>
              <coneGeometry args={[0.06, 0.2, 6]} />
            </mesh>
          ))}
        </group>
      );
    case 15: // aureola
      return (
        <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]} material={M.halo}>
          <torusGeometry args={[0.24, 0.03, 8, 28]} />
        </mesh>
      );
    case 16: // kapelusz pirata
      return (
        <group position={[0, 0.3, 0]} rotation={[-0.08, 0, 0]}>
          <mesh scale={[1.15, 0.42, 0.62]} material={M.black}>
            <sphereGeometry args={[0.38, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} scale={[1.2, 1, 0.66]} material={M.black}>
            <cylinderGeometry args={[0.38, 0.38, 0.03, 16]} />
          </mesh>
          <mesh position={[0, 0.08, 0.22]} material={M.white}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, 0.08, 0.225]} rotation={[0, 0, s * 0.8]} material={M.white}>
              <boxGeometry args={[0.13, 0.016, 0.01]} />
            </mesh>
          ))}
        </group>
      );
    case 17: // hełm wikinga
      return (
        <group position={[0, 0.06, 0]}>
          <mesh material={M.grey}>
            <sphereGeometry args={[0.365, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={M.darkBrown}>
            <torusGeometry args={[0.36, 0.035, 6, 18]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.38, 0.2, 0]} rotation={[0, 0, -s * 1.0]} material={M.cream}>
              <coneGeometry args={[0.07, 0.3, 8]} />
            </mesh>
          ))}
        </group>
      );
    case 18: // kocie uszy
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.2, 0.28, 0]} rotation={[0, 0, -s * 0.35]}>
              <mesh material={accent}>
                <coneGeometry args={[0.1, 0.2, 4]} />
              </mesh>
              <mesh position={[0, -0.01, 0.03]} scale={0.6} material={M.pink}>
                <coneGeometry args={[0.1, 0.2, 4]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 19: // królicze uszy
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, 0.46, -0.02]} rotation={[-0.1, 0, -s * 0.18]}>
              <mesh scale={[1, 1, 0.5]} material={M.white}>
                <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
              </mesh>
              <mesh position={[0, 0, 0.03]} scale={[0.6, 0.85, 0.3]} material={M.pink}>
                <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 20: // kwiatek
      return (
        <group position={[0.22, 0.27, 0.1]} rotation={[0.3, 0.3, -0.4]}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0]} material={M.pink}>
                <sphereGeometry args={[0.05, 8, 6]} />
              </mesh>
            );
          })}
          <mesh position={[0, 0, 0.02]} material={M.yellow}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
        </group>
      );
    case 21: // czapka ze śmigiełkiem
      return (
        <group position={[0, 0.1, 0]}>
          <mesh scale={[1, 0.75, 1]} material={accent}>
            <sphereGeometry args={[0.355, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.02, 0.3]} rotation={[0.2, 0, 0]} material={M.yellow}>
            <boxGeometry args={[0.36, 0.02, 0.2]} />
          </mesh>
          <Propeller />
        </group>
      );
    case 22: // kapelusz czarodzieja
      return (
        <group position={[0, 0.28, 0]} rotation={[-0.15, 0, 0.12]}>
          <mesh material={M.purple}>
            <cylinderGeometry args={[0.48, 0.48, 0.03, 18]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} material={M.purple}>
            <coneGeometry args={[0.27, 0.66, 12]} />
          </mesh>
          {[[0.15, 0.2, 0.17], [-0.1, 0.42, 0.13], [0.04, 0.12, 0.25]].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} material={M.halo}>
              <octahedronGeometry args={[0.035]} />
            </mesh>
          ))}
        </group>
      );
    case 23: // opaska sportowa
      return (
        <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2 - 0.12, 0, 0]} material={accent}>
          <torusGeometry args={[0.325, 0.05, 6, 22]} />
        </mesh>
      );
    case 24: // fez
      return (
        <group position={[0.03, 0.36, 0]} rotation={[0, 0, -0.15]}>
          <mesh material={M.red}>
            <cylinderGeometry args={[0.15, 0.19, 0.22, 14]} />
          </mesh>
          <mesh position={[0.12, -0.02, 0]} rotation={[0, 0, 0.3]} material={M.black}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 4]} />
          </mesh>
        </group>
      );
    case 25: // panama
      return (
        <group position={[0, 0.27, 0]} rotation={[-0.06, 0, 0.05]}>
          <mesh material={M.cream}>
            <cylinderGeometry args={[0.46, 0.46, 0.025, 18]} />
          </mesh>
          <mesh position={[0, 0.11, 0]} material={M.cream}>
            <cylinderGeometry args={[0.22, 0.25, 0.2, 14]} />
          </mesh>
          <mesh position={[0, 0.04, 0]} material={M.black}>
            <cylinderGeometry args={[0.252, 0.252, 0.05, 14]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

// ───────────────────────────── twarz ─────────────────────────────

export function Face({ kind }: { kind: number }) {
  switch (kind) {
    case 1: // okulary
      return (
        <group position={[0, 0.045, 0]}>
          {[-0.125, 0.125].map((x) => (
            <group key={x} position={[x, 0, 0.395]}>
              <mesh material={M.black}>
                <torusGeometry args={[0.095, 0.016, 6, 20]} />
              </mesh>
              <mesh material={M.lens}>
                <circleGeometry args={[0.088, 20]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.01, 0.4]} material={M.black}>
            <boxGeometry args={[0.07, 0.022, 0.022]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.27, 0.01, 0.215]} rotation={[0, s * 0.286, 0]} material={M.black}>
              <boxGeometry args={[0.02, 0.022, 0.36]} />
            </mesh>
          ))}
        </group>
      );
    case 2: // okulary przeciwsłoneczne
      return (
        <group position={[0, 0.045, 0]}>
          {[-0.125, 0.125].map((x) => (
            <mesh key={x} position={[x, 0, 0.395]} rotation={[Math.PI / 2, 0, 0]} scale={[1.15, 1, 0.8]} material={M.shades}>
              <cylinderGeometry args={[0.1, 0.1, 0.025, 16]} />
            </mesh>
          ))}
          <mesh position={[0, 0.04, 0.4]} material={M.black}>
            <boxGeometry args={[0.5, 0.025, 0.02]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.27, 0.03, 0.215]} rotation={[0, s * 0.286, 0]} material={M.black}>
              <boxGeometry args={[0.02, 0.022, 0.36]} />
            </mesh>
          ))}
        </group>
      );
    case 3: // monokl
      return (
        <group position={[0.125, 0.045, 0.395]}>
          <mesh material={M.gold}>
            <torusGeometry args={[0.095, 0.014, 6, 20]} />
          </mesh>
          <mesh material={M.lens}>
            <circleGeometry args={[0.088, 20]} />
          </mesh>
          <mesh position={[0.07, -0.16, -0.03]} rotation={[0, 0, 0.35]} material={M.gold}>
            <cylinderGeometry args={[0.006, 0.006, 0.24, 4]} />
          </mesh>
        </group>
      );
    case 4: // okulary 3D
      return (
        <group position={[0, 0.045, 0.395]}>
          <mesh position={[-0.125, 0, 0]} material={M.lens3dRed}>
            <planeGeometry args={[0.17, 0.12]} />
          </mesh>
          <mesh position={[0.125, 0, 0]} material={M.lens3dBlue}>
            <planeGeometry args={[0.17, 0.12]} />
          </mesh>
          {[-0.125, 0.125].map((x) => (
            <group key={x} position={[x, 0, 0.002]}>
              <mesh position={[0, 0.065, 0]} material={M.white}><boxGeometry args={[0.19, 0.022, 0.02]} /></mesh>
              <mesh position={[0, -0.065, 0]} material={M.white}><boxGeometry args={[0.19, 0.022, 0.02]} /></mesh>
              <mesh position={[-0.093, 0, 0]} material={M.white}><boxGeometry args={[0.022, 0.15, 0.02]} /></mesh>
              <mesh position={[0.093, 0, 0]} material={M.white}><boxGeometry args={[0.022, 0.15, 0.02]} /></mesh>
            </group>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.27, -0.015, -0.18]} rotation={[0, s * 0.286, 0]} material={M.white}>
              <boxGeometry args={[0.02, 0.022, 0.36]} />
            </mesh>
          ))}
        </group>
      );
    case 5: // gogle narciarskie
      return (
        <group position={[0, 0.06, 0]}>
          <mesh material={M.black}>
            <cylinderGeometry args={[0.35, 0.35, 0.07, 22, 1, true]} />
          </mesh>
          <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]} scale={[0.95, 0.5, 0.55]} material={M.goggle}>
            <sphereGeometry args={[0.26, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0, 0.3]} scale={[0.95, 0.55, 1]} material={M.white}>
            <torusGeometry args={[0.26, 0.03, 6, 24]} />
          </mesh>
        </group>
      );
    case 6: // rumieńce
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.19, -0.06, 0.29]} rotation={[0, s * 0.55, 0]} material={M.blush}>
              <circleGeometry args={[0.06, 14]} />
            </mesh>
          ))}
        </group>
      );
    case 7: // maska ninja
      return (
        <group position={[0, 0.045, 0]}>
          <mesh material={M.black}>
            <cylinderGeometry args={[0.348, 0.348, 0.16, 20, 1, true]} />
          </mesh>
          <mesh position={[0.05, 0, -0.36]} rotation={[0.4, 0, 0.2]} material={M.black}>
            <boxGeometry args={[0.05, 0.22, 0.03]} />
          </mesh>
        </group>
      );
    case 8: // nos klauna
      return (
        <mesh position={[0, -0.04, 0.35]} material={M.red}>
          <sphereGeometry args={[0.075, 12, 10]} />
        </mesh>
      );
    case 9: // opaska na oko
      return (
        <group>
          <mesh position={[-0.125, 0.045, 0.375]} scale={[1, 0.9, 0.4]} material={M.black}>
            <sphereGeometry args={[0.1, 12, 8]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2 - 0.1, 0.35, 0]} material={M.black}>
            <torusGeometry args={[0.345, 0.014, 4, 24]} />
          </mesh>
        </group>
      );
    case 10: // maseczka
      return (
        <group>
          <mesh position={[0, -0.12, 0.285]} rotation={[-0.15, 0, 0]} scale={[1, 0.7, 0.45]} material={M.blue}>
            <sphereGeometry args={[0.21, 12, 8]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.26, -0.03, 0.12]} rotation={[0, s * 0.6, 0]} material={M.white}>
              <boxGeometry args={[0.01, 0.012, 0.3]} />
            </mesh>
          ))}
        </group>
      );
    case 11: // plaster
      return (
        <group position={[0.175, -0.05, 0.285]} rotation={[0.1, 0.55, 0.45]}>
          <mesh material={M.plaster}><boxGeometry args={[0.2, 0.06, 0.012]} /></mesh>
          <mesh position={[0, 0, 0.004]} material={M.cream}><boxGeometry args={[0.07, 0.05, 0.012]} /></mesh>
        </group>
      );
    case 12: // kocie wąsiki
      return (
        <group position={[0, -0.06, 0.33]}>
          <mesh position={[0, 0.01, 0.02]} material={M.pink} scale={[1.3, 0.8, 0.7]}>
            <sphereGeometry args={[0.035, 8, 6]} />
          </mesh>
          {[-1, 1].flatMap((s) =>
            [-0.05, 0, 0.05].map((a) => (
              <mesh key={`${s}${a}`} position={[s * 0.13, a * 0.6, -0.01]} rotation={[0, s * 0.35, (a * 4 + 0.05) * s]} material={M.black}>
                <boxGeometry args={[0.17, 0.007, 0.007]} />
              </mesh>
            )),
          )}
        </group>
      );
    case 13: // piegi
      return (
        <group>
          {[-1, 1].flatMap((s) =>
            [
              [0.15, -0.04],
              [0.2, -0.07],
              [0.12, -0.08],
              [0.18, -0.11],
            ].map(([x, y]) => {
              const z = Math.sqrt(Math.max(0, 0.343 * 0.343 - x * x - y * y));
              return (
                <mesh key={`${s}${x}${y}`} position={[s * x, y, z]} rotation={[0, s * Math.asin(x / 0.343), 0]} material={M.freckle}>
                  <circleGeometry args={[0.013, 8]} />
                </mesh>
              );
            }),
          )}
        </group>
      );
    default:
      return null;
  }
}

// ───────────────────────────── zarost ─────────────────────────────

function Mustache({ mat, curl, wide = 1 }: { mat: THREE.Material; curl?: boolean; wide?: number }) {
  return (
    <group position={[0, -0.09, 0.325]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.07 * wide, 0, 0]} rotation={[0, s * 0.3, s * 0.35]} scale={[1.6 * wide, 0.55, 0.6]} material={mat}>
            <sphereGeometry args={[0.055, 8, 6]} />
          </mesh>
          {curl && (
            <mesh position={[s * 0.165, 0.035, -0.035]} rotation={[0, s * 0.6, 0]} material={mat}>
              <torusGeometry args={[0.03, 0.012, 5, 10, Math.PI * 1.4]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function FullBeard({ mat, scale = 1 }: { mat: THREE.Material; scale?: number }) {
  return (
    <mesh position={[0, -0.18, 0.12]} scale={[1 * scale, 0.85 * scale, 0.85]} material={mat}>
      <sphereGeometry args={[0.26, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
    </mesh>
  );
}

function Goatee({ mat, len = 0.14 }: { mat: THREE.Material; len?: number }) {
  return (
    <mesh position={[0, -0.3 - len / 2 + 0.05, 0.24]} rotation={[Math.PI - 0.35, 0, 0]} material={mat}>
      <coneGeometry args={[0.055, len, 7]} />
    </mesh>
  );
}

/** Zarost — osobna kategoria (`BEARDS` w shared/outfits.ts). */
export function Beard({ kind }: { kind: number }) {
  const C = BEARD_COLORS;
  switch (kind) {
    case 1: // wąsy
      return <Mustache mat={C.dark} />;
    case 2: // broda
      return <FullBeard mat={C.dark} />;
    case 3: // wąsik
      return (
        <mesh position={[0, -0.085, 0.335]} rotation={[-0.25, 0, 0]} material={C.black}>
          <boxGeometry args={[0.1, 0.035, 0.03]} />
        </mesh>
      );
    case 4: // wąsy kierownica
      return <Mustache mat={C.black} curl wide={1.15} />;
    case 5: // kozia bródka
      return <Goatee mat={C.dark} />;
    case 6: // bokobrody
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.315, -0.04, 0.08]} rotation={[0, s * 0.25, 0]} material={C.dark}>
              <boxGeometry args={[0.05, 0.24, 0.13]} />
            </mesh>
          ))}
        </group>
      );
    case 7: // zarost (kilkudniowy)
      return (
        <mesh material={M.stubble}>
          <sphereGeometry args={[0.343, 18, 12, Math.PI / 2 - 1.25, 2.5, Math.PI * 0.56, Math.PI * 0.36]} />
        </mesh>
      );
    case 8: // broda drwala
      return (
        <group>
          <FullBeard mat={C.dark} scale={1.18} />
          <mesh position={[0, -0.36, 0.2]} scale={[1.2, 0.8, 0.8]} material={C.dark}>
            <sphereGeometry args={[0.14, 9, 7]} />
          </mesh>
          <Mustache mat={C.dark} wide={1.1} />
        </group>
      );
    case 9: // broda czarodzieja
      return (
        <group>
          <FullBeard mat={C.grey} />
          <mesh position={[0, -0.44, 0.31]} rotation={[Math.PI - 0.5, 0, 0]} material={C.grey}>
            <coneGeometry args={[0.17, 0.5, 9]} />
          </mesh>
          <Mustache mat={C.grey} wide={1.1} />
        </group>
      );
    case 10: // wąsy Fu Manchu
      return (
        <group>
          <Mustache mat={C.black} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, -0.22, 0.29]} rotation={[0.15, 0, s * 0.08]} material={C.black}>
              <cylinderGeometry args={[0.014, 0.006, 0.26, 5]} />
            </mesh>
          ))}
        </group>
      );
    case 11: // broda z wąsami
      return (
        <group>
          <FullBeard mat={C.dark} />
          <Mustache mat={C.dark} />
        </group>
      );
    case 12: // ruda broda
      return (
        <group>
          <FullBeard mat={C.ginger} scale={1.08} />
          <Mustache mat={C.ginger} />
        </group>
      );
    case 13: // siwa broda
      return (
        <group>
          <FullBeard mat={C.grey} />
          <Mustache mat={C.grey} />
        </group>
      );
    case 14: // broda kotwica
      return (
        <group>
          <Mustache mat={C.black} />
          <Goatee mat={C.black} len={0.1} />
          <mesh position={[0, -0.24, 0.12]} rotation={[0.35, 0, 0]} material={C.black}>
            <torusGeometry args={[0.2, 0.018, 4, 16, Math.PI]} />
          </mesh>
        </group>
      );
    case 15: // bródka pod wargą
      return (
        <mesh position={[0, -0.19, 0.3]} rotation={[-0.5, 0, 0]} material={C.black}>
          <boxGeometry args={[0.05, 0.06, 0.025]} />
        </mesh>
      );
    default:
      return null;
  }
}

// ───────────────────────────── oczy ─────────────────────────────

const shapeGeo = (build: (s: THREE.Shape) => void) => {
  if (typeof document === 'undefined') return null;
  const sh = new THREE.Shape();
  build(sh);
  return new THREE.ShapeGeometry(sh, 6);
};
let HEART: THREE.ShapeGeometry | null | undefined;
let STAR: THREE.ShapeGeometry | null | undefined;
function heartGeo() {
  if (HEART === undefined)
    HEART = shapeGeo((s) => {
      s.moveTo(0, -0.07);
      s.bezierCurveTo(-0.02, -0.04, -0.09, -0.01, -0.09, 0.03);
      s.bezierCurveTo(-0.09, 0.075, -0.035, 0.085, 0, 0.045);
      s.bezierCurveTo(0.035, 0.085, 0.09, 0.075, 0.09, 0.03);
      s.bezierCurveTo(0.09, -0.01, 0.02, -0.04, 0, -0.07);
    });
  return HEART!;
}
function starGeo() {
  if (STAR === undefined)
    STAR = shapeGeo((s) => {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.04 : 0.095;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    });
  return STAR!;
}

interface EyeOpts {
  /** przesunięcie źrenicy */
  px?: number;
  py?: number;
  pupil?: number;
  white?: number;
  /** powieka górna: kąt (0 = poziomo) i jak nisko (0 = brak, 1 = do połowy) */
  lid?: number;
  lidTilt?: number;
}

function Eye({ side, o, skin, pupilMat, whiteMat }: { side: number; o: EyeOpts; skin: THREE.Material; pupilMat: THREE.Material; whiteMat: THREE.Material }) {
  const w = o.white ?? 1;
  const pr = 0.042 * (o.pupil ?? 1);
  return (
    <group scale={w}>
      <mesh material={whiteMat}>
        <sphereGeometry args={[0.085, 12, 9]} />
      </mesh>
      <mesh position={[(o.px ?? 0) * side, -0.005 + (o.py ?? 0), 0.085 - pr + 0.017]} material={pupilMat}>
        <sphereGeometry args={[pr, 9, 7]} />
      </mesh>
      {o.lid !== undefined && (
        <group rotation={[0, 0, (o.lidTilt ?? 0) * side]}>
          {/* czasza kuli przycinająca górę oka: lid 0 = ledwo, 1 = zamknięte */}
          <mesh material={skin}>
            <sphereGeometry args={[0.093, 14, 8, 0, Math.PI * 2, 0, Math.acos(THREE.MathUtils.clamp((0.08 - o.lid * 0.15) / 0.093, -0.99, 0.99))]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Brows({ tilt = 0, y = 0.12, arch = false, uneven = 0 }: { tilt?: number; y?: number; arch?: boolean; uneven?: number }) {
  return (
    <group>
      {[-1, 1].map((s) => {
        const yy = 0.04 + y + (s === 1 ? uneven : 0);
        const z = Math.sqrt(Math.max(0, 0.343 * 0.343 - 0.0144 - yy * yy)) + 0.025;
        return (
        <group key={s} position={[s * 0.12, yy, z]} rotation={[-Math.asin(yy / 0.343), s * 0.36, s * tilt]}>
          {arch ? (
            <mesh rotation={[0, 0, 0]} material={M.brow}>
              <torusGeometry args={[0.065, 0.018, 4, 10, Math.PI]} />
            </mesh>
          ) : (
            <mesh material={M.brow}>
              <boxGeometry args={[0.15, 0.042, 0.045]} />
            </mesh>
          )}
        </group>
        );
      })}
    </group>
  );
}

/** Płaski kształt na powierzchni głowy w miejscu oka (łuk, serce, gwiazdka, X). */
function FlatEye({ side, children }: { side: number; children: ReactNode }) {
  return (
    <group position={[side * 0.12, 0.04, 0.33]} rotation={[0, side * 0.36, 0]}>
      {children}
    </group>
  );
}

function Arc({ mat, down }: { mat: THREE.Material; down?: boolean }) {
  return (
    <mesh rotation={[0, 0, down ? Math.PI : 0]} position={[0, down ? 0.02 : -0.02, 0]} material={mat}>
      <torusGeometry args={[0.06, 0.016, 5, 12, Math.PI]} />
    </mesh>
  );
}

/**
 * Oczy postaci (`EYES` w shared/outfits.ts). `skin` = materiał ciała (powieki),
 * `white`/`pupil` = materiały oka postaci.
 */
export function Eyes({ kind, skin, white, pupil }: { kind: number; skin: THREE.Material; white: THREE.Material; pupil: THREE.Material }) {
  const pair = (o: EyeOpts | ((side: number) => EyeOpts)) =>
    [-1, 1].map((s) => (
      <group key={s} position={[s * 0.12, 0.04, 0.27]}>
        <Eye side={s} o={typeof o === 'function' ? o(s) : o} skin={skin} pupilMat={pupil} whiteMat={white} />
      </group>
    ));
  switch (kind) {
    case 1: // zez
      return <>{pair({ px: -0.038, pupil: 1.05 })}</>;
    case 2: // wkurzone
      return (
        <>
          {pair({ pupil: 0.8, lid: 0.35, lidTilt: 0.42 })}
          <Brows tilt={0.5} y={0.1} />
        </>
      );
    case 3: // smutne
      return (
        <>
          {pair({ py: -0.02, lid: 0.25, lidTilt: -0.35 })}
          <Brows tilt={-0.4} y={0.13} />
        </>
      );
    case 4: // zdziwione
      return (
        <>
          {pair({ white: 1.2, pupil: 0.6 })}
          <Brows y={0.105} arch />
        </>
      );
    case 5: // senne
      return <>{pair({ py: -0.02, lid: 0.85 })}</>;
    case 6: // mrugnięcie
      return (
        <>
          <group position={[-0.12, 0.04, 0.27]}>
            <Eye side={-1} o={{}} skin={skin} pupilMat={pupil} whiteMat={white} />
          </group>
          <FlatEye side={1}>
            <mesh rotation={[0, 0, 0.12]} material={pupil}>
              <boxGeometry args={[0.13, 0.026, 0.02]} />
            </mesh>
          </FlatEye>
        </>
      );
    case 7: // szczęśliwe ^^
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatEye key={s} side={s}>
              <Arc mat={pupil} />
            </FlatEye>
          ))}
        </>
      );
    case 8: // zakochane
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatEye key={s} side={s}>
              <mesh geometry={heartGeo() ?? undefined} scale={1.15} material={M.heart} />
            </FlatEye>
          ))}
        </>
      );
    case 9: // gwiazdki
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatEye key={s} side={s}>
              <mesh geometry={starGeo() ?? undefined} material={M.starEye} />
            </FlatEye>
          ))}
        </>
      );
    case 10: // krzyżyki
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatEye key={s} side={s}>
              {[0.785, -0.785].map((r) => (
                <mesh key={r} rotation={[0, 0, r]} material={pupil}>
                  <boxGeometry args={[0.15, 0.028, 0.02]} />
                </mesh>
              ))}
            </FlatEye>
          ))}
        </>
      );
    case 11: // cyklop
      return (
        <>
          <group position={[0, 0.06, 0.25]} scale={1.55}>
            <Eye side={1} o={{ pupil: 1.1 }} skin={skin} pupilMat={pupil} whiteMat={white} />
          </group>
          <mesh position={[0, 0.25, 0.27]} rotation={[-0.6, 0, 0]} material={M.brow}>
            <boxGeometry args={[0.26, 0.035, 0.04]} />
          </mesh>
        </>
      );
    case 12: // podejrzliwe
      return (
        <>
          {pair((s) => ({ px: 0.035 * s, lid: 0.6 }))}
          <Brows y={0.1} uneven={0.06} tilt={0.12} />
        </>
      );
    case 13: // szalone
      return (
        <>
          <group position={[-0.125, 0.06, 0.26]}>
            <Eye side={-1} o={{ white: 1.3, pupil: 0.45, px: 0.02, py: 0.02 }} skin={skin} pupilMat={pupil} whiteMat={white} />
          </group>
          <group position={[0.12, 0.02, 0.28]}>
            <Eye side={1} o={{ white: 0.8, pupil: 1.2, px: 0.025, py: -0.02 }} skin={skin} pupilMat={pupil} whiteMat={white} />
          </group>
          <Brows y={0.15} tilt={-0.3} uneven={-0.06} />
        </>
      );
    case 14: // kropki
      return (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.11, 0.03, 0.315]} material={pupil}>
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
          ))}
        </>
      );
    case 15: // świecące
      return (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 0.04, 0.29]} scale={[1.1, 0.75, 0.8]} material={M.glowEye}>
              <sphereGeometry args={[0.08, 12, 9]} />
            </mesh>
          ))}
          <Brows tilt={0.4} y={0.1} />
        </>
      );
    default:
      return <>{pair({})}</>;
  }
}

// ───────────────────────────── koszulki ─────────────────────────────

/** Rozkład tekstury tułowia: góra płótna = ramiona, środek płótna (x=128) = przód postaci. */
const TEX = 256;
/** Linia pasa (ułamek wysokości płótna od góry) — niżej spodnie. */
const WAIST = 0.8;
const FRONT = TEX / 2;

interface ShirtSpec {
  base: string;
  /** Kolor rękawów (długi rękaw) albo null (krótki). */
  sleeves: string | null;
  draw?: (g: CanvasRenderingContext2D, accent: string) => void;
}

const stripesH = (g: CanvasRenderingContext2D, colors: string[], top = 0, bottom = TEX * WAIST) => {
  const h = (bottom - top) / colors.length;
  colors.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(0, top + i * h, TEX, h + 1);
  });
};
const vFront = (g: CanvasRenderingContext2D, color: string, width: number, depth: number) => {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(FRONT - width, 0);
  g.lineTo(FRONT + width, 0);
  g.lineTo(FRONT, depth);
  g.closePath();
  g.fill();
};
const tie = (g: CanvasRenderingContext2D, color: string) => {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(FRONT - 7, 30);
  g.lineTo(FRONT + 7, 30);
  g.lineTo(FRONT + 11, 120);
  g.lineTo(FRONT, 138);
  g.lineTo(FRONT - 11, 120);
  g.closePath();
  g.fill();
  g.fillRect(FRONT - 9, 22, 18, 12);
};
const buttons = (g: CanvasRenderingContext2D, color: string, x = FRONT, from = 50, n = 5, step = 28) => {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.arc(x, from + i * step, 4, 0, Math.PI * 2);
    g.fill();
  }
};
const star = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
};
const text = (g: CanvasRenderingContext2D, t: string, x: number, y: number, size: number, color: string) => {
  g.fillStyle = color;
  g.font = `800 ${size}px "Space Grotesk Variable", "Inter Variable", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(t, x, y);
};
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export const SHIRT_SPECS: Record<number, ShirtSpec> = {
  1: { base: '#f4f5fb', sleeves: null },
  2: { base: '#f4f5fb', sleeves: null, draw: (g, a) => stripesH(g, Array.from({ length: 8 }, (_, i) => (i % 2 ? a : '#f4f5fb'))) },
  3: {
    base: '#cfe3ff',
    sleeves: '#cfe3ff',
    draw: (g) => {
      vFront(g, '#ffffff', 18, 26);
      tie(g, '#e03131');
      buttons(g, '#8aa4cc', FRONT + 20, 60, 5, 24);
    },
  },
  4: {
    base: '#25305e',
    sleeves: '#25305e',
    draw: (g) => {
      vFront(g, '#ffffff', 26, 110);
      tie(g, '#c92a2a');
      buttons(g, '#c9a227', FRONT + 30, 130, 2, 30);
    },
  },
  5: {
    base: '#121218',
    sleeves: '#121218',
    draw: (g) => {
      vFront(g, '#ffffff', 26, 110);
      g.fillStyle = '#121218';
      g.beginPath();
      g.moveTo(FRONT, 30);
      g.lineTo(FRONT - 24, 18);
      g.lineTo(FRONT - 24, 44);
      g.closePath();
      g.moveTo(FRONT, 30);
      g.lineTo(FRONT + 24, 18);
      g.lineTo(FRONT + 24, 44);
      g.closePath();
      g.fill();
      buttons(g, '#121218', FRONT, 60, 3, 18);
    },
  },
  6: {
    base: '',
    sleeves: '',
    draw: (g, a) => {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(FRONT - 40, 120, 80, 50);
      g.fillStyle = '#f4f5fb';
      g.fillRect(FRONT - 12, 20, 3, 60);
      g.fillRect(FRONT + 9, 20, 3, 60);
      void a;
    },
  },
  7: {
    base: '#c92a2a',
    sleeves: '#c92a2a',
    draw: (g) => {
      g.fillStyle = '#f4f5fb';
      for (const y of [40, 150]) for (let x = 0; x < TEX; x += 16) g.fillRect(x, y + ((x / 16) % 2) * 6, 10, 8);
      for (let x = 16; x < TEX; x += 48) {
        g.fillStyle = '#2f9e44';
        g.beginPath();
        g.moveTo(x, 75);
        g.lineTo(x - 16, 125);
        g.lineTo(x + 16, 125);
        g.closePath();
        g.fill();
      }
      for (let x = 40; x < TEX; x += 48) star(g, x, 100, 8, '#ffd43b');
    },
  },
  8: {
    base: '#f4f5fb',
    sleeves: null,
    draw: (g) => {
      g.fillStyle = '#e03131';
      g.fillRect(0, TEX * WAIST * 0.55, TEX, TEX * WAIST * 0.45);
      text(g, '10', FRONT, 80, 52, '#e03131');
      text(g, '10', 0, 80, 52, '#e03131');
      text(g, '10', TEX, 80, 52, '#e03131');
    },
  },
  9: {
    base: '#ff922b',
    sleeves: null,
    draw: (g) => {
      const r = rng(7);
      for (let i = 0; i < 26; i++) {
        const x = r() * TEX;
        const y = r() * TEX * WAIST;
        g.fillStyle = i % 3 ? '#fff3bf' : '#2f9e44';
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          g.beginPath();
          g.arc(x + Math.cos(ang) * 7, y + Math.sin(ang) * 7, 6, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#e8590c';
        g.beginPath();
        g.arc(x, y, 4, 0, Math.PI * 2);
        g.fill();
      }
    },
  },
  10: {
    base: '#f8f9fa',
    sleeves: '#f8f9fa',
    draw: (g) => {
      g.fillStyle = '#dee2e6';
      g.fillRect(FRONT - 2, 0, 4, TEX * WAIST);
      g.strokeStyle = '#495057';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(FRONT - 26, 10);
      g.quadraticCurveTo(FRONT - 34, 80, FRONT, 95);
      g.quadraticCurveTo(FRONT + 34, 80, FRONT + 26, 10);
      g.stroke();
      g.fillStyle = '#868e96';
      g.beginPath();
      g.arc(FRONT, 98, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#4dabf7';
      g.strokeRect(FRONT + 18, 120, 22, 18);
    },
  },
  11: {
    base: '#ffffff',
    sleeves: '#ffffff',
    draw: (g) => {
      buttons(g, '#adb5bd', FRONT - 16, 40, 5, 26);
      buttons(g, '#adb5bd', FRONT + 16, 40, 5, 26);
      g.fillStyle = '#e9ecef';
      g.fillRect(0, 0, TEX, 14);
    },
  },
  12: {
    base: '#1d1d23',
    sleeves: '#1d1d23',
    draw: (g) => {
      g.strokeStyle = '#adb5bd';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(FRONT + 10, 10);
      g.lineTo(FRONT - 6, TEX * WAIST);
      g.stroke();
      vFront(g, '#2e2e38', 30, 50);
      g.fillStyle = '#adb5bd';
      g.fillRect(FRONT + 24, 120, 14, 3);
    },
  },
  13: {
    base: '#f4f5fb',
    sleeves: null,
    draw: (g) => {
      g.fillStyle = '#3b5bdb';
      g.fillRect(FRONT - 42, 70, 84, TEX * WAIST - 70);
      g.fillRect(0, 140, TEX, TEX * WAIST - 140);
      g.fillRect(FRONT - 40, 0, 12, 80);
      g.fillRect(FRONT + 28, 0, 12, 80);
      buttons(g, '#ffd43b', FRONT - 34, 78, 1);
      buttons(g, '#ffd43b', FRONT + 34, 78, 1);
      g.fillStyle = '#364fc7';
      g.fillRect(FRONT - 18, 95, 36, 26);
    },
  },
  14: {
    base: '#f4f5fb',
    sleeves: null,
    draw: (g) => {
      g.fillStyle = '#e03131';
      g.beginPath();
      g.moveTo(FRONT, 125);
      g.bezierCurveTo(FRONT - 50, 90, FRONT - 30, 45, FRONT, 70);
      g.bezierCurveTo(FRONT + 30, 45, FRONT + 50, 90, FRONT, 125);
      g.fill();
    },
  },
  15: { base: '#212529', sleeves: null, draw: (g) => star(g, FRONT, 88, 38, '#ffd43b') },
  16: {
    base: '#c0eb3a',
    sleeves: null,
    draw: (g) => {
      g.fillStyle = '#ced4da';
      g.fillRect(0, 95, TEX, 14);
      g.fillRect(0, 140, TEX, 14);
      g.fillRect(FRONT - 40, 0, 12, 95);
      g.fillRect(FRONT + 28, 0, 12, 95);
    },
  },
  17: {
    base: '#1c7ed6',
    sleeves: '#1c7ed6',
    draw: (g) => {
      g.fillStyle = '#ffd43b';
      g.beginPath();
      g.moveTo(FRONT, 40);
      g.lineTo(FRONT + 40, 85);
      g.lineTo(FRONT, 130);
      g.lineTo(FRONT - 40, 85);
      g.closePath();
      g.fill();
      text(g, 'S', FRONT, 86, 46, '#e03131');
      g.fillStyle = '#e03131';
      g.fillRect(0, TEX * WAIST - 16, TEX, 16);
    },
  },
  18: {
    base: '#f4f5fb',
    sleeves: null,
    draw: (g) => {
      stripesH(g, Array.from({ length: 10 }, (_, i) => (i % 2 ? '#25305e' : '#f4f5fb')), 40);
      vFront(g, '#25305e', 40, 40);
      tie(g, '#e03131');
    },
  },
  19: {
    base: '#e9ecef',
    sleeves: '#e9ecef',
    draw: (g) => {
      g.fillStyle = '#1c7ed6';
      g.beginPath();
      g.arc(FRONT - 26, 60, 16, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e03131';
      g.fillRect(FRONT + 12, 48, 28, 18);
      g.fillStyle = '#adb5bd';
      g.fillRect(0, TEX * WAIST - 26, TEX, 12);
      g.fillStyle = '#495057';
      g.fillRect(FRONT - 22, 95, 44, 30);
      buttons(g, '#4dabf7', FRONT - 10, 110, 1);
      buttons(g, '#ffd43b', FRONT + 10, 110, 1);
    },
  },
  20: {
    base: '#a5d8ff',
    sleeves: '#a5d8ff',
    draw: (g) => {
      g.fillStyle = '#ffffff';
      for (let y = 10; y < TEX * WAIST; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < TEX; x += 22) {
        g.beginPath();
        g.arc(x, y, 4.5, 0, Math.PI * 2);
        g.fill();
      }
      buttons(g, '#4c6ef5', FRONT, 30, 6, 24);
    },
  },
  21: {
    base: '#c92a2a',
    sleeves: '#c92a2a',
    draw: (g) => {
      g.fillStyle = 'rgba(20,20,26,0.55)';
      for (let x = 0; x < TEX; x += 32) g.fillRect(x, 0, 14, TEX * WAIST);
      for (let y = 0; y < TEX * WAIST; y += 32) g.fillRect(0, y, TEX, 14);
      buttons(g, '#f8f9fa', FRONT, 30, 6, 26);
    },
  },
  22: {
    base: '#15151c',
    sleeves: null,
    draw: (g) => {
      text(g, 'IMPO', FRONT, 70, 30, '#ffffff');
      text(g, 'STOR', FRONT, 102, 30, '#ff4d6d');
    },
  },
  23: { base: '#ffffff', sleeves: null, draw: (g) => stripesH(g, ['#e03131', '#ff922b', '#ffd43b', '#51cf66', '#4dabf7', '#7048e8']) },
  24: {
    // dres z lampasami
    base: '#1c2b6b',
    sleeves: '#1c2b6b',
    draw: (g) => {
      g.fillStyle = '#ffffff';
      for (const x of [FRONT - 66, FRONT + 66]) for (const d of [-9, 0, 9]) g.fillRect(x + d - 2, 0, 4, TEX * WAIST);
      g.fillRect(FRONT - 2, 8, 4, 150);
      g.fillStyle = '#d0d4e4';
      g.fillRect(FRONT - 3, 8, 6, 8);
    },
  },
  25: {
    // moro
    base: '#5b6b3a',
    sleeves: '#5b6b3a',
    draw: (g) => {
      const r = rng(77);
      for (const c of ['#3d4a26', '#8a8455', '#2a2f1d', '#6f7d45']) {
        g.fillStyle = c;
        for (let i = 0; i < 14; i++) {
          g.beginPath();
          g.ellipse(r() * TEX, r() * TEX * WAIST, 10 + r() * 18, 6 + r() * 10, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    },
  },
  26: {
    // golf
    base: '#2b2b33',
    sleeves: '#2b2b33',
    draw: (g) => {
      g.fillStyle = '#3a3a45';
      for (let x = 0; x < TEX; x += 8) g.fillRect(x, 0, 3, 26);
    },
  },
  27: {
    // bluza uczelniana
    base: '#8b1e2d',
    sleeves: '#f1e7d0',
    draw: (g) => {
      text(g, 'U', FRONT, 80, 64, '#f1e7d0');
      g.fillStyle = '#f1e7d0';
      g.fillRect(0, TEX * WAIST - 14, TEX, 8);
    },
  },
  28: {
    // koszulka hokejowa
    base: '#c92a2a',
    sleeves: '#c92a2a',
    draw: (g) => {
      stripesH(g, ['#ffffff', '#15151c', '#ffffff'], 140, 182);
      text(g, '19', FRONT, 82, 46, '#ffffff');
      g.fillStyle = '#ffffff';
      g.fillRect(FRONT - 20, 8, 40, 8);
    },
  },
  29: {
    // kombinezon mechanika
    base: '#3b5bdb',
    sleeves: '#3b5bdb',
    draw: (g) => {
      g.fillStyle = '#2f4ab8';
      g.fillRect(FRONT - 2, 10, 4, TEX * WAIST);
      g.fillStyle = '#ffffff';
      g.fillRect(FRONT + 16, 46, 36, 18);
      text(g, 'MECH', FRONT + 34, 56, 11, '#3b5bdb');
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.beginPath();
      g.ellipse(FRONT - 30, 120, 12, 6, 0.4, 0, Math.PI * 2);
      g.fill();
    },
  },
  30: {
    // strój więzienny
    base: '#f4f5fb',
    sleeves: null,
    draw: (g) => {
      stripesH(g, Array.from({ length: 10 }, (_, i) => (i % 2 ? '#15151c' : '#f4f5fb')));
      g.fillStyle = '#f4f5fb';
      g.fillRect(FRONT - 30, 54, 60, 24);
      text(g, '0451', FRONT, 66, 18, '#15151c');
    },
  },
  31: {
    // strój pszczółki
    base: '#ffd43b',
    sleeves: null,
    draw: (g) => stripesH(g, Array.from({ length: 6 }, (_, i) => (i % 2 ? '#15151c' : '#ffd43b'))),
  },
  32: {
    // kurtka puchowa
    base: '#ff6b35',
    sleeves: '#ff6b35',
    draw: (g) => {
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (let y = 30; y < TEX * WAIST; y += 30) g.fillRect(0, y, TEX, 3);
      g.fillStyle = 'rgba(255,255,255,.18)';
      for (let y = 36; y < TEX * WAIST; y += 30) g.fillRect(0, y, TEX, 6);
      g.fillStyle = '#c0c0c8';
      g.fillRect(FRONT - 2, 6, 4, TEX * WAIST);
    },
  },
  33: {
    // tie-dye
    base: '#ffffff',
    sleeves: null,
    draw: (g) => {
      const cols = ['#ff4d6d', '#ffd43b', '#51cf66', '#4dabf7', '#9775fa'];
      for (let i = 0, r = 200; r > 0; r -= 16, i++) {
        g.fillStyle = cols[i % cols.length];
        g.beginPath();
        g.arc(FRONT, 100, r, 0, Math.PI * 2);
        g.fill();
      }
    },
  },
  34: {
    // mundur policjanta
    base: '#1e3a8a',
    sleeves: '#1e3a8a',
    draw: (g) => {
      vFront(g, '#14275e', 18, 30);
      buttons(g, '#c9a227', FRONT, 50, 5, 24);
      g.fillStyle = '#c9a227';
      g.beginPath();
      g.moveTo(FRONT - 34, 50);
      g.lineTo(FRONT - 22, 46);
      g.lineTo(FRONT - 22, 68);
      g.lineTo(FRONT - 34, 72);
      g.closePath();
      g.fill();
      g.fillStyle = '#14275e';
      g.fillRect(0, TEX * WAIST - 16, TEX, 12);
    },
  },
  35: {
    // kamizelka szeryfa
    base: '#c8a272',
    sleeves: '#e9dcc4',
    draw: (g) => {
      vFront(g, '#e9dcc4', 22, 150);
      star(g, FRONT - 38, 70, 16, '#ffcf3f');
      g.fillStyle = '#8b5a2b';
      g.fillRect(0, TEX * WAIST - 16, TEX, 12);
      g.fillStyle = '#ffcf3f';
      g.fillRect(FRONT - 10, TEX * WAIST - 18, 20, 16);
    },
  },
  36: {
    // koszulka pikselowa
    base: '#15151c',
    sleeves: null,
    draw: (g) => {
      const px = 10;
      const sprite = ['..X...X..', '...X.X...', '..XXXXX..', '.XX.X.XX.', 'XXXXXXXXX', 'X.XXXXX.X', 'X.X...X.X', '...X.X...'];
      g.fillStyle = '#51cf66';
      sprite.forEach((row, y) => [...row].forEach((c, x) => c === 'X' && g.fillRect(FRONT - 45 + x * px, 40 + y * px, px, px)));
    },
  },
  37: {
    // sweter w romby
    base: '#2f9e44',
    sleeves: '#2f9e44',
    draw: (g) => {
      const s2 = 24;
      for (let y = 20; y < TEX * WAIST - 10; y += s2 * 1.4) {
        for (let x = 0; x < TEX; x += s2) {
          g.fillStyle = (x / s2 + y / (s2 * 1.4)) % 2 < 1 ? '#ffd43b' : '#1b6e30';
          g.beginPath();
          g.moveTo(x + s2 / 2, y);
          g.lineTo(x + s2, y + s2 * 0.7);
          g.lineTo(x + s2 / 2, y + s2 * 1.4);
          g.lineTo(x, y + s2 * 0.7);
          g.closePath();
          g.fill();
        }
      }
      g.fillStyle = '#1b6e30';
      g.fillRect(0, 0, TEX, 16);
    },
  },
};

/**
 * Tekstura tułowia z koszulką. `body` = kolor postaci (widoczny przy szyi i jako koszulka „w kolorze gracza”),
 * spodnie są rysowane pod linią pasa.
 */
export function makeShirtTexture(kind: number, body: string): THREE.CanvasTexture | null {
  const spec = SHIRT_SPECS[kind];
  if (!spec || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d')!;
  const accent = new THREE.Color(body).offsetHSL(0, 0, -0.12).getStyle();
  g.fillStyle = spec.base || accent; // pusta wartość = koszulka w kolorze gracza (np. bluza)
  g.fillRect(0, 0, TEX, TEX * WAIST);
  spec.draw?.(g, accent);
  // wycięcie przy szyi w kolorze postaci
  g.fillStyle = body;
  g.fillRect(0, 0, TEX, 6);
  // spodnie i pasek
  g.fillStyle = '#2c3a63';
  g.fillRect(0, TEX * WAIST, TEX, TEX * (1 - WAIST));
  g.fillStyle = '#1a2240';
  g.fillRect(0, TEX * WAIST, TEX, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Kolor rękawów dla koszulki z długim rękawem (null = ręce w kolorze postaci). */
export function sleeveColor(kind: number, body: string): string | null {
  const spec = SHIRT_SPECS[kind];
  if (!spec || spec.sleeves === null) return null;
  return spec.sleeves || new THREE.Color(body).offsetHSL(0, 0, -0.12).getStyle();
}

/** Tułów z mapowaniem UV liniowym po wysokości (wzory koszulek się nie spłaszczają). */
export function useTorsoGeometry(radius: number, length: number, capSeg: number, radSeg: number) {
  return useMemo(() => {
    const geo = new THREE.CapsuleGeometry(radius, length, capSeg, radSeg);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const half = radius + length / 2;
    for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) + half) / (2 * half));
    uv.needsUpdate = true;
    return geo;
  }, [radius, length, capSeg, radSeg]);
}

/** Elementy 3D koszulek: kaptur bluzy, peleryna superbohatera. */
export function ShirtExtras({ kind, accent }: { kind: number; accent: THREE.Material }) {
  if (kind === 6)
    return (
      <mesh position={[0, 1.36, -0.2]} rotation={[-0.5, 0, 0]} material={accent}>
        <torusGeometry args={[0.24, 0.09, 6, 14, Math.PI]} />
      </mesh>
    );
  if (kind === 26)
    return (
      <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.golf}>
        <torusGeometry args={[0.19, 0.07, 6, 16]} />
      </mesh>
    );
  if (kind === 31)
    return (
      <group position={[0, 0.98, -0.32]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, 0.08, 0]} rotation={[0.2, s * 0.5, s * -0.5]} scale={[1, 0.6, 0.12]} material={M.wing}>
            <sphereGeometry args={[0.22, 10, 8]} />
          </mesh>
        ))}
      </group>
    );
  if (kind === 32)
    return (
      <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.puffer}>
        <torusGeometry args={[0.2, 0.075, 6, 16]} />
      </mesh>
    );
  if (kind === 17)
    return (
      <mesh position={[0, 0.82, -0.36]} rotation={[0.14, 0, 0]} material={M.red}>
        <boxGeometry args={[0.66, 0.92, 0.02]} />
      </mesh>
    );
  return null;
}
