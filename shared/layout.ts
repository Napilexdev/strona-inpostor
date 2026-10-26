/**
 * Algorytm rozmieszczenia podestów w arenie 3D oraz dopasowania kamery.
 * Czysty moduł bez zależności od Three.js — testowany jednostkowo.
 *
 * Układ współrzędnych: kamera patrzy z +Z w stronę -Z, oś Y w górę.
 */

export interface PodiumSlot {
  seat: number;
  x: number;
  z: number;
  /** Wysokość podwyższenia, na którym stoi postać za mównicą. */
  height: number;
  /** Obrót postaci wokół osi Y (w stronę widza). */
  rotY: number;
  row: 'single' | 'back' | 'front';
}

export interface PodiumLayout {
  count: number;
  slots: PodiumSlot[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxTop: number };
}

/** Minimalny odstęp między środkami podestów. */
export const PODIUM_SPACING = 2.4;
export const PODIUM_RADIUS = 0.72;
const SINGLE_ROW_MAX = 7;
const ROW_GAP = 2.3;
const VIEWER_Z = 14;

function faceViewer(x: number, z: number): number {
  return Math.atan2(0 - x, VIEWER_Z - z) * 0.85;
}

function singleArc(n: number): Omit<PodiumSlot, 'seat'>[] {
  if (n === 1) return [{ x: 0, z: 0, height: 0.12, rotY: 0, row: 'single' }];
  // Rozpiętość łuku rośnie z liczbą podestów — od wąskiego półokręgu do szerokiego łuku.
  const spanDeg = Math.min(150, 40 + 18 * (n - 1));
  const span = (spanDeg * Math.PI) / 180;
  const arcLen = PODIUM_SPACING * (n - 1);
  const R = Math.max(3.2, arcLen / span);
  const raw = Array.from({ length: n }, (_, i) => {
    const t = -span / 2 + (span * i) / (n - 1);
    return { x: R * Math.sin(t), z: -R * Math.cos(t) };
  });
  const meanZ = raw.reduce((s, p) => s + p.z, 0) / n;
  return raw.map((p) => {
    const z = p.z - meanZ;
    return { x: p.x, z, height: 0.12, rotY: faceViewer(p.x, z), row: 'single' as const };
  });
}

function twoRows(n: number): Omit<PodiumSlot, 'seat'>[] {
  let backUnits: number[];
  let frontUnits: number[];
  if (n % 2 === 1) {
    const nb = (n + 1) / 2;
    backUnits = Array.from({ length: nb }, (_, i) => i - (nb - 1) / 2);
    frontUnits = backUnits.slice(0, -1).map((u) => u + 0.5);
  } else {
    const half = n / 2;
    const nb = half % 2 === 0 ? half : half + 1;
    const nf = n - nb;
    backUnits = Array.from({ length: nb }, (_, i) => i - (nb - 1) / 2);
    frontUnits = [];
    for (let k = 1; k <= nf / 2; k++) frontUnits.push(-k, k);
    frontUnits.sort((a, b) => a - b);
  }
  const maxUnit = Math.max(...backUnits.map(Math.abs), ...frontUnits.map(Math.abs));
  const maxX = maxUnit * PODIUM_SPACING;
  const k = 2.4 / (maxX * maxX); // łuk: końce wysunięte o ~2.4 jednostki do przodu
  const slots: Omit<PodiumSlot, 'seat'>[] = [];
  for (const u of backUnits) {
    const x = u * PODIUM_SPACING;
    const z = -ROW_GAP / 2 + k * x * x - 1.0;
    slots.push({ x, z, height: 0.95, rotY: faceViewer(x, z), row: 'back' });
  }
  for (const u of frontUnits) {
    const x = u * PODIUM_SPACING;
    const z = ROW_GAP / 2 + k * x * x - 1.0;
    slots.push({ x, z, height: 0.12, rotY: faceViewer(x, z), row: 'front' });
  }
  return slots;
}

const layoutCache = new Map<number, PodiumLayout>();

export function computePodiumLayout(count: number): PodiumLayout {
  const n = Math.max(1, Math.min(12, Math.floor(count)));
  const cached = layoutCache.get(n);
  if (cached) return cached;
  const raw = n <= SINGLE_ROW_MAX ? singleArc(n) : twoRows(n);
  // Numeracja miejsc od lewej do prawej (zygzak przy dwóch rzędach).
  const slots = raw
    .slice()
    .sort((a, b) => a.x - b.x || a.z - b.z)
    .map((s, seat) => ({ ...s, seat }));
  const bounds = {
    minX: Math.min(...slots.map((s) => s.x)),
    maxX: Math.max(...slots.map((s) => s.x)),
    minZ: Math.min(...slots.map((s) => s.z)),
    maxZ: Math.max(...slots.map((s) => s.z)),
    maxTop: Math.max(...slots.map((s) => s.height)),
  };
  const layout = { count: n, slots, bounds };
  layoutCache.set(n, layout);
  return layout;
}

export interface CameraFrame {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
}

/**
 * Wyznacza pozycję kamery tak, aby cała arena mieściła się w kadrze
 * dla podanych proporcji ekranu. Kamera: z przodu i lekko z góry.
 */
export function computeCameraFrame(layout: PodiumLayout, aspect: number, fovDeg = 38): CameraFrame {
  const { minX, maxX, minZ, maxZ, maxTop } = layout.bounds;
  const halfW = Math.max(Math.abs(minX), Math.abs(maxX)) + 2.1; // margines na nicki i perspektywę
  const contentH = maxTop + 3.3 + (maxZ - minZ) * 0.35 + (aspect < 1.3 ? 0.8 : 0); // podest + postać + nick
  const vFov = (fovDeg * Math.PI) / 180;
  const tanV = Math.tan(vFov / 2);
  const tanH = tanV * Math.max(0.3, aspect);
  const centerZ = (minZ + maxZ) / 2;
  const dW = halfW / tanH;
  const dH = contentH / 2 / tanV;
  const distance = Math.max(7.5, dW, dH) + (maxZ - centerZ);
  const elev = (19 * Math.PI) / 180;
  const targetY = maxTop * 0.5 + 0.7;
  const target: [number, number, number] = [0, targetY, centerZ];
  const position: [number, number, number] = [0, targetY + Math.sin(elev) * distance, centerZ + Math.cos(elev) * distance];
  return { position, target, distance };
}
