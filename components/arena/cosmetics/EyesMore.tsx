'use client';

/**
 * Dodatkowe oczy (indeksy 16–65 w `EYES`), opisane parametrami: kolor tęczówki, kształt źrenicy,
 * symbol (tekstura), powieki, brwi i dodatki. Oko: środek (±0.12, 0.04, 0.27), białko r = 0.085.
 */
import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { X, col, onHead } from './mats';

type Symbol = 'dollar' | 'question' | 'exclaim' | 'spiral' | 'bolt' | 'flower' | 'moon' | 'plus' | 'loading' | 'pixel' | 'sparkle';
interface Spec {
  iris?: string | [string, string];
  glowIris?: boolean;
  pupil?: 'round' | 'slit' | 'none' | 'big' | 'tiny';
  symbol?: Symbol;
  symbolColor?: string;
  white?: string;
  scale?: number;
  look?: [number, number];
  lid?: number;
  lidTilt?: number;
  brows?: { tilt?: number; y?: number; arch?: boolean; uneven?: number; thick?: number; uni?: boolean; color?: string };
  lashes?: boolean;
  shadow?: string;
  liner?: boolean;
  tears?: 'both' | 'one';
  bags?: boolean;
  veins?: boolean;
  shine?: boolean;
  special?: 'wink' | 'closed' | 'squeeze' | 'third' | 'robot' | 'leds' | 'buttons' | 'stalks' | 'four' | 'alien' | 'zombie' | 'black';
}

const SPECS: Record<number, Spec> = {
  16: { iris: '#3b82f6', shine: true },
  17: { iris: '#2fb35a', shine: true },
  18: { iris: '#9a6b2f', shine: true },
  19: { iris: '#8b5cf6', shine: true },
  20: { iris: '#ff2d4a', glowIris: true, brows: { tilt: 0.45, y: 0.1 } },
  21: { iris: '#ffc53d', glowIris: true },
  22: { iris: ['#3b82f6', '#2fb35a'], shine: true },
  23: { iris: '#ffd43b', pupil: 'slit' },
  24: { iris: '#5cbf3a', pupil: 'slit', lid: 0.35 },
  25: { pupil: 'none', symbol: 'spiral', symbolColor: '#7048e8' },
  26: { pupil: 'none', symbol: 'dollar', symbolColor: '#2f9e44' },
  27: { pupil: 'none', symbol: 'question', symbolColor: '#1c2a5a' },
  28: { pupil: 'none', symbol: 'exclaim', symbolColor: '#e03131' },
  29: { pupil: 'none', symbol: 'pixel', symbolColor: '#15151c' },
  30: { iris: '#4dabf7', scale: 1.25, pupil: 'big', shine: true, lashes: true },
  31: { pupil: 'round', symbol: 'sparkle', symbolColor: '#ffffff', shine: true },
  32: { iris: '#4dabf7', shine: true, tears: 'both', brows: { tilt: -0.35, y: 0.13 } },
  33: { lid: 0.55, bags: true },
  34: { veins: true, pupil: 'tiny', lid: 0.2 },
  35: { lashes: true },
  36: { lashes: true, shadow: '#a855f7' },
  37: { liner: true, lashes: true },
  38: { special: 'closed' },
  39: { special: 'squeeze' },
  40: { look: [0, 0.045], brows: { y: 0.14, tilt: -0.1 } },
  41: { look: [0.04, 0], lid: 0.45, lidTilt: 0.1 },
  42: { look: [0, -0.035], lid: 0.3 },
  43: { scale: 1.35, pupil: 'tiny', brows: { y: 0.2, arch: true } },
  44: { scale: 0.6 },
  45: { special: 'third' },
  46: { special: 'robot' },
  47: { special: 'leds' },
  48: { pupil: 'none' },
  49: { special: 'black' },
  50: { special: 'buttons' },
  51: { special: 'stalks' },
  52: { pupil: 'none', symbol: 'loading', symbolColor: '#22d3ee' },
  53: { pupil: 'none', symbol: 'bolt', symbolColor: '#f59f00' },
  54: { pupil: 'none', symbol: 'flower', symbolColor: '#ff6ab8' },
  55: { pupil: 'none', symbol: 'moon', symbolColor: '#f59f00' },
  56: { pupil: 'none', symbol: 'plus', symbolColor: '#15151c' },
  57: { brows: { uni: true, y: 0.11, thick: 1.5 } },
  58: { brows: { uneven: 0.07, y: 0.11, tilt: 0.1 } },
  59: { brows: { thick: 2.2, y: 0.12 } },
  60: { brows: { tilt: -0.45, y: 0.13 }, look: [0, -0.01] },
  61: { tears: 'one', iris: '#3b82f6', shine: true, brows: { tilt: -0.3, y: 0.13 } },
  62: { special: 'wink' },
  63: { special: 'four' },
  64: { special: 'zombie' },
  65: { special: 'alien' },
};

// ───────── tekstury symboli ─────────
const symCache = new Map<string, THREE.CanvasTexture>();
function symbolTexture(sym: Symbol, color: string) {
  const key = sym + color;
  const hit = symCache.get(key);
  if (hit || typeof document === 'undefined') return hit ?? null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const font = (px: number) => `900 ${px}px "Space Grotesk Variable", system-ui, sans-serif`;
  switch (sym) {
    case 'dollar':
    case 'question':
    case 'exclaim':
      g.font = font(100);
      g.fillText(sym === 'dollar' ? '$' : sym === 'question' ? '?' : '!', 64, 70);
      break;
    case 'spiral':
      g.lineWidth = 9;
      g.beginPath();
      for (let t = 0; t < Math.PI * 7; t += 0.1) {
        const r = 3 + t * 2.6;
        g.lineTo(64 + Math.cos(t) * r, 64 + Math.sin(t) * r);
      }
      g.stroke();
      break;
    case 'bolt':
      g.beginPath();
      g.moveTo(74, 8);
      g.lineTo(30, 72);
      g.lineTo(60, 72);
      g.lineTo(50, 120);
      g.lineTo(98, 52);
      g.lineTo(68, 52);
      g.closePath();
      g.fill();
      break;
    case 'flower':
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.beginPath();
        g.arc(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30, 22, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffd43b';
      g.beginPath();
      g.arc(64, 64, 20, 0, Math.PI * 2);
      g.fill();
      break;
    case 'moon':
      g.beginPath();
      g.arc(64, 64, 48, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(86, 50, 42, 0, Math.PI * 2);
      g.fill();
      break;
    case 'plus':
      g.fillRect(52, 18, 24, 92);
      g.fillRect(18, 52, 92, 24);
      break;
    case 'loading':
      g.lineWidth = 14;
      g.beginPath();
      g.arc(64, 64, 40, 0, Math.PI * 1.5);
      g.stroke();
      break;
    case 'pixel':
      g.fillRect(40, 40, 48, 48);
      g.fillStyle = '#ffffff';
      g.fillRect(48, 48, 14, 14);
      break;
    case 'sparkle':
      g.fillStyle = '#ffffff';
      for (const [x, y, r] of [
        [44, 44, 26],
        [86, 82, 14],
      ]) {
        g.beginPath();
        g.moveTo(x, y - r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.quadraticCurveTo(x, y, x, y + r);
        g.quadraticCurveTo(x, y, x - r, y);
        g.quadraticCurveTo(x, y, x, y - r);
        g.fill();
      }
      break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  symCache.set(key, t);
  return t;
}

function SymbolDecal({ sym, color, spin }: { sym: Symbol; color: string; spin?: boolean }) {
  const tex = symbolTexture(sym, color);
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.rotation.z -= dt * 4;
  });
  return (
    <mesh ref={ref} position={[0, 0, 0.088]}>
      <circleGeometry args={[0.068, 20]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// ───────── części oka ─────────
function Lid({ lid, tilt, side, skin }: { lid: number; tilt: number; side: number; skin: THREE.Material }) {
  return (
    <group rotation={[0, 0, tilt * side]}>
      <mesh material={skin}>
        <sphereGeometry args={[0.093, 16, 8, 0, Math.PI * 2, 0, Math.acos(THREE.MathUtils.clamp((0.08 - lid * 0.15) / 0.093, -0.99, 0.99))]} />
      </mesh>
    </group>
  );
}

function Lashes({ side }: { side: number }) {
  return (
    <group position={[0, 0.07, 0.04]}>
      {[-0.05, 0, 0.05].map((x, i) => (
        <mesh key={x} position={[x, 0.01 + (i === 1 ? 0.008 : 0), 0.01]} rotation={[0.5, 0, -x * 6 - side * 0.2]} material={X.black}>
          <boxGeometry args={[0.008, 0.045, 0.006]} />
        </mesh>
      ))}
    </group>
  );
}

function EyeBall({ side, spec, skin, white, pupil }: { side: number; spec: Spec; skin: THREE.Material; white: THREE.Material; pupil: THREE.Material }) {
  const irisCol = Array.isArray(spec.iris) ? spec.iris[side < 0 ? 0 : 1] : spec.iris;
  const irisMat = irisCol ? (spec.glowIris ? col(irisCol, { emissive: irisCol, emissiveIntensity: 1.4, toneMapped: false }) : col(irisCol)) : null;
  const whiteMat = spec.white ? col(spec.white) : white;
  const [lx, ly] = spec.look ?? [0, 0];
  const kind = spec.pupil ?? 'round';
  const pr = kind === 'big' ? 0.05 : kind === 'tiny' ? 0.02 : 0.034;
  return (
    <group scale={spec.scale ?? 1}>
      <mesh material={whiteMat}>
        <sphereGeometry args={[0.085, 16, 12]} />
      </mesh>
      {spec.veins &&
        [0.4, 1.5, 2.6, 3.8, 5].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.07]} rotation={[0, 0, a]} material={X.red}>
            <boxGeometry args={[0.04, 0.004, 0.004]} />
          </mesh>
        ))}
      <group position={[lx, ly, 0]}>
        {irisMat && (
          <mesh position={[0, -0.003, 0.05]} material={irisMat}>
            <sphereGeometry args={[0.05, 14, 10]} />
          </mesh>
        )}
        {kind !== 'none' && (
          <mesh position={[0, -0.003, irisMat ? 0.072 : 0.085 - pr + 0.017]} scale={kind === 'slit' ? [0.32, 1.3, 1] : [1, 1, 1]} material={pupil}>
            <sphereGeometry args={[kind === 'slit' ? 0.034 : irisMat ? Math.min(pr, 0.03) : pr, 10, 8]} />
          </mesh>
        )}
        {spec.shine && (
          <mesh position={[0.018, 0.02, 0.103]} material={X.basicWhite}>
            <sphereGeometry args={[0.011, 6, 5]} />
          </mesh>
        )}
      </group>
      {spec.symbol && <SymbolDecal sym={spec.symbol} color={spec.symbolColor ?? '#15151c'} spin={spec.symbol === 'loading' || spec.symbol === 'spiral'} />}
      {spec.lid !== undefined && <Lid lid={spec.lid} tilt={spec.lidTilt ?? 0} side={side} skin={skin} />}
      {spec.lashes && <Lashes side={side} />}
      {spec.shadow && (
        <mesh position={[0, 0.045, 0.01]} scale={[1.15, 0.7, 1]} material={col(spec.shadow, { transparent: true, opacity: 0.85 })}>
          <sphereGeometry args={[0.092, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        </mesh>
      )}
      {spec.liner && (
        <mesh position={[side * 0.085, 0.045, 0.05]} rotation={[0, 0, side * 0.5]} material={X.black}>
          <boxGeometry args={[0.07, 0.014, 0.01]} />
        </mesh>
      )}
      {spec.bags && (
        <mesh position={[0, -0.075, 0.045]} rotation={[0.4, 0, 0]} scale={[1, 0.45, 0.6]} material={col('#7a4f8f', { transparent: true, opacity: 0.55 })}>
          <torusGeometry args={[0.06, 0.012, 6, 14, Math.PI]} />
        </mesh>
      )}
    </group>
  );
}

function Brows({ tilt = 0, y = 0.12, arch = false, uneven = 0, thick = 1, uni = false, color }: NonNullable<Spec['brows']>) {
  const m = color ? col(color) : col('#1d1a22');
  if (uni) {
    const yy = 0.04 + y;
    const p = onHead(0, yy, 0.022);
    return (
      <group position={p.position} rotation={p.rotation}>
        <mesh material={m}>
          <boxGeometry args={[0.38, 0.03 * thick, 0.035]} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      {[-1, 1].map((s) => {
        const yy = 0.04 + y + (s === 1 ? uneven : 0);
        const z = Math.sqrt(Math.max(0, 0.343 * 0.343 - 0.0144 - yy * yy)) + 0.025;
        return (
          <group key={s} position={[s * 0.12, yy, z]} rotation={[-Math.asin(yy / 0.343), s * 0.36, s * tilt]}>
            {arch ? (
              <mesh material={m}>
                <torusGeometry args={[0.065, 0.016 * thick, 4, 10, Math.PI]} />
              </mesh>
            ) : (
              <mesh material={m}>
                <boxGeometry args={[0.15, 0.04 * thick, 0.045]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Tear({ side }: { side: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.5 + (side > 0 ? 0.5 : 0)) % 1;
    ref.current.position.y = -0.07 - t * 0.12;
    ref.current.scale.setScalar(t > 0.92 ? 0.001 : 1);
  });
  return (
    <mesh ref={ref} position={[side * 0.14, -0.07, 0.31]} scale={[1, 1, 1]} material={X.tear}>
      <sphereGeometry args={[0.022, 8, 6]} />
    </mesh>
  );
}

function FlatAt({ side, children }: { side: number; children: ReactNode }) {
  return (
    <group position={[side * 0.12, 0.04, 0.33]} rotation={[0, side * 0.36, 0]}>
      {children}
    </group>
  );
}

function Special({ kind, skin, white, pupil }: { kind: NonNullable<Spec['special']>; skin: THREE.Material; white: THREE.Material; pupil: THREE.Material }) {
  const pair = (s: Spec) =>
    [-1, 1].map((side) => (
      <group key={side} position={[side * 0.12, 0.04, 0.27]}>
        <EyeBall side={side} spec={s} skin={skin} white={white} pupil={pupil} />
      </group>
    ));
  switch (kind) {
    case 'closed':
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatAt key={s} side={s}>
              <mesh rotation={[0, 0, Math.PI]} position={[0, 0.02, 0]} material={pupil}>
                <torusGeometry args={[0.055, 0.013, 5, 12, Math.PI]} />
              </mesh>
            </FlatAt>
          ))}
        </>
      );
    case 'wink':
      return (
        <>
          <group position={[-0.12, 0.04, 0.27]}>
            <EyeBall side={-1} spec={{ iris: '#3b82f6', shine: true }} skin={skin} white={white} pupil={pupil} />
          </group>
          <FlatAt side={1}>
            <mesh rotation={[0, 0, Math.PI]} position={[0, 0.02, 0]} material={pupil}>
              <torusGeometry args={[0.055, 0.013, 5, 12, Math.PI]} />
            </mesh>
          </FlatAt>
          <group position={[0.26, 0.13, 0.27]} rotation={[0, 0.6, 0]} scale={0.8}>
            <SymbolDecal sym="sparkle" color="#ffffff" />
          </group>
        </>
      );
    case 'squeeze':
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatAt key={s} side={s}>
              {[0.45, -0.45].map((r) => (
                <mesh key={r} position={[-s * 0.015, r * 0.06, 0]} rotation={[0, 0, s * r]} material={pupil}>
                  <boxGeometry args={[0.1, 0.02, 0.012]} />
                </mesh>
              ))}
            </FlatAt>
          ))}
        </>
      );
    case 'third':
      return (
        <>
          {pair({})}
          <group position={[0, 0.2, 0.24]} rotation={[-0.6, 0, 0]} scale={0.8}>
            <EyeBall side={1} spec={{ iris: '#8b5cf6', glowIris: true }} skin={skin} white={white} pupil={pupil} />
          </group>
        </>
      );
    case 'robot':
      return (
        <>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, 0.04, 0.33]} rotation={[0, s * 0.36, 0]}>
              <mesh material={X.black}>
                <boxGeometry args={[0.15, 0.08, 0.03]} />
              </mesh>
              <mesh position={[0, 0, 0.016]} material={X.glowCyan}>
                <planeGeometry args={[0.12, 0.035]} />
              </mesh>
            </group>
          ))}
        </>
      );
    case 'leds':
      return (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 0.04, 0.315]} material={X.glowRed}>
              <sphereGeometry args={[0.04, 12, 10]} />
            </mesh>
          ))}
        </>
      );
    case 'black':
      return (
        <>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, 0.04, 0.27]}>
              <mesh material={col('#08080c', { roughness: 0.05, metalness: 0.3 })}>
                <sphereGeometry args={[0.088, 16, 12]} />
              </mesh>
              <mesh position={[0.025, 0.03, 0.08]} material={X.basicWhite}>
                <sphereGeometry args={[0.013, 6, 5]} />
              </mesh>
            </group>
          ))}
        </>
      );
    case 'buttons':
      return (
        <>
          {[-1, 1].map((s) => (
            <FlatAt key={s} side={s}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={X.black}>
                <cylinderGeometry args={[0.06, 0.06, 0.02, 18]} />
              </mesh>
              {[
                [-0.018, 0.018],
                [0.018, 0.018],
                [-0.018, -0.018],
                [0.018, -0.018],
              ].map(([x, y]) => (
                <mesh key={`${x}${y}`} position={[x, y, 0.011]} material={X.grey}>
                  <circleGeometry args={[0.008, 8]} />
                </mesh>
              ))}
            </FlatAt>
          ))}
        </>
      );
    case 'stalks':
      return (
        <>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.1, 0.26, 0.15]} rotation={[0.3, 0, -s * 0.35]}>
              <mesh position={[0, 0.08, 0]} material={skin}>
                <cylinderGeometry args={[0.018, 0.025, 0.18, 8]} />
              </mesh>
              <group position={[0, 0.2, 0]} rotation={[-0.3, 0, s * 0.35]}>
                <EyeBall side={s} spec={{ iris: '#2fb35a' }} skin={skin} white={white} pupil={pupil} />
              </group>
            </group>
          ))}
        </>
      );
    case 'four':
      return (
        <>
          {[
            [-0.17, 0.1, 0.62],
            [0.17, 0.1, 0.62],
            [-0.08, 0.0, 0.72],
            [0.08, 0.0, 0.72],
          ].map(([x, y, sc], i) => (
            <group key={i} position={[x, y, Math.sqrt(0.343 ** 2 - x * x - y * y) - 0.02]} scale={sc}>
              <EyeBall side={x < 0 ? -1 : 1} spec={{ iris: '#e03131' }} skin={skin} white={white} pupil={pupil} />
            </group>
          ))}
        </>
      );
    case 'zombie':
      return (
        <>
          <group position={[-0.12, 0.04, 0.27]}>
            <EyeBall side={-1} spec={{ white: '#d8f5c8', pupil: 'tiny', look: [0.02, 0.02] }} skin={skin} white={white} pupil={pupil} />
          </group>
          <group position={[0.12, 0.02, 0.27]}>
            <EyeBall side={1} spec={{ white: '#d8f5c8', pupil: 'tiny', lid: 0.55, lidTilt: -0.3, look: [0.01, -0.02] }} skin={skin} white={white} pupil={pupil} />
          </group>
        </>
      );
    case 'alien':
      return (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0.03, 0.29]} rotation={[0, s * 0.35, s * -0.55]} scale={[1.45, 0.8, 0.55]} material={col('#05060a', { roughness: 0.05, metalness: 0.4 })}>
              <sphereGeometry args={[0.085, 16, 12]} />
            </mesh>
          ))}
        </>
      );
  }
}

export function EyesMore({ kind, skin, white, pupil }: { kind: number; skin: THREE.Material; white: THREE.Material; pupil: THREE.Material }) {
  const spec = SPECS[kind];
  if (!spec) return null;
  return (
    <group>
      {spec.special ? (
        <Special kind={spec.special} skin={skin} white={white} pupil={pupil} />
      ) : (
        [-1, 1].map((s) => (
          <group key={s} position={[s * 0.12, 0.04, 0.27]}>
            <EyeBall side={s} spec={spec} skin={skin} white={white} pupil={pupil} />
          </group>
        ))
      )}
      {spec.brows && <Brows {...spec.brows} />}
      {spec.tears === 'both' && [-1, 1].map((s) => <Tear key={s} side={s} />)}
      {spec.tears === 'one' && <Tear side={1} />}
    </group>
  );
}
