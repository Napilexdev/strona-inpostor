import * as THREE from 'three';

/** Wspólne materiały dodatkowych kosmetyków (tworzone raz na moduł). */
const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const glow = (color: string, intensity = 1.6) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: false });
const clear = (color: string, opacity: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.1, depthWrite: false, ...extra });

const cache = new Map<string, THREE.MeshStandardMaterial>();
/** Materiał o dowolnym kolorze (z pamięcią podręczną). */
export function col(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = color + JSON.stringify(extra);
  let m = cache.get(key);
  if (!m) cache.set(key, (m = std(color, extra)));
  return m;
}

export const X = {
  black: std('#15151c'),
  white: std('#f4f5fb'),
  cream: std('#efe2c4'),
  red: std('#e03131'),
  darkRed: std('#9b1c1c'),
  pink: std('#ff8fb8'),
  hotPink: std('#ff4d9d'),
  orange: std('#ff922b'),
  yellow: std('#ffd43b'),
  green: std('#2f9e44'),
  lime: std('#82c91e'),
  teal: std('#12b886'),
  blue: std('#228be6'),
  navy: std('#1c2a5a'),
  purple: std('#7048e8'),
  brown: std('#8b5a2b'),
  darkBrown: std('#4e2e18'),
  tan: std('#d2a679'),
  grey: std('#868e96'),
  lightGrey: std('#ced4da'),
  skin: std('#f2c9a0'),
  gold: std('#ffcf3f', { metalness: 0.75, roughness: 0.25 }),
  silver: std('#dfe3ea', { metalness: 0.85, roughness: 0.2 }),
  steel: std('#9aa1ad', { metalness: 0.7, roughness: 0.3 }),
  rubber: std('#2b2b33', { roughness: 0.8 }),
  glass: clear('#cfe8ff', 0.35, { metalness: 0.2 }),
  darkGlass: clear('#101624', 0.75, { metalness: 0.5 }),
  ice: clear('#bfefff', 0.7, { metalness: 0.3 }),
  glowRed: glow('#ff2d4a'),
  glowCyan: glow('#3bf0ff'),
  glowYellow: glow('#ffe066'),
  glowPink: glow('#ff6ad5'),
  glowGreen: glow('#5cff8a'),
  glowOrange: glow('#ff7a1a', 1.8),
  basicWhite: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  blush: new THREE.MeshBasicMaterial({ color: '#ff6b9a', transparent: true, opacity: 0.6, depthWrite: false }),
  sweat: clear('#8fd3ff', 0.85),
  tear: clear('#7cc7ff', 0.8),
  bruise: new THREE.MeshBasicMaterial({ color: '#6f3b8f', transparent: true, opacity: 0.55, depthWrite: false }),
  paintWhite: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.92, depthWrite: false }),
};

/**
 * Punkt na powierzchni głowy (promień ~0.343) dla kąta poziomego `yaw` (0 = przód, + = w prawo postaci)
 * i wysokości `y`; obrót ustawia płaski element stycznie do głowy.
 */
export function onHead(yaw: number, y: number, lift = 0.005, r = 0.343): { position: [number, number, number]; rotation: THREE.Euler } {
  const rr = Math.sqrt(Math.max(0, r * r - y * y)) + lift;
  const k = rr / Math.sqrt(Math.max(1e-6, r * r - y * y));
  return {
    position: [Math.sin(yaw) * rr, y * k, Math.cos(yaw) * rr],
    rotation: new THREE.Euler(-Math.asin(Math.max(-1, Math.min(1, y / r))), yaw, 0, 'YXZ'),
  };
}
