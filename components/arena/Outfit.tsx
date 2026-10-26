'use client';

/**
 * Stroje postaci: nakrycia głowy (HATS), dodatki na twarz (FACES) i koszulki (SHIRTS).
 * Wszystko zbudowane z prostych brył Three.js, a koszulki to tekstury rysowane w <canvas>
 * — bez wczytywania plików z zewnątrz. Numery zgodne z listami w shared/outfits.ts.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true, ...extra });

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
};

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
    case 4: // wąsy
      return (
        <group position={[0, -0.09, 0.325]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.07, 0, 0]} rotation={[0, 0, s * 0.35]} scale={[1.6, 0.55, 0.6]} material={M.darkBrown}>
              <sphereGeometry args={[0.055, 8, 6]} />
            </mesh>
          ))}
        </group>
      );
    case 5: // broda
      return (
        <mesh position={[0, -0.18, 0.12]} scale={[1, 0.85, 0.85]} material={M.darkBrown}>
          <sphereGeometry args={[0.26, 12, 8, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
        </mesh>
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
    default:
      return null;
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
  if (kind === 17)
    return (
      <mesh position={[0, 0.82, -0.36]} rotation={[0.14, 0, 0]} material={M.red}>
        <boxGeometry args={[0.66, 0.92, 0.02]} />
      </mesh>
    );
  return null;
}
