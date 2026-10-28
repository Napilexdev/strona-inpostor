'use client';

/**
 * Dodatkowy zarost (indeksy 16–65 w `BEARDS`): kształt × kolor.
 * Usta postaci: y ≈ −0.15, przód twarzy z ≈ 0.3; broda schodzi do y ≈ −0.42.
 */
import * as THREE from 'three';
import { X, col } from './mats';

type Shape =
  | 'pencil' | 'walrus' | 'horseshoe' | 'dali' | 'chevron' | 'chinstrap' | 'mutton' | 'longGoatee' | 'viking' | 'beads'
  | 'santa' | 'neck' | 'short' | 'forked' | 'stubbleHeavy' | 'stubbleLight' | 'mustacheSoul' | 'imperial' | 'mustache' | 'full'
  | 'fullMustache' | 'goatee' | 'lumber' | 'handlebar' | 'fumanchu' | 'wizard' | 'bow' | 'crumbs' | 'hipster' | 'braids' | 'milk';

const C = {
  dark: col('#4a2f19'),
  black: col('#1b1a1f'),
  blond: col('#e0b85a'),
  ginger: col('#c4561b'),
  grey: col('#d9d9de'),
  white: col('#f7f7fa', { roughness: 0.9 }),
  pink: col('#ff7ec4'),
  blue: col('#3b82f6'),
  green: col('#2fb35a'),
  purple: col('#8b5cf6'),
  gold: X.gold,
  silver: X.silver,
  neon: X.glowCyan,
  ice: X.ice,
  fire: X.glowOrange,
};
type ColorKey = keyof typeof C | 'accent';

const TABLE: Record<number, [Shape, ColorKey]> = {
  16: ['pencil', 'black'],
  17: ['walrus', 'dark'],
  18: ['horseshoe', 'dark'],
  19: ['dali', 'black'],
  20: ['chevron', 'dark'],
  21: ['chinstrap', 'black'],
  22: ['mutton', 'dark'],
  23: ['longGoatee', 'dark'],
  24: ['viking', 'ginger'],
  25: ['beads', 'dark'],
  26: ['santa', 'white'],
  27: ['neck', 'dark'],
  28: ['short', 'black'],
  29: ['forked', 'dark'],
  30: ['stubbleHeavy', 'black'],
  31: ['stubbleLight', 'black'],
  32: ['mustacheSoul', 'dark'],
  33: ['imperial', 'black'],
  34: ['mustache', 'blond'],
  35: ['fullMustache', 'blond'],
  36: ['goatee', 'blond'],
  37: ['goatee', 'ginger'],
  38: ['mustache', 'ginger'],
  39: ['lumber', 'ginger'],
  40: ['mustache', 'grey'],
  41: ['goatee', 'grey'],
  42: ['walrus', 'grey'],
  43: ['full', 'black'],
  44: ['lumber', 'black'],
  45: ['fullMustache', 'black'],
  46: ['mustache', 'pink'],
  47: ['fullMustache', 'pink'],
  48: ['fullMustache', 'blue'],
  49: ['handlebar', 'blue'],
  50: ['fullMustache', 'green'],
  51: ['goatee', 'green'],
  52: ['wizard', 'purple'],
  53: ['fumanchu', 'purple'],
  54: ['fullMustache', 'gold'],
  55: ['fullMustache', 'silver'],
  56: ['fullMustache', 'accent'],
  57: ['mustache', 'accent'],
  58: ['bow', 'dark'],
  59: ['crumbs', 'dark'],
  60: ['hipster', 'dark'],
  61: ['fullMustache', 'neon'],
  62: ['fullMustache', 'ice'],
  63: ['fullMustache', 'fire'],
  64: ['braids', 'dark'],
  65: ['milk', 'white'],
};

function Mustache({ m, wide = 1, droop = 0, thick = 1 }: { m: THREE.Material; wide?: number; droop?: number; thick?: number }) {
  return (
    <group position={[0, -0.09 - droop * 0.03, 0.325]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07 * wide, -droop * 0.02, 0]} rotation={[0, s * 0.3, s * (0.35 + droop * 0.4)]} scale={[1.6 * wide, 0.55 * thick, 0.6]} material={m}>
          <sphereGeometry args={[0.055, 12, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function Curls({ m, up = false, y = -0.075 }: { m: THREE.Material; up?: boolean; y?: number }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.165, y + (up ? 0.02 : 0), 0.29]} rotation={[0, s * 0.6, up ? s * 0.6 : 0]} material={m}>
          <torusGeometry args={[0.03, 0.012, 6, 12, Math.PI * 1.4]} />
        </mesh>
      ))}
    </>
  );
}

function Full({ m, sx = 1, sy = 1 }: { m: THREE.Material; sx?: number; sy?: number }) {
  return (
    <mesh position={[0, -0.18, 0.12]} scale={[sx, 0.85 * sy, 0.85]} material={m}>
      <sphereGeometry args={[0.26, 18, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
    </mesh>
  );
}

function Goatee({ m, len = 0.14, r = 0.055 }: { m: THREE.Material; len?: number; r?: number }) {
  return (
    <mesh position={[0, -0.3 - len / 2 + 0.05, 0.24]} rotation={[Math.PI - 0.35, 0, 0]} material={m}>
      <coneGeometry args={[r, len, 10]} />
    </mesh>
  );
}

function Stubble({ opacity }: { opacity: number }) {
  return (
    <mesh>
      <sphereGeometry args={[0.343, 22, 14, Math.PI / 2 - 1.25, 2.5, Math.PI * 0.56, Math.PI * 0.36]} />
      <meshStandardMaterial color="#2b2420" transparent opacity={opacity} roughness={1} depthWrite={false} />
    </mesh>
  );
}

function Braid({ m, x = 0, z = 0.26, len = 0.3, y = -0.36 }: { m: THREE.Material; x?: number; z?: number; len?: number; y?: number }) {
  const n = Math.round(len / 0.06);
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(i % 2 ? 0.012 : -0.012), -i * 0.055, 0]} material={m}>
          <sphereGeometry args={[0.04 - i * 0.002, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function Bow() {
  return (
    <group position={[0, -0.38, 0.26]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.045, 0, 0]} rotation={[0, 0, s * Math.PI / 2]} material={X.hotPink}>
          <coneGeometry args={[0.035, 0.08, 4]} />
        </mesh>
      ))}
      <mesh material={X.hotPink}>
        <sphereGeometry args={[0.02, 6, 5]} />
      </mesh>
    </group>
  );
}

export function BeardMore({ kind, accent }: { kind: number; accent: THREE.Material }) {
  const row = TABLE[kind];
  if (!row) return null;
  const [shape, ck] = row;
  const m = ck === 'accent' ? accent : C[ck];
  switch (shape) {
    case 'pencil':
      return (
        <mesh position={[0, -0.085, 0.335]} rotation={[-0.25, 0, 0]} material={m}>
          <boxGeometry args={[0.16, 0.012, 0.02]} />
        </mesh>
      );
    case 'walrus':
      return (
        <group>
          <Mustache m={m} wide={1.25} droop={1} thick={1.5} />
        </group>
      );
    case 'horseshoe':
      return (
        <group>
          <Mustache m={m} wide={1.1} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.115, -0.17, 0.295]} rotation={[0.3, 0, 0]} material={m}>
              <boxGeometry args={[0.03, 0.15, 0.03]} />
            </mesh>
          ))}
        </group>
      );
    case 'dali':
      return (
        <group position={[0, -0.085, 0.335]}>
          <mesh material={m}>
            <boxGeometry args={[0.08, 0.018, 0.02]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.075, 0.06, -0.01]} rotation={[0, 0, -s * 0.35]} material={m}>
              <cylinderGeometry args={[0.004, 0.009, 0.14, 5]} />
            </mesh>
          ))}
        </group>
      );
    case 'chevron':
      return (
        <mesh position={[0, -0.095, 0.325]} rotation={[-0.25, 0, 0]} material={m}>
          <cylinderGeometry args={[0.07, 0.1, 0.05, 4, 1, false, Math.PI / 4]} />
        </mesh>
      );
    case 'chinstrap':
      return (
        <mesh material={m}>
          <sphereGeometry args={[0.348, 26, 6, Math.PI / 2 - 1.45, 2.9, Math.PI * 0.7, Math.PI * 0.08]} />
        </mesh>
      );
    case 'mutton':
      return (
        <group>
          <Mustache m={m} wide={1.1} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.25, -0.08, 0.2]} rotation={[0, s * 0.8, s * 0.2]} scale={[0.6, 1, 1]} material={m}>
              <sphereGeometry args={[0.11, 12, 10]} />
            </mesh>
          ))}
        </group>
      );
    case 'longGoatee':
      return (
        <mesh position={[0, -0.42, 0.27]} rotation={[Math.PI - 0.25, 0, 0]} material={m}>
          <coneGeometry args={[0.065, 0.34, 10]} />
        </mesh>
      );
    case 'viking':
      return (
        <group>
          <Full m={m} />
          <Mustache m={m} />
          <Braid m={m} y={-0.42} z={0.24} len={0.3} />
          <mesh position={[0, -0.44, 0.24]} rotation={[Math.PI / 2, 0, 0]} material={X.gold}>
            <torusGeometry args={[0.035, 0.012, 6, 12]} />
          </mesh>
        </group>
      );
    case 'beads':
      return (
        <group>
          <Full m={m} />
          <Mustache m={m} />
          {[-0.09, 0, 0.09].map((x) => (
            <mesh key={x} position={[x, -0.38, 0.22]} material={X.gold}>
              <sphereGeometry args={[0.025, 8, 6]} />
            </mesh>
          ))}
        </group>
      );
    case 'santa':
      return (
        <group>
          <Full m={m} sx={1.2} sy={1.2} />
          {[
            [0, -0.42, 0.18, 0.13],
            [-0.12, -0.36, 0.2, 0.11],
            [0.12, -0.36, 0.2, 0.11],
            [0, -0.52, 0.12, 0.1],
          ].map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]} material={m}>
              <sphereGeometry args={[r, 12, 10]} />
            </mesh>
          ))}
          <Mustache m={m} wide={1.3} thick={1.4} />
        </group>
      );
    case 'neck':
      return (
        <mesh position={[0, -0.27, 0.04]} scale={[1, 0.5, 0.9]} material={m}>
          <sphereGeometry args={[0.26, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
        </mesh>
      );
    case 'short':
      return (
        <group>
          <mesh position={[0, -0.14, 0.05]} material={m}>
            <sphereGeometry args={[0.3, 20, 12, Math.PI / 2 - 1.2, 2.4, Math.PI * 0.55, Math.PI * 0.3]} />
          </mesh>
          <Mustache m={m} thick={0.8} />
        </group>
      );
    case 'forked':
      return (
        <group>
          <Full m={m} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.07, -0.42, 0.18]} rotation={[Math.PI - 0.3, 0, -s * 0.25]} material={m}>
              <coneGeometry args={[0.065, 0.2, 10]} />
            </mesh>
          ))}
          <Mustache m={m} />
        </group>
      );
    case 'stubbleHeavy':
      return <Stubble opacity={0.6} />;
    case 'stubbleLight':
      return <Stubble opacity={0.2} />;
    case 'mustacheSoul':
      return (
        <group>
          <Mustache m={m} />
          <mesh position={[0, -0.19, 0.3]} rotation={[-0.5, 0, 0]} material={m}>
            <boxGeometry args={[0.05, 0.06, 0.025]} />
          </mesh>
        </group>
      );
    case 'imperial':
      return (
        <group>
          <Mustache m={m} />
          <Curls m={m} up />
          <Goatee m={m} len={0.12} r={0.04} />
        </group>
      );
    case 'mustache':
      return <Mustache m={m} />;
    case 'full':
      return <Full m={m} />;
    case 'fullMustache':
      return (
        <group>
          <Full m={m} />
          <Mustache m={m} />
        </group>
      );
    case 'goatee':
      return <Goatee m={m} />;
    case 'lumber':
      return (
        <group>
          <Full m={m} sx={1.18} sy={1.18} />
          <mesh position={[0, -0.36, 0.2]} scale={[1.2, 0.8, 0.8]} material={m}>
            <sphereGeometry args={[0.14, 12, 10]} />
          </mesh>
          <Mustache m={m} wide={1.1} />
        </group>
      );
    case 'handlebar':
      return (
        <group>
          <Mustache m={m} wide={1.15} />
          <Curls m={m} />
        </group>
      );
    case 'fumanchu':
      return (
        <group>
          <Mustache m={m} />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, -0.22, 0.29]} rotation={[0.15, 0, s * 0.08]} material={m}>
              <cylinderGeometry args={[0.014, 0.006, 0.26, 6]} />
            </mesh>
          ))}
        </group>
      );
    case 'wizard':
      return (
        <group>
          <Full m={m} />
          <mesh position={[0, -0.44, 0.31]} rotation={[Math.PI - 0.5, 0, 0]} material={m}>
            <coneGeometry args={[0.17, 0.5, 12]} />
          </mesh>
          <Mustache m={m} wide={1.1} />
        </group>
      );
    case 'bow':
      return (
        <group>
          <Full m={m} />
          <Mustache m={m} />
          <Bow />
        </group>
      );
    case 'crumbs':
      return (
        <group>
          <Full m={m} />
          <Mustache m={m} />
          {[
            [-0.08, -0.3, 0.27],
            [0.05, -0.36, 0.25],
            [0.12, -0.27, 0.25],
            [-0.02, -0.25, 0.29],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[i, i * 2, 0]} material={X.tan}>
              <boxGeometry args={[0.025, 0.02, 0.02]} />
            </mesh>
          ))}
        </group>
      );
    case 'hipster':
      return (
        <group>
          <Full m={m} sy={1.25} />
          <mesh position={[0, -0.4, 0.17]} scale={[1.1, 0.7, 0.7]} material={m}>
            <boxGeometry args={[0.24, 0.16, 0.2]} />
          </mesh>
          <Mustache m={m} />
          <Curls m={m} up />
        </group>
      );
    case 'braids':
      return (
        <group>
          <Full m={m} />
          <Mustache m={m} />
          <Braid m={m} x={-0.08} y={-0.38} z={0.22} len={0.24} />
          <Braid m={m} x={0.08} y={-0.38} z={0.22} len={0.24} />
        </group>
      );
    case 'milk':
      return (
        <group position={[0, -0.1, 0.325]}>
          {[-0.07, -0.025, 0.025, 0.07].map((x, i) => (
            <mesh key={x} position={[x, i % 2 ? 0.006 : 0, 0]} material={m}>
              <sphereGeometry args={[0.035, 10, 8]} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}
