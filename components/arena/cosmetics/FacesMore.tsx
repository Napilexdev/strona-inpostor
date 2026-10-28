'use client';

/**
 * Dodatkowe dodatki na twarz (indeksy 14–63 w `FACES`).
 * Oczy: x ±0.12, y 0.04, przód oka z ≈ 0.36. Usta: y ≈ −0.15, z ≈ 0.3. Nos: y ≈ −0.04.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { X, col, onHead } from './mats';

const EYE_Y = 0.045;
const LENS_Z = 0.395;

function Ring({ r, t = 0.016, mat, segs = 20 }: { r: number; t?: number; mat: THREE.Material; segs?: number }) {
  return (
    <mesh material={mat}>
      <torusGeometry args={[r, t, 6, segs]} />
    </mesh>
  );
}

function useShape(build: (s: THREE.Shape) => void, key: string) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const sh = new THREE.Shape();
    build(sh);
    return new THREE.ShapeGeometry(sh, 8);
  }, [key]);
}

function HeartSpecs() {
  const heart = useShape((s) => {
    s.moveTo(0, -0.075);
    s.bezierCurveTo(-0.03, -0.045, -0.1, -0.01, -0.1, 0.03);
    s.bezierCurveTo(-0.1, 0.08, -0.04, 0.09, 0, 0.05);
    s.bezierCurveTo(0.04, 0.09, 0.1, 0.08, 0.1, 0.03);
    s.bezierCurveTo(0.1, -0.01, 0.03, -0.045, 0, -0.075);
  }, 'heart');
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff3b6b', transparent: true, opacity: 0.75, side: THREE.DoubleSide, roughness: 0.1 }), []);
  return (
    <group position={[0, EYE_Y, LENS_Z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.125, 0, 0]}>
          <mesh geometry={heart} material={lens} />
          <mesh geometry={heart} position={[0, 0, -0.004]} scale={1.18} material={X.hotPink} />
        </group>
      ))}
      <mesh material={X.hotPink}>
        <boxGeometry args={[0.06, 0.018, 0.018]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * 0.27, 0, -0.18]} rotation={[0, s * 0.286, 0]} material={X.hotPink}>
          <boxGeometry args={[0.02, 0.02, 0.36]} />
        </mesh>
      ))}
    </group>
  );
}

function StarSpecs() {
  const star = useShape((s) => {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.045 : 0.105;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }, 'star');
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd43b', transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.1 }), []);
  return (
    <group position={[0, EYE_Y, LENS_Z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.13, 0, 0]}>
          <mesh geometry={star} material={lens} />
          <mesh geometry={star} position={[0, 0, -0.004]} scale={1.15} material={X.purple} />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * 0.27, 0, -0.18]} rotation={[0, s * 0.286, 0]} material={X.purple}>
          <boxGeometry args={[0.02, 0.02, 0.36]} />
        </mesh>
      ))}
    </group>
  );
}

function Temples({ mat }: { mat: THREE.Material }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.27, EYE_Y, LENS_Z - 0.18]} rotation={[0, s * 0.286, 0]} material={mat}>
          <boxGeometry args={[0.02, 0.02, 0.36]} />
        </mesh>
      ))}
    </>
  );
}

/** Płaski element malowany na skórze (stycznie do głowy). */
function Paint({ yaw, y, w, h, mat, rot = 0, lift = 0.004 }: { yaw: number; y: number; w: number; h: number; mat: THREE.Material; rot?: number; lift?: number }) {
  const p = onHead(yaw, y, lift);
  return (
    <group position={p.position} rotation={p.rotation}>
      <mesh rotation={[0, 0, rot]} material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}

function Dot({ yaw, y, r, mat, lift = 0.004 }: { yaw: number; y: number; r: number; mat: THREE.Material; lift?: number }) {
  const p = onHead(yaw, y, lift);
  return (
    <group position={p.position} rotation={p.rotation}>
      <mesh material={mat}>
        <circleGeometry args={[r, 14]} />
      </mesh>
    </group>
  );
}

const MOUTH: [number, number, number] = [0, -0.15, 0.31];

/** Pręt między dwoma punktami (np. pałąk mikrofonu). */
function Rod({ from, to, r, mat }: { from: [number, number, number]; to: [number, number, number]; r: number; mat: THREE.Material }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={q} material={mat}>
      <cylinderGeometry args={[r, r, dir.length(), 6]} />
    </mesh>
  );
}

export function FaceMore({ kind }: { kind: number }) {
  switch (kind) {
    case 14: // okulary okrągłe
      return (
        <group>
          <group position={[0, EYE_Y, LENS_Z]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.125, 0, 0]}>
                <Ring r={0.085} t={0.009} mat={X.gold} />
                <mesh material={X.glass}>
                  <circleGeometry args={[0.083, 18]} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={X.gold}>
              <torusGeometry args={[0.025, 0.007, 4, 8, Math.PI]} />
            </mesh>
          </group>
          <Temples mat={X.gold} />
        </group>
      );
    case 15: // okulary serduszka
      return <HeartSpecs />;
    case 16: // okulary gwiazdki
      return <StarSpecs />;
    case 17: // okulary kujona
      return (
        <group>
          <group position={[0, EYE_Y, LENS_Z]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.13, 0, 0]}>
                <mesh material={X.black}>
                  <boxGeometry args={[0.2, 0.15, 0.025]} />
                </mesh>
                <mesh position={[0, 0, 0.014]} material={X.glass}>
                  <planeGeometry args={[0.15, 0.1]} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0, 0.016]} material={X.white}>
              <boxGeometry args={[0.07, 0.05, 0.01]} />
            </mesh>
          </group>
          <Temples mat={X.black} />
        </group>
      );
    case 18: // okulary pilotki
      return (
        <group>
          <group position={[0, EYE_Y - 0.005, LENS_Z]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.125, 0, 0]}>
                <mesh scale={[1, 0.85, 1]} rotation={[0, 0, s * 0.25]} material={X.gold}>
                  <torusGeometry args={[0.085, 0.008, 5, 20]} />
                </mesh>
                <mesh scale={[1, 0.85, 1]} material={col('#4a3b20', { transparent: true, opacity: 0.8, metalness: 0.6, roughness: 0.1 })}>
                  <circleGeometry args={[0.083, 20]} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.06, 0]} material={X.gold}>
              <boxGeometry args={[0.1, 0.01, 0.01]} />
            </mesh>
          </group>
          <Temples mat={X.gold} />
        </group>
      );
    case 19: // okulary pikselowe
      return (
        <group position={[0, EYE_Y, LENS_Z]}>
          <mesh position={[0, 0.04, 0]} material={X.black}>
            <boxGeometry args={[0.5, 0.035, 0.02]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, 0, 0]}>
              {[
                [0, 0.005, 0.16, 0.035],
                [0.01, -0.03, 0.12, 0.035],
                [0.02, -0.065, 0.07, 0.035],
              ].map(([x, y, w, h], i) => (
                <mesh key={i} position={[x * s * -1, y, 0]} material={X.black}>
                  <boxGeometry args={[w, h, 0.02]} />
                </mesh>
              ))}
              <mesh position={[-0.04 * s, 0.005, 0.012]} material={X.white}>
                <boxGeometry args={[0.03, 0.03, 0.005]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 20: // okulary kocie
      return (
        <group>
          <group position={[0, EYE_Y, LENS_Z]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.125, 0, 0]}>
                <mesh scale={[1.15, 0.75, 1]} material={X.hotPink}>
                  <torusGeometry args={[0.08, 0.014, 6, 20]} />
                </mesh>
                <mesh position={[s * 0.09, 0.055, 0]} rotation={[0, 0, -s * 0.6]} material={X.hotPink}>
                  <coneGeometry args={[0.03, 0.07, 4]} />
                </mesh>
                <mesh scale={[1.15, 0.75, 1]} material={X.darkGlass}>
                  <circleGeometry args={[0.078, 18]} />
                </mesh>
              </group>
            ))}
          </group>
          <Temples mat={X.hotPink} />
        </group>
      );
    case 21: // wizjer laserowy
      return (
        <group position={[0, EYE_Y, 0]}>
          <mesh material={X.black}>
            <cylinderGeometry args={[0.352, 0.352, 0.13, 26, 1, true, -1.3, 2.6]} />
          </mesh>
          <mesh material={X.glowRed}>
            <cylinderGeometry args={[0.356, 0.356, 0.04, 26, 1, true, -1.1, 2.2]} />
          </mesh>
        </group>
      );
    case 22: // gogle VR
      return (
        <group position={[0, EYE_Y + 0.01, 0]}>
          <mesh position={[0, 0, 0.38]} material={X.white}>
            <boxGeometry args={[0.46, 0.2, 0.16]} />
          </mesh>
          <mesh position={[0, 0, 0.462]} material={X.black}>
            <planeGeometry args={[0.42, 0.16]} />
          </mesh>
          <mesh material={X.rubber}>
            <cylinderGeometry args={[0.35, 0.35, 0.06, 24, 1, true]} />
          </mesh>
          <mesh position={[0.17, 0.05, 0.464]} material={X.glowCyan}>
            <circleGeometry args={[0.012, 8]} />
          </mesh>
        </group>
      );
    case 23: // maska do nurkowania
      return (
        <group>
          <mesh position={[0, EYE_Y, 0.39]} scale={[1.6, 1, 0.4]} material={X.glass}>
            <sphereGeometry args={[0.13, 18, 12]} />
          </mesh>
          <mesh position={[0, EYE_Y, 0.37]} scale={[1.6, 1, 1]} material={X.blue}>
            <torusGeometry args={[0.13, 0.025, 6, 22]} />
          </mesh>
          <mesh position={[0, EYE_Y, 0]} material={X.blue}>
            <cylinderGeometry args={[0.35, 0.35, 0.05, 24, 1, true]} />
          </mesh>
          <mesh position={[0.3, 0.12, 0.2]} rotation={[0, 0, -0.15]} material={X.yellow}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
          </mesh>
          <mesh position={[0.3, 0.38, 0.2]} material={X.orange}>
            <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
          </mesh>
        </group>
      );
    case 24: // maska gazowa
      return (
        <group>
          <mesh position={[0, -0.04, 0.27]} scale={[1.2, 1, 0.7]} material={X.rubber}>
            <sphereGeometry args={[0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.12, EYE_Y, 0.37]}>
              <mesh material={X.steel}>
                <torusGeometry args={[0.07, 0.016, 6, 16]} />
              </mesh>
              <mesh material={X.darkGlass}>
                <circleGeometry args={[0.068, 16]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, -0.18, 0.42]} rotation={[Math.PI / 2 + 0.4, 0, 0]} material={X.grey}>
            <cylinderGeometry args={[0.07, 0.08, 0.1, 14]} />
          </mesh>
        </group>
      );
    case 25: // maska hokejowa
      return (
        <group>
          <mesh position={[0, -0.02, 0.06]} scale={[0.95, 1.15, 1]} material={X.white}>
            <sphereGeometry args={[0.33, 20, 14, -1.3 + Math.PI / 2, 2.6, 0.5, 2.2]} />
          </mesh>
          {[
            [-0.12, EYE_Y, 0.06, 0.04],
            [0.12, EYE_Y, 0.06, 0.04],
          ].map(([x, y, w, h], i) => (
            <mesh key={i} position={[x, y, 0.385]} material={X.black}>
              <planeGeometry args={[w, h]} />
            </mesh>
          ))}
          {[-0.1, -0.03, 0.04].map((y) =>
            [-0.08, 0, 0.08].map((x) => (
              <mesh key={`${x}${y}`} position={[x, y - 0.12, 0.37]} material={X.black}>
                <circleGeometry args={[0.012, 8]} />
              </mesh>
            )),
          )}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.06, 0.2, 0.33]} rotation={[-0.6, 0, s * 0.5]} material={X.red}>
              <planeGeometry args={[0.03, 0.07]} />
            </mesh>
          ))}
        </group>
      );
    case 26: // maska balowa
      return (
        <group position={[0, EYE_Y, 0]}>
          <mesh material={X.purple}>
            <cylinderGeometry args={[0.356, 0.356, 0.12, 26, 1, true, -0.9, 1.8]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.12, 0, 0.36]} material={X.gold}>
              <torusGeometry args={[0.05, 0.01, 6, 14]} />
            </mesh>
          ))}
          <mesh position={[0.24, 0.12, 0.3]} rotation={[0, 0.5, -0.6]} scale={[0.25, 1, 0.1]} material={X.hotPink}>
            <sphereGeometry args={[0.12, 8, 8]} />
          </mesh>
        </group>
      );
    case 27: // maska bandyty
      return (
        <group position={[0, EYE_Y, 0]}>
          <mesh material={X.black}>
            <cylinderGeometry args={[0.356, 0.356, 0.11, 26, 1, true]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.06, -0.02, -0.37]} rotation={[0.2, 0, s * 0.5]} material={X.black}>
              <boxGeometry args={[0.04, 0.16, 0.01]} />
            </mesh>
          ))}
        </group>
      );
    case 28: // chusta na usta
      return (
        <group>
          <mesh position={[0, -0.12, 0]} material={X.red}>
            <cylinderGeometry args={[0.35, 0.33, 0.2, 26, 1, true]} />
          </mesh>
          <mesh position={[0, -0.26, 0.24]} rotation={[0.3, 0, 0]} material={X.red}>
            <coneGeometry args={[0.15, 0.18, 4]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[-0.12 + i * 0.08, -0.1, 0.345]} material={X.white}>
              <circleGeometry args={[0.012, 8]} />
            </mesh>
          ))}
        </group>
      );
    case 29: // świński nosek
      return (
        <group position={[0, -0.04, 0.34]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={X.pink}>
            <cylinderGeometry args={[0.07, 0.07, 0.07, 16]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.025, 0, 0.037]} material={X.darkRed}>
              <circleGeometry args={[0.014, 8]} />
            </mesh>
          ))}
        </group>
      );
    case 30: // wielki nos
      return (
        <mesh position={[0, -0.04, 0.36]} scale={[1, 0.9, 1]} material={col('#e8a07a')}>
          <sphereGeometry args={[0.1, 16, 12]} />
        </mesh>
      );
    case 31: // długi nos kłamczucha
      return (
        <mesh position={[0, -0.03, 0.5]} rotation={[Math.PI / 2, 0, 0]} material={col('#e0a77c')}>
          <coneGeometry args={[0.035, 0.32, 10]} />
        </mesh>
      );
    case 32: // psi nos z językiem
      return (
        <group>
          <mesh position={[0, -0.04, 0.35]} scale={[1.3, 0.85, 1]} material={X.black}>
            <sphereGeometry args={[0.055, 12, 10]} />
          </mesh>
          <mesh position={[0, -0.22, 0.31]} rotation={[0.6, 0, 0]} scale={[1, 1.5, 0.35]} material={X.hotPink}>
            <sphereGeometry args={[0.05, 10, 8]} />
          </mesh>
        </group>
      );
    case 33: // smoczek
      return (
        <group position={[0, -0.16, 0.33]}>
          <mesh material={X.blue}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={X.blue}>
            <cylinderGeometry args={[0.075, 0.075, 0.015, 18]} />
          </mesh>
          <mesh position={[0, 0, 0.04]} material={X.white}>
            <torusGeometry args={[0.04, 0.012, 6, 14]} />
          </mesh>
        </group>
      );
    case 34: // lizak
      return (
        <group position={[0.06, -0.17, 0.33]} rotation={[0, 0, -0.5]}>
          <mesh position={[0, 0.08, 0.02]} rotation={[0.3, 0, 0]} material={X.white}>
            <cylinderGeometry args={[0.008, 0.008, 0.18, 5]} />
          </mesh>
          <mesh position={[0, 0.2, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={X.hotPink}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 18]} />
          </mesh>
          <mesh position={[0, 0.2, 0.062]} material={X.white}>
            <torusGeometry args={[0.04, 0.008, 4, 14, Math.PI * 1.5]} />
          </mesh>
        </group>
      );
    case 35: // guma balonowa
      return (
        <mesh position={[0, -0.16, 0.42]} material={col('#ff9ad1', { transparent: true, opacity: 0.85, roughness: 0.2 })}>
          <sphereGeometry args={[0.12, 18, 14]} />
        </mesh>
      );
    case 36: // wykałaczka
      return (
        <mesh position={[0.08, -0.15, 0.35]} rotation={[0.3, 0.5, -1.2]} material={X.tan}>
          <cylinderGeometry args={[0.005, 0.005, 0.18, 4]} />
        </mesh>
      );
    case 37: // róża w zębach
      return (
        <group position={[0, -0.15, 0.33]} rotation={[0, 0, 0.15]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={X.green}>
            <cylinderGeometry args={[0.008, 0.008, 0.36, 5]} />
          </mesh>
          <mesh position={[0.19, 0.01, 0]} material={X.red}>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
          <mesh position={[-0.05, 0.02, 0.01]} rotation={[0, 0, 0.6]} scale={[1, 0.4, 0.2]} material={X.green}>
            <sphereGeometry args={[0.04, 6, 5]} />
          </mesh>
        </group>
      );
    case 38: // gwizdek
      return (
        <group position={[0, -0.16, 0.36]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={X.silver}>
            <cylinderGeometry args={[0.025, 0.025, 0.09, 10]} />
          </mesh>
          <mesh position={[0.03, -0.01, 0.04]} material={X.silver}>
            <sphereGeometry args={[0.04, 10, 8]} />
          </mesh>
        </group>
      );
    case 39: // kartonik soku
      return (
        <group position={[0.12, -0.24, 0.4]} rotation={[0, -0.3, 0.1]}>
          <mesh material={X.orange}>
            <boxGeometry args={[0.1, 0.14, 0.07]} />
          </mesh>
          <mesh position={[0, 0.01, 0.036]} material={X.yellow}>
            <circleGeometry args={[0.03, 10]} />
          </mesh>
          <mesh position={[-0.03, 0.12, -0.02]} rotation={[0.3, 0, 0.5]} material={X.white}>
            <cylinderGeometry args={[0.007, 0.007, 0.16, 5]} />
          </mesh>
        </group>
      );
    case 40: // aparat na zębach
      return (
        <group position={MOUTH}>
          <mesh rotation={[0.4, 0, 0]} material={X.white}>
            <boxGeometry args={[0.12, 0.035, 0.01]} />
          </mesh>
          <mesh position={[0, 0, 0.007]} material={X.silver}>
            <boxGeometry args={[0.13, 0.006, 0.008]} />
          </mesh>
          {[-0.045, -0.015, 0.015, 0.045].map((x) => (
            <mesh key={x} position={[x, 0, 0.01]} material={X.silver}>
              <boxGeometry args={[0.012, 0.014, 0.01]} />
            </mesh>
          ))}
        </group>
      );
    case 41: // kły wampira
      return (
        <group position={[0, -0.17, 0.3]} rotation={[0.4, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.035, -0.02, 0.012]} rotation={[Math.PI, 0, 0]} material={X.white}>
              <coneGeometry args={[0.014, 0.05, 6]} />
            </mesh>
          ))}
        </group>
      );
    case 42: // złoty ząb
      return (
        <group position={[0, -0.17, 0.3]} rotation={[0.45, 0, 0]}>
          <mesh material={X.white}>
            <boxGeometry args={[0.1, 0.03, 0.01]} />
          </mesh>
          <mesh position={[0.025, 0, 0.006]} material={X.gold}>
            <boxGeometry args={[0.024, 0.03, 0.01]} />
          </mesh>
        </group>
      );
    case 43: // wystające zęby
      return (
        <group position={[0, -0.18, 0.31]} rotation={[0.35, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.018, -0.02, 0.008]} material={X.white}>
              <boxGeometry args={[0.032, 0.05, 0.012]} />
            </mesh>
          ))}
        </group>
      );
    case 44: // język na wierzchu
      return (
        <mesh position={[0.03, -0.21, 0.31]} rotation={[0.9, 0, 0.2]} scale={[1, 1.4, 0.3]} material={X.hotPink}>
          <sphereGeometry args={[0.045, 12, 10]} />
        </mesh>
      );
    case 45: // malunek wojenny
      return (
        <group>
          {[-1, 1].flatMap((s) =>
            [-0.02, -0.07].map((y) => <Paint key={`${s}${y}`} yaw={s * 0.55} y={y} w={0.12} h={0.022} mat={X.black} />),
          )}
          <Paint yaw={0} y={0.15} w={0.03} h={0.1} mat={X.black} />
        </group>
      );
    case 46: // barwy kibica
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Paint yaw={s * 0.55} y={-0.03} w={0.1} h={0.035} mat={col('#ffffff')} lift={0.004} />
              <Paint yaw={s * 0.55} y={-0.065} w={0.1} h={0.035} mat={col('#dc143c')} lift={0.004} />
            </group>
          ))}
        </group>
      );
    case 47: // paski tygrysa
      return (
        <group>
          {[-1, 1].flatMap((s) =>
            [0.02, -0.04, -0.1].map((y, i) => (
              <Paint key={`${s}${y}`} yaw={s * (0.75 + i * 0.05)} y={y} w={0.13 - i * 0.02} h={0.02} rot={s * 0.3} mat={X.black} />
            )),
          )}
          <Paint yaw={0} y={0.2} w={0.025} h={0.1} mat={X.black} />
        </group>
      );
    case 48: // makijaż klauna
      return (
        <group>
          {[-1, 1].map((s) => (
            <Dot key={s} yaw={s * 0.35} y={0.05} r={0.07} mat={X.paintWhite} lift={0.003} />
          ))}
          <mesh position={[0, -0.04, 0.35]} material={X.red}>
            <sphereGeometry args={[0.055, 12, 10]} />
          </mesh>
          <mesh position={[0, -0.15, 0.305]} rotation={[0.5, 0, Math.PI]} material={X.red}>
            <torusGeometry args={[0.08, 0.02, 6, 16, Math.PI]} />
          </mesh>
        </group>
      );
    case 49: // czerwona szminka
      return (
        <group position={[0, -0.155, 0.305]} rotation={[0.45, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.022, 0.012, 0]} scale={[1, 0.6, 0.5]} material={X.red}>
              <sphereGeometry args={[0.03, 10, 8]} />
            </mesh>
          ))}
          <mesh position={[0, -0.014, 0]} scale={[1.6, 0.6, 0.5]} material={X.red}>
            <sphereGeometry args={[0.03, 10, 8]} />
          </mesh>
        </group>
      );
    case 50: // kolczyki koła
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.345, -0.13, 0.02]} rotation={[0, Math.PI / 2, 0]} material={X.gold}>
              <torusGeometry args={[0.055, 0.009, 6, 18]} />
            </mesh>
          ))}
        </group>
      );
    case 51: // kolczyk w nosie
      return (
        <mesh position={[0.025, -0.075, 0.338]} rotation={[0.3, 0.4, 0]} material={X.gold}>
          <torusGeometry args={[0.028, 0.007, 6, 14]} />
        </mesh>
      );
    case 52: // kolczyk w brwi
      return (
        <group position={[-0.17, 0.15, 0.29]} rotation={[0, -0.5, 0]}>
          <mesh material={X.silver}>
            <sphereGeometry args={[0.01, 6, 5]} />
          </mesh>
          <mesh position={[0, 0.04, 0]} material={X.silver}>
            <sphereGeometry args={[0.01, 6, 5]} />
          </mesh>
        </group>
      );
    case 53: // blizna
      return (
        <group>
          <Paint yaw={0.42} y={0.05} w={0.022} h={0.28} rot={0.3} mat={col('#8f2f3a')} lift={0.032} />
          {[-0.07, 0, 0.07].map((d) => (
            <Paint key={d} yaw={0.42 + d * 0.32} y={0.05 + d} w={0.07} h={0.012} rot={0.3} mat={col('#8f2f3a')} lift={0.034} />
          ))}
        </group>
      );
    case 54: // kropla potu
      return (
        <group position={[0.25, 0.18, 0.25]} rotation={[0, 0.6, 0.2]}>
          <mesh position={[0, -0.02, 0]} material={X.sweat}>
            <sphereGeometry args={[0.035, 12, 10]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={X.sweat}>
            <coneGeometry args={[0.033, 0.06, 12]} />
          </mesh>
        </group>
      );
    case 55: // łzy
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.15, -0.08, 0.31]} scale={[0.6, 2.5, 0.4]} material={X.tear}>
              <sphereGeometry args={[0.025, 8, 6]} />
            </mesh>
          ))}
        </group>
      );
    case 56: // iskierki
      return (
        <group>
          {[
            [-0.35, 0.25, 0.15, 0.05],
            [0.38, 0.12, 0.1, 0.04],
            [0.3, 0.32, 0.2, 0.035],
            [-0.3, -0.05, 0.25, 0.03],
          ].map(([x, y, z, r], i) => (
            <group key={i} position={[x, y, z]}>
              <mesh material={X.glowYellow}>
                <octahedronGeometry args={[r]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 57: // zawstydzenie
      return (
        <group>
          {[-1, 1].flatMap((s) =>
            [-0.025, 0, 0.025].map((d) => <Paint key={`${s}${d}`} yaw={s * 0.55 + d * 2} y={-0.05} w={0.012} h={0.06} rot={-0.4} mat={X.red} />),
          )}
          {[-1, 1].map((s) => (
            <Dot key={`b${s}`} yaw={s * 0.55} y={-0.05} r={0.07} mat={X.blush} lift={0.002} />
          ))}
        </group>
      );
    case 58: // siniak
      return <Dot yaw={-0.45} y={0.03} r={0.085} mat={X.bruise} lift={0.03} />;
    case 59: // ślad buziaka
      return (
        <group>
          {[-1, 1].map((s) => (
            <Paint key={s} yaw={0.62} y={-0.03 + s * 0.016} w={0.07} h={0.02} mat={col('#e03131')} lift={0.005} />
          ))}
        </group>
      );
    case 60: // gwiazdka na policzku
      return (
        <group {...onHead(-0.6, -0.04, 0.006)}>
          <mesh material={X.yellow}>
            <circleGeometry args={[0.035, 5]} />
          </mesh>
        </group>
      );
    case 61: // plaster na nosie
      return (
        <group position={[0, -0.03, 0.345]}>
          <mesh material={col('#e8b98d')}>
            <boxGeometry args={[0.2, 0.05, 0.012]} />
          </mesh>
          <mesh position={[0, 0, 0.007]} material={X.cream}>
            <boxGeometry args={[0.06, 0.04, 0.005]} />
          </mesh>
        </group>
      );
    case 62: // okulary do czytania
      return (
        <group>
          <group position={[0, -0.02, 0.41]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.085, 0, 0]}>
                <mesh material={X.black}>
                  <torusGeometry args={[0.055, 0.007, 5, 16, Math.PI]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI]} material={X.black}>
                  <torusGeometry args={[0.055, 0.007, 5, 16, Math.PI]} />
                </mesh>
                <mesh material={X.glass}>
                  <circleGeometry args={[0.053, 14]} />
                </mesh>
              </group>
            ))}
          </group>
          {[-1, 1].map((s) => (
            <Rod key={s} from={[s * 0.17, -0.02, 0.4]} to={[s * 0.33, 0.04, 0.05]} r={0.007} mat={X.black} />
          ))}
        </group>
      );
    case 63: // mikrofon gamingowy
      return (
        <group>
          <mesh position={[0, 0.02, 0]} material={X.black}>
            <torusGeometry args={[0.37, 0.025, 6, 18, Math.PI]} />
          </mesh>
          {[-0.36, 0.36].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={X.black}>
              <cylinderGeometry args={[0.1, 0.1, 0.08, 14]} />
            </mesh>
          ))}
          <mesh position={[-0.385, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={X.glowGreen}>
            <torusGeometry args={[0.08, 0.008, 4, 16]} />
          </mesh>
          <Rod from={[-0.4, -0.02, 0.05]} to={[-0.3, -0.16, 0.28]} r={0.011} mat={X.black} />
          <Rod from={[-0.3, -0.16, 0.28]} to={[-0.14, -0.17, 0.34]} r={0.011} mat={X.black} />
          <mesh position={[-0.14, -0.17, 0.34]} material={X.rubber}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}
