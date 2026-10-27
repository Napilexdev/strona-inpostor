'use client';

/**
 * Studio telewizyjne wokół mównic: ściana z ekranem LED, pasek wiadomości,
 * światła sceniczne oraz kilka polskich smaczków (dywan na ścianie,
 * wersalka z kotem, meblościanka z telewizorem, sandały ze skarpetami, słoik ogórków,
 * puszka z guzikami, krasnal, gołąb, werbel „ba-dum-tss”).
 * Wszystko z prostych brył i tekstur rysowanych raz na płótnie — tanie w renderowaniu.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { computeCameraFrame, type PodiumLayout } from '@/shared/layout';
import type { Phase } from '@/shared/types';
import { play } from '@/lib/sound';

const FONT = '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif';

/** Pasek wiadomości na dole ekranu LED. */
export const TICKER = [
  'PILNE: impostor przyłapany na mewingu w trakcie głosowania',
  'Eksperci: kto pierwszy powie „to nie ja”, traci −500 aury',
  'Badanie: 9 na 10 impostorów to NPC z lepszym rizzem',
  'Ola jest delulu — twierdzi, że wszystkich przejrzała',
  '6… 7… naukowcy nadal nie wiedzą, o co chodzi',
  'Ten ziomek ma vibe impostora, no cap',
  'Ktoś tu robi side-eye od trzech rund',
  'Poziom brainrotu w studiu: krytyczny',
  'POV: dałeś skojarzenie „ser” i wszyscy patrzą na ciebie',
  'Lowkey podejrzany, highkey winny',
  'Sigma grindset: najpierw słuchaj, potem mów',
  'Cringe alert: ktoś podał hasło jako skojarzenie',
  'Slay: trafione głosowanie za pierwszym razem',
  'Ratio dla impostora',
  'Skibidi studio wraca po przerwie',
  'To nie jest red flag, to cała flaga',
];

const PHASE_TEXT: Record<Phase, string> = {
  lobby: 'ZARAZ ZACZYNAMY',
  roles: 'LOSOWANIE RÓL',
  clues: 'RUNDA SKOJARZEŃ',
  'continuation-vote': 'CO DALEJ?',
  discussion: 'DYSKUSJA',
  'elimination-vote': 'GŁOSOWANIE',
  reveal: 'KTO TO BYŁ?',
  'last-guess': 'OSTATNIA SZANSA',
  ended: 'KONIEC ODCINKA',
};

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, ...extra });

function useDispose<T extends { dispose(): void } | null>(obj: T): T {
  useEffect(() => () => obj?.dispose(), [obj]);
  return obj;
}

// ───────────────────────────── ekran LED ─────────────────────────────

function LedScreen({ phase, width, height, y, z }: { phase: Phase; width: number; height: number; y: number; z: number }) {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const tex = useDispose(
    useMemo(
      () =>
        canvasTex(2048, 256, (g) => {
          const bg = g.createLinearGradient(0, 0, 2048, 0);
          bg.addColorStop(0, '#2a1060');
          bg.addColorStop(0.5, '#120d35');
          bg.addColorStop(1, '#2a1060');
          g.fillStyle = bg;
          g.fillRect(0, 0, 2048, 256);
          g.textBaseline = 'middle';
          g.textAlign = 'center';
          g.font = `800 170px ${FONT}`;
          const grad = g.createLinearGradient(560, 0, 1490, 0);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.46, '#ffffff');
          grad.addColorStop(0.54, '#ff4d6d');
          grad.addColorStop(1, '#b197fc');
          g.shadowColor = 'rgba(255,77,109,.85)';
          g.shadowBlur = 34;
          g.fillStyle = grad;
          g.fillText('IMPOSTOR', 1024, 120);
          g.shadowBlur = 0;
          // etap gry po bokach logo
          g.font = `700 54px ${FONT}`;
          g.fillStyle = '#ffd43b';
          const label = PHASE_TEXT[phase] ?? '';
          g.fillText(label, 300, 128);
          g.fillText(label, 1748, 128);
          g.fillStyle = 'rgba(255,212,59,.5)';
          for (const x of [300, 1748]) for (const d of [-1, 1]) {
            g.beginPath();
            g.arc(x + d * 250, 128, 8, 0, Math.PI * 2);
            g.fill();
          }
          // siatka diod
          g.fillStyle = 'rgba(0,0,0,.25)';
          for (let x = 0; x < 2048; x += 4) g.fillRect(x, 0, 1, 256);
          for (let yy = 0; yy < 256; yy += 4) g.fillRect(0, yy, 2048, 1);
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [phase, fontsReady],
    ),
  );
  const ticker = useDispose(
    useMemo(() => {
      const text = TICKER.join('   ●   ') + '   ●   ';
      const measure = document.createElement('canvas').getContext('2d')!;
      measure.font = `600 34px ${FONT}`;
      const w = Math.min(8192, Math.ceil(measure.measureText(text).width));
      const t = canvasTex(w, 56, (g) => {
        g.fillStyle = '#ffd43b';
        g.fillRect(0, 0, w, 56);
        g.font = `600 34px ${FONT}`;
        g.fillStyle = '#15151c';
        g.textBaseline = 'middle';
        g.fillText(text, 0, 30);
      });
      if (t) {
        t.wrapS = THREE.RepeatWrapping;
        t.repeat.x = Math.min(1, (width * 56) / (height * 0.22 * w));
      }
      return t;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, fontsReady]),
  );
  useFrame((_, dt) => {
    if (ticker) ticker.offset.x = (ticker.offset.x + dt * 0.012) % 1;
  });
  const tickerH = height * 0.22;
  const logoH = height - tickerH;
  return (
    <group position={[0, y, z]}>
      {/* rama */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[width + 0.24, height + 0.24, 0.1]} />
        <meshStandardMaterial color="#1a1c30" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, tickerH / 2, 0]}>
        <planeGeometry args={[width, logoH]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, -logoH / 2, 0.001]}>
        <planeGeometry args={[width, tickerH]} />
        <meshBasicMaterial map={ticker} toneMapped={false} />
      </mesh>
      <mesh position={[-width / 2 + tickerH * 1.6, -logoH / 2, 0.004]}>
        <planeGeometry args={[tickerH * 3.2, tickerH]} />
        <meshBasicMaterial color="#e03131" toneMapped={false} />
      </mesh>
      <SignText text="PILNE" w={tickerH * 3.2} h={tickerH} pos={[-width / 2 + tickerH * 1.6, -logoH / 2, 0.006]} color="#ffffff" />
    </group>
  );
}

function SignText({ text, w, h, pos, color }: { text: string; w: number; h: number; pos: [number, number, number]; color: string }) {
  const tex = useDispose(
    useMemo(
      () =>
        canvasTex(256, Math.round((256 * h) / w), (g) => {
          const H = Math.round((256 * h) / w);
          g.font = `800 ${Math.round(H * 0.62)}px ${FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = color;
          g.fillText(text, 128, H / 2 + 2);
        }),
      [text, w, h, color],
    ),
  );
  return (
    <mesh position={pos}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** Podświetlany napis („NA ŻYWO”, „BRAWA!”). */
function LightSign({ text, on, blink, pos, color }: { text: string; on: boolean; blink?: boolean; pos: [number, number, number]; color: string }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), [color]);
  useDispose(mat);
  useFrame(({ clock }) => {
    const lit = on && (!blink || Math.floor(clock.elapsedTime * 3) % 2 === 0);
    mat.color.set(lit ? color : '#2a1c24');
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[1.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[1.38, 0.38]} />
      </mesh>
      <SignText text={text} w={1.38} h={0.38} pos={[0, 0, 0.002]} color="#ffffff" />
    </group>
  );
}

// ───────────────────────────── ściana, podłoga, światła ─────────────────────────────

/** Zaokrąglona ściana studia (wycinek walca widziany od środka). */
function BackWall({ radius, cz, height, halfAngle }: { radius: number; cz: number; height: number; halfAngle: number }) {
  const tex = useDispose(
    useMemo(() => {
      const t = canvasTex(256, 512, (g) => {
        const bg = g.createLinearGradient(0, 0, 0, 512);
        bg.addColorStop(0, '#0b0e22');
        bg.addColorStop(0.6, '#1a1540');
        bg.addColorStop(1, '#24184d');
        g.fillStyle = bg;
        g.fillRect(0, 0, 256, 512);
        // panele
        g.strokeStyle = 'rgba(255,255,255,.05)';
        g.lineWidth = 3;
        for (let y = 0; y < 512; y += 128) g.strokeRect(6, y + 6, 244, 116);
        // listwa świetlna na środku panelu
        const strip = g.createLinearGradient(0, 0, 0, 512);
        strip.addColorStop(0, 'rgba(156,123,255,0)');
        strip.addColorStop(0.75, 'rgba(156,123,255,.55)');
        strip.addColorStop(1, 'rgba(255,77,109,.7)');
        g.fillStyle = strip;
        g.fillRect(124, 0, 8, 512);
      });
      if (t) {
        t.wrapS = THREE.RepeatWrapping;
        t.repeat.set(Math.max(4, Math.round((radius * halfAngle * 2) / 3)), 1);
      }
      return t;
    }, [radius, halfAngle]),
  );
  return (
    <mesh position={[0, height / 2, cz]}>
      <cylinderGeometry args={[radius, radius, height, 72, 1, true, Math.PI - halfAngle, halfAngle * 2]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function StageFloor({ rx, rz, cz, low }: { rx: number; rz: number; cz: number; low: boolean }) {
  const tex = useDispose(
    useMemo(
      () =>
        canvasTex(512, 512, (g) => {
          const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
          grd.addColorStop(0, '#2a2160');
          grd.addColorStop(0.7, '#161437');
          grd.addColorStop(1, '#0f0e26');
          g.fillStyle = grd;
          g.fillRect(0, 0, 512, 512);
          g.strokeStyle = 'rgba(156,123,255,.18)';
          g.lineWidth = 2;
          for (let r = 40; r < 256; r += 42) {
            g.beginPath();
            g.arc(256, 256, r, 0, Math.PI * 2);
            g.stroke();
          }
          for (let i = 0; i < 16; i++) {
            const a = (i * Math.PI) / 8;
            g.beginPath();
            g.moveTo(256 + Math.cos(a) * 40, 256 + Math.sin(a) * 40);
            g.lineTo(256 + Math.cos(a) * 256, 256 + Math.sin(a) * 256);
            g.stroke();
          }
        }),
      [],
    ),
  );
  const ring = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.color.setHSL((0.75 + Math.sin(clock.elapsedTime * 0.3) * 0.08) % 1, 0.9, 0.62);
  });
  return (
    <group position={[0, 0, cz]} scale={[rx, 1, rz]}>
      <mesh position={[0, 0.03, 0]} receiveShadow={!low}>
        <cylinderGeometry args={[1, 1.02, 0.06, 64]} />
        <meshStandardMaterial map={tex} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.975, 1.0, 96]} />
        <meshBasicMaterial ref={ring} color="#9c7bff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Snopy światła reflektorów — proste, symetryczne, lekko pulsujące. */
function Beams({ xs, z, top }: { xs: number[]; z: number; top: number }) {
  const cols = ['#ff4d6d', '#9c7bff', '#22d3ee', '#ffd43b', '#9c7bff', '#ff4d6d'];
  const mats = useMemo(
    () =>
      xs.map(
        (_, i) =>
          new THREE.MeshBasicMaterial({
            color: cols[i % cols.length],
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false,
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xs.length],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  useFrame(({ clock }) => {
    mats.forEach((m, i) => (m.opacity = 0.05 + 0.025 * Math.sin(clock.elapsedTime * 0.8 + i * 1.3)));
  });
  return (
    <group>
      {xs.map((x, i) => (
        <mesh key={i} position={[x, top / 2, z]} material={mats[i]}>
          <coneGeometry args={[1.3, top, 20, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────── rekwizyty ─────────────────────────────

const PROP = {
  wood: std('#7a4a2a'),
  darkWood: std('#4e2e18'),
  metal: std('#2b2f3d', { metalness: 0.7, roughness: 0.35 }),
  black: std('#121218'),
  white: std('#f1f1f4'),
  red: new THREE.MeshBasicMaterial({ color: '#ff2d4a', toneMapped: false }),
  sofa: std('#a0522d'),
  sofaDark: std('#7b3a1e'),
  glass: new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  crystal: new THREE.MeshStandardMaterial({ color: '#e7f5ff', transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.5, flatShading: true }),
  pickle: std('#5c8a2c'),
  brine: new THREE.MeshStandardMaterial({ color: '#d8e48a', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }),
  lid: std('#d4a017', { metalness: 0.6, roughness: 0.3 }),
  tin: std('#1f4fa8', { metalness: 0.5, roughness: 0.35 }),
  gnomeHat: std('#e03131'),
  gnomeBody: std('#2f6fd6'),
  skin: std('#f2c9a0'),
  beard: std('#f4f5fb'),
  pigeon: std('#8d93a3'),
  pigeonNeck: std('#5b8a7d', { metalness: 0.4 }),
  orange: std('#ff922b'),
  chair: std('#f4f5fb', { roughness: 0.3 }),
  bag: new THREE.MeshStandardMaterial({ color: '#f4f5fb', transparent: true, opacity: 0.85, roughness: 0.3 }),
  drum: std('#d6336c', { metalness: 0.3 }),
  cymbal: std('#e8b923', { metalness: 0.85, roughness: 0.25 }),
  cat: std('#ff9f43'),
  tvBody: std('#5c4033'),
  tape: new THREE.MeshStandardMaterial({ color: '#f1e6b8', transparent: true, opacity: 0.8, roughness: 0.6 }),
};

function hover(e: ThreeEvent<PointerEvent>, on: boolean) {
  e.stopPropagation();
  document.body.style.cursor = on ? 'pointer' : '';
}

/** Dywan na ścianie — klasyka polskiego salonu. */
function WallCarpet({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  const tex = useDispose(
    useMemo(
      () =>
        canvasTex(384, 256, (g) => {
          g.fillStyle = '#8f1d21';
          g.fillRect(0, 0, 384, 256);
          g.strokeStyle = '#e8c07a';
          g.lineWidth = 6;
          g.strokeRect(10, 10, 364, 236);
          g.strokeStyle = '#1d2f5c';
          g.lineWidth = 10;
          g.strokeRect(24, 24, 336, 208);
          for (let i = 0; i < 18; i++) {
            g.fillStyle = i % 2 ? '#e8c07a' : '#1d2f5c';
            g.fillRect(36 + i * 18, 36, 10, 10);
            g.fillRect(36 + i * 18, 210, 10, 10);
          }
          const diamond = (cx: number, cy: number, r: number, c: string) => {
            g.fillStyle = c;
            g.beginPath();
            g.moveTo(cx, cy - r);
            g.lineTo(cx + r * 1.4, cy);
            g.lineTo(cx, cy + r);
            g.lineTo(cx - r * 1.4, cy);
            g.closePath();
            g.fill();
          };
          diamond(192, 128, 70, '#e8c07a');
          diamond(192, 128, 52, '#1d2f5c');
          diamond(192, 128, 34, '#c2410c');
          diamond(192, 128, 14, '#e8c07a');
          for (const [x, y] of [
            [80, 80],
            [304, 80],
            [80, 176],
            [304, 176],
          ])
            diamond(x, y, 18, '#e8c07a');
        }),
      [],
    ),
  );
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh>
        <planeGeometry args={[2.4, 1.6]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.25, 0, 0.01]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[1.6, 0.1]} />
          <meshStandardMaterial color="#e8c07a" />
        </mesh>
      ))}
    </group>
  );
}

/** Wersalka z poduszką i reklamówką z reklamówkami. */
function Sofa({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.28, 0]} material={PROP.sofa} castShadow>
        <boxGeometry args={[2.3, 0.36, 0.85]} />
      </mesh>
      <mesh position={[0, 0.72, -0.34]} material={PROP.sofaDark} castShadow>
        <boxGeometry args={[2.3, 0.7, 0.2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.12, 0.5, 0.02]} material={PROP.sofaDark}>
          <boxGeometry args={[0.16, 0.5, 0.85]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} position={[s * 1.0, 0.05, 0.3]} material={PROP.darkWood}>
          <cylinderGeometry args={[0.04, 0.03, 0.1, 6]} />
        </mesh>
      ))}
      {/* poduszka z „dziubkiem” */}
      <mesh position={[-0.6, 0.62, -0.1]} rotation={[0.2, 0.3, Math.PI / 4]} scale={[1, 1, 0.45]} material={PROP.orange}>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
      </mesh>
      {/* reklamówka z reklamówkami */}
      <group position={[1.45, 0, 0.25]}>
        <mesh position={[0, 0.22, 0]} scale={[1, 1.2, 0.7]} material={PROP.bag}>
          <sphereGeometry args={[0.2, 10, 8]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.08, 0.46, 0]} material={PROP.bag}>
            <torusGeometry args={[0.06, 0.012, 4, 10, Math.PI]} />
          </mesh>
        ))}
        {[0.3, 0.38].map((y, i) => (
          <mesh key={y} position={[i ? 0.05 : -0.04, y, 0.02]} material={i ? PROP.red : PROP.tin} scale={[1, 0.6, 0.6]}>
            <sphereGeometry args={[0.07, 6, 5]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Meblościanka z kryształową misą. */
function WallUnit({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.05, 0]} material={PROP.wood} castShadow>
        <boxGeometry args={[2.0, 2.1, 0.5]} />
      </mesh>
      {/* witryna */}
      <mesh position={[0.45, 1.35, 0.26]} material={PROP.darkWood}>
        <boxGeometry args={[0.9, 0.9, 0.02]} />
      </mesh>
      <mesh position={[0.45, 1.35, 0.28]} material={PROP.glass}>
        <planeGeometry args={[0.82, 0.82]} />
      </mesh>
      <mesh position={[0.45, 1.12, 0.15]} rotation={[Math.PI, 0, 0]} material={PROP.crystal}>
        <sphereGeometry args={[0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[-0.1, 0.12].map((x) => (
        <mesh key={x} position={[0.45 + x * 2, 1.55, 0.12]} material={PROP.crystal}>
          <cylinderGeometry args={[0.06, 0.035, 0.18, 6]} />
        </mesh>
      ))}
      {/* szuflady */}
      {[0.35, 0.65].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.26]} material={PROP.darkWood}>
            <boxGeometry args={[1.8, 0.26, 0.02]} />
          </mesh>
          <mesh position={[0, y, 0.28]} material={PROP.lid}>
            <boxGeometry args={[0.2, 0.03, 0.03]} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.45, 1.35, 0.26]} material={PROP.darkWood}>
        <boxGeometry args={[0.9, 0.9, 0.02]} />
      </mesh>
      {/* serwetka i figurka na górze */}
      <mesh position={[-0.4, 2.11, 0]} material={PROP.white}>
        <cylinderGeometry args={[0.28, 0.28, 0.01, 12]} />
      </mesh>
      <mesh position={[-0.4, 2.22, 0]} material={PROP.white}>
        <coneGeometry args={[0.08, 0.22, 8]} />
      </mesh>
    </group>
  );
}

/** Słoik ogórków kiszonych na taborecie — kliknij, żeby chrupnąć. */
function PickleJar({ pos }: { pos: [number, number, number] }) {
  const jar = useRef<THREE.Group>(null!);
  const wobble = useRef(0);
  useFrame((_, dt) => {
    if (wobble.current > 0) {
      wobble.current = Math.max(0, wobble.current - dt);
      jar.current.rotation.z = Math.sin(wobble.current * 30) * wobble.current * 0.4;
    }
  });
  return (
    <group position={pos}>
      {/* taboret */}
      <mesh position={[0, 0.5, 0]} material={PROP.wood}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 14]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.2, 0.24, Math.sin((i * Math.PI * 2) / 3) * 0.2]} material={PROP.darkWood}>
          <cylinderGeometry args={[0.025, 0.03, 0.48, 6]} />
        </mesh>
      ))}
      <group
        ref={jar}
        position={[-0.06, 0.53, 0]}
        onClick={(e) => {
          e.stopPropagation();
          wobble.current = 0.6;
          play('crunch');
        }}
        onPointerOver={(e) => hover(e, true)}
        onPointerOut={(e) => hover(e, false)}
      >
        <mesh position={[0, 0.2, 0]} material={PROP.brine}>
          <cylinderGeometry args={[0.13, 0.13, 0.4, 14]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.6) * 0.06, 0.19, Math.sin(i * 1.6) * 0.06]} rotation={[0.1 * i, 0, 0.15 * (i - 1.5)]} material={PROP.pickle}>
            <capsuleGeometry args={[0.03, 0.22, 3, 6]} />
          </mesh>
        ))}
        <mesh position={[0, 0.42, 0]} material={PROP.lid}>
          <cylinderGeometry args={[0.135, 0.135, 0.04, 14]} />
        </mesh>
      </group>
      {/* puszka po ciastkach, w której są guziki */}
      <group position={[0.17, 0.53, 0.06]}>
        <mesh position={[0, 0.06, 0]} material={PROP.tin}>
          <cylinderGeometry args={[0.12, 0.12, 0.12, 16]} />
        </mesh>
        <SignText text="GUZIKI" w={0.2} h={0.06} pos={[0, 0.07, 0.121]} color="#ffe066" />
      </group>
    </group>
  );
}

/** Krasnal ogrodowy — kliknij, a podskoczy. */
function Gnome({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  const g = useRef<THREE.Group>(null!);
  const hop = useRef(0);
  useFrame((_, dt) => {
    if (hop.current > 0) {
      hop.current = Math.max(0, hop.current - dt);
      const t = 1 - hop.current / 0.7;
      g.current.position.y = Math.sin(t * Math.PI) * 0.5;
      g.current.rotation.y = t * Math.PI * 2;
    }
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <group
        ref={g}
        onClick={(e) => {
          e.stopPropagation();
          if (hop.current === 0) {
            hop.current = 0.7;
            play('boing');
          }
        }}
        onPointerOver={(e) => hover(e, true)}
        onPointerOut={(e) => hover(e, false)}
      >
        <mesh position={[0, 0.22, 0]} material={PROP.gnomeBody} castShadow>
          <cylinderGeometry args={[0.13, 0.19, 0.42, 10]} />
        </mesh>
        <mesh position={[0, 0.5, 0]} material={PROP.skin}>
          <sphereGeometry args={[0.13, 10, 8]} />
        </mesh>
        <mesh position={[0, 0.42, 0.08]} rotation={[Math.PI - 0.3, 0, 0]} material={PROP.beard}>
          <coneGeometry args={[0.12, 0.26, 8]} />
        </mesh>
        <mesh position={[0, 0.5, 0.13]} material={PROP.gnomeHat}>
          <sphereGeometry args={[0.035, 6, 5]} />
        </mesh>
        <mesh position={[0, 0.74, -0.02]} rotation={[-0.2, 0, 0]} material={PROP.gnomeHat}>
          <coneGeometry args={[0.14, 0.38, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/** Werbel z talerzem — „ba-dum-tss” po kliknięciu. */
function Rimshot({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  const cym = useRef<THREE.Mesh>(null!);
  const hit = useRef(0);
  useFrame((_, dt) => {
    if (hit.current > 0) {
      hit.current = Math.max(0, hit.current - dt);
      cym.current.rotation.x = 0.2 + Math.sin(hit.current * 40) * hit.current * 0.4;
    }
  });
  return (
    <group
      position={pos}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        hit.current = 1.2;
        play('rimshot');
      }}
      onPointerOver={(e) => hover(e, true)}
      onPointerOut={(e) => hover(e, false)}
    >
      <mesh position={[0, 0.55, 0]} material={PROP.drum}>
        <cylinderGeometry args={[0.3, 0.3, 0.22, 16]} />
      </mesh>
      <mesh position={[0, 0.665, 0]} material={PROP.white}>
        <cylinderGeometry args={[0.29, 0.29, 0.01, 16]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.2, 0.22, Math.sin((i * Math.PI * 2) / 3) * 0.2]} material={PROP.metal}>
          <cylinderGeometry args={[0.015, 0.015, 0.46, 4]} />
        </mesh>
      ))}
      <mesh position={[0.45, 0.6, -0.1]} material={PROP.metal}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 4]} />
      </mesh>
      <mesh ref={cym} position={[0.45, 1.2, -0.1]} rotation={[0.2, 0, 0]} material={PROP.cymbal}>
        <cylinderGeometry args={[0.02, 0.32, 0.04, 16]} />
      </mesh>
    </group>
  );
}

/** Gołąb, który co jakiś czas przechodzi przez studio. Kliknięty — grucha i podskakuje. */
function Pigeon({ from, to, z }: { from: number; to: number; z: number }) {
  const g = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const state = useRef({ t: -20, hop: 0 });
  const CYCLE = 55;
  const WALK = 16;
  useFrame(({ clock }, dt) => {
    const s = state.current;
    const t = (clock.elapsedTime + 25) % CYCLE;
    const walking = t < WALK;
    g.current.visible = walking;
    if (!walking) return;
    const k = t / WALK;
    const dir = Math.floor((clock.elapsedTime + 25) / CYCLE) % 2 ? -1 : 1;
    const x = dir === 1 ? from + (to - from) * k : to - (to - from) * k;
    g.current.position.set(x, 0, z + Math.sin(k * 9) * 0.25);
    g.current.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    head.current.position.z = 0.16 + Math.max(0, Math.sin(clock.elapsedTime * 9)) * 0.05;
    if (s.hop > 0) {
      s.hop = Math.max(0, s.hop - dt);
      g.current.position.y = Math.sin((1 - s.hop / 0.5) * Math.PI) * 0.35;
    }
  });
  return (
    <group
      ref={g}
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        state.current.hop = 0.5;
        play('coo');
      }}
      onPointerOver={(e) => hover(e, true)}
      onPointerOut={(e) => hover(e, false)}
    >
      <mesh position={[0, 0.17, 0]} scale={[0.75, 0.7, 1.15]} material={PROP.pigeon} castShadow>
        <sphereGeometry args={[0.13, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.2, -0.17]} rotation={[0.5, 0, 0]} material={PROP.pigeon}>
        <boxGeometry args={[0.12, 0.02, 0.14]} />
      </mesh>
      <group ref={head} position={[0, 0.3, 0.16]}>
        <mesh material={PROP.pigeonNeck}>
          <sphereGeometry args={[0.07, 8, 6]} />
        </mesh>
        <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={PROP.orange}>
          <coneGeometry args={[0.018, 0.06, 5]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.045, 0.02, 0.04]} material={PROP.black}>
            <sphereGeometry args={[0.012, 5, 4]} />
          </mesh>
        ))}
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.04, 0.04, 0]} material={PROP.orange}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 4]} />
        </mesh>
      ))}
    </group>
  );
}

/** Kot sąsiadki śpiący na wersalce (oddycha). Kliknięty — miauczy podskakując. */
function Cat({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  const body = useRef<THREE.Group>(null!);
  const hop = useRef(0);
  useFrame(({ clock }, dt) => {
    body.current.scale.y = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.04;
    if (hop.current > 0) {
      hop.current = Math.max(0, hop.current - dt);
      body.current.position.y = Math.sin((1 - hop.current / 0.45) * Math.PI) * 0.3;
    }
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <group
        ref={body}
        onClick={(e) => {
          e.stopPropagation();
          hop.current = 0.45;
          play('meow');
        }}
        onPointerOver={(e) => hover(e, true)}
        onPointerOut={(e) => hover(e, false)}
      >
        <mesh position={[0, 0.1, 0]} scale={[1.5, 0.75, 1]} material={PROP.cat}>
          <sphereGeometry args={[0.15, 10, 8]} />
        </mesh>
        <mesh position={[0.2, 0.15, 0.04]} material={PROP.cat}>
          <sphereGeometry args={[0.1, 10, 8]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.22, 0.25, 0.04 + s * 0.055]} material={PROP.cat}>
            <coneGeometry args={[0.035, 0.07, 4]} />
          </mesh>
        ))}
        {/* zamknięte oczka */}
        {[-1, 1].map((s) => (
          <mesh key={`e${s}`} position={[0.3, 0.16, 0.04 + s * 0.035]} rotation={[0, Math.PI / 2, 0]} material={PROP.black}>
            <boxGeometry args={[0.035, 0.008, 0.005]} />
          </mesh>
        ))}
        <mesh position={[-0.24, 0.08, 0.1]} rotation={[0, 0.6, Math.PI / 2]} material={PROP.cat}>
          <torusGeometry args={[0.12, 0.025, 5, 10, Math.PI * 1.2]} />
        </mesh>
      </group>
    </group>
  );
}

/** Telewizor kineskopowy z „śniegiem” i antenką. */
function CrtTv({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  const tex = useDispose(
    useMemo(() => {
      const t = canvasTex(64, 48, (g) => {
        const d = g.createImageData(64, 48);
        for (let i = 0; i < d.data.length; i += 4) {
          const v = Math.random() * 255;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
          d.data[i + 3] = 255;
        }
        g.putImageData(d, 0, 0);
      });
      if (t) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.magFilter = THREE.NearestFilter;
        t.repeat.set(0.5, 0.5);
      }
      return t;
    }, []),
  );
  useFrame(() => {
    if (tex) tex.offset.set(Math.random(), Math.random());
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.27, 0]} material={PROP.tvBody}>
        <boxGeometry args={[0.7, 0.54, 0.5]} />
      </mesh>
      <mesh position={[-0.07, 0.29, 0.251]}>
        <planeGeometry args={[0.46, 0.38]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[0.1, 0.22].map((y) => (
        <mesh key={y} position={[0.25, y + 0.1, 0.26]} rotation={[Math.PI / 2, 0, 0]} material={PROP.black}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 8]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0.72, 0]} rotation={[0, 0, -s * 0.45]} material={PROP.metal}>
          <cylinderGeometry args={[0.008, 0.008, 0.45, 4]} />
        </mesh>
      ))}
    </group>
  );
}

/** Napis na kartonie przyklejony do ściany. */
function Cardboard({ pos, lines, w = 1.9, h = 0.8, rotZ = 0 }: { pos: [number, number, number]; lines: string[]; w?: number; h?: number; rotZ?: number }) {
  const tex = useDispose(
    useMemo(
      () =>
        canvasTex(512, Math.round((512 * h) / w), (g) => {
          const H = Math.round((512 * h) / w);
          g.fillStyle = '#c9a26b';
          g.fillRect(0, 0, 512, H);
          g.fillStyle = 'rgba(0,0,0,.06)';
          for (let x = 0; x < 512; x += 10) g.fillRect(x, 0, 4, H);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#1e2a78';
          const size = Math.min(64, (H / lines.length) * 0.62);
          g.font = `700 ${size}px "Comic Sans MS", "Chalkboard SE", ${FONT}`;
          lines.forEach((l, i) => g.fillText(l, 256, (H / lines.length) * (i + 0.5)));
        }),
      [lines.join('|'), w, h],
    ),
  );
  return (
    <group position={pos} rotation={[0, 0, rotZ]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      {/* taśma klejąca */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.05), h / 2 - 0.03, 0.005]} rotation={[0, 0, s * 0.6]} material={PROP.tape}>
          <planeGeometry args={[0.3, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}

/** Ramka „Sigma miesiąca” z podobizną krasnala. */
function EmployeeFrame({ pos }: { pos: [number, number, number] }) {
  const tex = useDispose(
    useMemo(
      () =>
        canvasTex(256, 320, (g) => {
          g.fillStyle = '#f4ecd8';
          g.fillRect(0, 0, 256, 320);
          g.textAlign = 'center';
          g.fillStyle = '#1e2a78';
          g.font = `800 26px ${FONT}`;
          g.fillText('SIGMA', 128, 36);
          g.fillText('MIESIĄCA', 128, 64);
          // krasnal
          g.fillStyle = '#e03131';
          g.beginPath();
          g.moveTo(128, 90);
          g.lineTo(88, 170);
          g.lineTo(168, 170);
          g.fill();
          g.fillStyle = '#f2c9a0';
          g.beginPath();
          g.arc(128, 185, 30, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.moveTo(98, 195);
          g.lineTo(158, 195);
          g.lineTo(128, 265);
          g.fill();
          g.fillStyle = '#15151c';
          g.fillRect(114, 178, 6, 6);
          g.fillRect(136, 178, 6, 6);
          g.font = `700 22px ${FONT}`;
          g.fillStyle = '#7a4a2a';
          g.fillText('Krasnal Zenek', 128, 300);
        }),
      [],
    ),
  );
  return (
    <group position={pos}>
      <mesh position={[0, 0, -0.02]} material={PROP.lid}>
        <boxGeometry args={[0.72, 0.88, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[0.62, 0.78]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Zegar ścienny pokazujący prawdziwą godzinę. */
function WallClock({ pos }: { pos: [number, number, number] }) {
  const hour = useRef<THREE.Mesh>(null!);
  const minute = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    const h = (d.getHours() % 12) + m / 60;
    minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    hour.current.rotation.z = -(h / 12) * Math.PI * 2;
  });
  return (
    <group position={pos}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={PROP.darkWood}>
        <cylinderGeometry args={[0.36, 0.36, 0.06, 24]} />
      </mesh>
      <mesh position={[0, 0, 0.032]} material={PROP.white}>
        <circleGeometry args={[0.31, 24]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 6) * 0.26, Math.cos((i * Math.PI) / 6) * 0.26, 0.035]} rotation={[0, 0, (-i * Math.PI) / 6]} material={PROP.black}>
          <planeGeometry args={[0.02, i % 3 ? 0.04 : 0.07]} />
        </mesh>
      ))}
      <group position={[0, 0, 0.04]}>
        <mesh ref={hour} material={PROP.black}>
          <boxGeometry args={[0.025, 0.36, 0.005]} />
        </mesh>
        <mesh ref={minute} position={[0, 0, 0.004]} material={PROP.black}>
          <boxGeometry args={[0.016, 0.5, 0.005]} />
        </mesh>
      </group>
    </group>
  );
}

/** Sandały ze skarpetami — must have każdego wujka. */
function SocksSandals({ pos, rotY }: { pos: [number, number, number]; rotY: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.12, 0, 0]}>
          <mesh position={[0, 0.02, 0]} material={PROP.darkWood}>
            <boxGeometry args={[0.12, 0.03, 0.3]} />
          </mesh>
          <mesh position={[0, 0.07, 0.02]} scale={[1, 0.7, 1.9]} material={PROP.white}>
            <sphereGeometry args={[0.06, 8, 6]} />
          </mesh>
          <mesh position={[0, 0.16, -0.06]} material={PROP.white}>
            <cylinderGeometry args={[0.05, 0.055, 0.2, 8]} />
          </mesh>
          {[0.05, -0.06].map((z) => (
            <mesh key={z} position={[0, 0.09, z]} material={PROP.darkWood}>
              <boxGeometry args={[0.14, 0.02, 0.03]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ───────────────────────────── całe studio ─────────────────────────────

export function Studio({ layout, phase, low }: { layout: PodiumLayout; phase: Phase; low: boolean }) {
  const { size } = useThree();
  const { minX, maxX, minZ, maxZ, maxTop } = layout.bounds;
  const W = Math.max(Math.abs(minX), Math.abs(maxX), 2.2);
  const cz = (minZ + maxZ) / 2;
  const aspect = size.width / Math.max(1, size.height);
  const frame = useMemo(() => computeCameraFrame(layout, aspect), [layout, aspect]);
  const [, camY, camZ] = frame.position;
  const tanH = Math.tan((19 * Math.PI) / 180) * aspect;
  /** Połowa widocznej szerokości kadru na danej głębokości. */
  const vis = (z: number) => (camZ - z) * tanH;
  const backZ = minZ - 7;
  // Pas ściany widoczny nad głowami postaci (i nickami) w tylnym rzędzie.
  const headY = maxTop + 2.75;
  const slope = (camY - headY) / (camZ - minZ);
  const bandBottom = headY - slope * (minZ - backZ);
  // Górna granica: pod banerem etapu (~64 px u góry areny).
  const dist = camZ - backZ;
  const bannerAngle = (64 / Math.max(200, size.height)) * ((38 * Math.PI) / 180);
  const bandTop = camY - dist * Math.tan(bannerAngle + 0.01);
  const band = Math.max(1.0, bandTop - bandBottom);
  const visBack = vis(backZ);
  // Szeroki pasek LED (logo 8:1 + pasek wiadomości).
  const screenW = Math.min((band - 0.15) * 0.78 * 8, visBack * 2 - 5.5, 2 * W + 4);
  const screenHh = screenW / 8 / 0.78;
  const screenY = bandBottom + 0.1 + screenHh / 2;
  const signX = screenW / 2 + 1.0;
  const live = phase !== 'lobby';
  const applause = phase === 'reveal' || phase === 'ended';
  // Rekwizyty po bokach, tuż za sceną — tam, gdzie kadr na pewno je obejmuje.
  const pz = minZ - 2.6;
  const px = Math.max(W + 1.6, Math.min(W + 3.2, vis(pz) - 1.4));
  const wallSide = Math.min(visBack - 1.4, signX + 2.4);
  // Zaokrąglenie ściany: środek walca przed sceną, ściana dotyka backZ na osi.
  const wallR = Math.max(18, visBack * 1.3);
  const wallCz = backZ + wallR;
  const halfAngle = Math.asin(Math.min(0.97, (visBack + 5) / wallR));
  /** Pozycja i obrót elementu wiszącego na ścianie (styczny do łuku). */
  const onWall = (x: number, y: number, off = 0.1) => {
    const z = wallCz - Math.sqrt(Math.max(0, wallR * wallR - x * x)) + off;
    return { position: [x, y, z] as [number, number, number], rotation: [0, Math.atan2(-x, wallCz - z), 0] as [number, number, number] };
  };
  // Płaski ekran wisi przed łukiem — krawędzie dotykają ściany.
  const screenZ = wallCz - Math.sqrt(Math.max(0, wallR * wallR - (screenW / 2) ** 2)) + 0.15;
  const beamXs = useMemo(() => {
    const n = W > 5 ? 6 : 4;
    return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * ((2 * W) / (n - 1)) * 0.9);
  }, [W]);
  return (
    <>
      <StageFloor rx={W + 1.6} rz={Math.max(3.2, (maxZ - minZ) / 2 + 2)} cz={cz} low={low} />
      <BackWall radius={wallR} cz={wallCz} height={camY + 6} halfAngle={halfAngle} />
      <LedScreen phase={phase} width={screenW} height={screenHh} y={screenY} z={screenZ} />
      <group {...onWall(-signX, screenY + 0.3, 0.2)}>
        <LightSign text="NA ŻYWO" on={live} pos={[0, 0, 0]} color="#e03131" />
      </group>
      <group {...onWall(signX, screenY + 0.3, 0.2)}>
        <LightSign text="BRAWA!" on={applause} blink pos={[0, 0, 0]} color="#e8a400" />
      </group>
      <group {...onWall(-signX, screenY - 0.45, 0.12)}>
        <Cardboard pos={[0, 0, 0]} lines={['AURA', '+1000']} w={1.5} h={0.6} rotZ={0.04} />
      </group>
      <group {...onWall(signX, screenY - 0.45, 0.12)}>
        <Cardboard pos={[0, 0, 0]} lines={['NO CAP,', 'TO NIE JA']} w={1.5} h={0.6} rotZ={-0.04} />
      </group>
      {!low && <Beams xs={beamXs} z={minZ - 1.2} top={camY + 4} />}

      {/* na ścianie po bokach */}
      <group {...onWall(-wallSide, Math.max(1.4, bandBottom + 0.2), 0.08)}>
        <WallCarpet pos={[0, 0, 0]} rotY={0} />
      </group>
      <group {...onWall(wallSide - 0.7, Math.max(1.5, bandBottom + 0.3), 0.08)}>
        <EmployeeFrame pos={[0, 0, 0]} />
      </group>
      <group {...onWall(wallSide + 0.6, Math.max(2.4, bandBottom + 1.1), 0.08)}>
        <WallClock pos={[0, 0, 0]} />
      </group>

      {/* lewa strona: salon jak u babci */}
      <Sofa pos={[-px - 0.6, 0, pz - 0.6]} rotY={0} />
      <Cat pos={[-px - 0.2, 0.46, pz - 0.55]} rotY={0} />
      <SocksSandals pos={[-px - 0.9, 0, pz + 0.3]} rotY={0.2} />
      <PickleJar pos={[-W - 1.3, 0, maxZ - 0.4]} />

      {/* prawa strona */}
      <WallUnit pos={[px + 0.7, 0, pz - 0.9]} rotY={0} />
      <CrtTv pos={[px + 0.25, 2.1, pz - 0.95]} rotY={0} />
      <Gnome pos={[px + 1.5, 0, pz + 0.4]} rotY={-0.3} />
      <Rimshot pos={[W + 1.3, 0, maxZ - 0.4]} rotY={-0.3} />

      <Pigeon from={-vis(cz + 2.6)} to={vis(cz + 2.6)} z={Math.max(maxZ + 1.4, cz + 2.6)} />
    </>
  );
}
