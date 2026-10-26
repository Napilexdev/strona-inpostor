import { describe, expect, it } from 'vitest';
import { computeCameraFrame, computePodiumLayout, PODIUM_RADIUS } from '../shared/layout';
import { DEFAULT_SETTINGS } from '../shared/types';
import { filterWords, pickWord, WORDS } from '../shared/words';
import { CATEGORIES } from '../shared/types';
import { generateRoomCode, RoomManager } from '../server/manager';
import { isCorrectGuess, nicknameSchema } from '../shared/schemas';

describe('dynamiczne podesty', () => {
  for (let n = 3; n <= 12; n++) {
    it(`limit ${n} → dokładnie ${n} podestów, bez kolizji, symetrycznie`, () => {
      const l = computePodiumLayout(n);
      expect(l.slots).toHaveLength(n);
      expect(l.slots.map((s) => s.seat)).toEqual([...Array(n).keys()]);
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const a = l.slots[i];
          const b = l.slots[j];
          expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(PODIUM_RADIUS * 2 + 0.2);
        }
      // symetria względem osi X=0
      const xs = l.slots.map((s) => Math.round(s.x * 1000) / 1000 || 0).sort((a, b) => a - b);
      expect(xs.map((x) => -x + 0).sort((a, b) => a - b).map((x) => x + 0)).toEqual(xs.map((x) => x + 0));
      expect(Math.abs(l.bounds.minX + l.bounds.maxX)).toBeLessThan(1e-6);
    });
  }

  it('przy 8+ graczach dwa rzędy, tylny wyższy; front przesunięty względem tyłu', () => {
    const l = computePodiumLayout(10);
    const back = l.slots.filter((s) => s.row === 'back');
    const front = l.slots.filter((s) => s.row === 'front');
    expect(back.length + front.length).toBe(10);
    expect(back[0].height).toBeGreaterThan(front[0].height);
    for (const f of front) for (const b of back) expect(Math.abs(f.x - b.x)).toBeGreaterThan(0.5);
    expect(computePodiumLayout(5).slots.every((s) => s.row === 'single')).toBe(true);
  });
});

describe('kamera', () => {
  it('oddala się przy większej liczbie graczy i węższym ekranie', () => {
    const d3 = computeCameraFrame(computePodiumLayout(3), 16 / 9).distance;
    const d12 = computeCameraFrame(computePodiumLayout(12), 16 / 9).distance;
    expect(d12).toBeGreaterThan(d3);
    const wide = computeCameraFrame(computePodiumLayout(8), 16 / 9).distance;
    const phone = computeCameraFrame(computePodiumLayout(8), 0.8).distance;
    expect(phone).toBeGreaterThan(wide);
  });

  it('wszystkie podesty mieszczą się w kadrze dla typowych proporcji', () => {
    for (const aspect of [0.6, 1, 1.5, 2.2])
      for (let n = 3; n <= 12; n++) {
        const l = computePodiumLayout(n);
        const f = computeCameraFrame(l, aspect);
        const fov = (38 * Math.PI) / 180;
        for (const s of l.slots) {
          const dz = f.position[2] - s.z;
          const halfW = Math.tan(fov / 2) * aspect * dz;
          expect(Math.abs(s.x)).toBeLessThan(halfW);
        }
      }
  });
});

describe('dane i walidacja', () => {
  it('baza ma co najmniej 300 unikalnych haseł we wszystkich kategoriach', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(300);
    expect(new Set(WORDS.map((w) => w.word.toLowerCase())).size).toBe(WORDS.length);
    for (const c of CATEGORIES) expect(filterWords(c, 'dowolny').length).toBeGreaterThan(20);
  });

  it('losowanie unika powtórzeń do wyczerpania puli', () => {
    const used = new Set<string>();
    const pool = filterWords('sport', 'latwy');
    const picked = pool.map(() => pickWord('sport', 'latwy', used).word);
    expect(new Set(picked).size).toBe(pool.length);
    expect(() => pickWord('sport', 'latwy', used)).not.toThrow();
  });

  it('kody pokoi: format i brak kolizji', () => {
    expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
    const seq = ['AAAAA', 'AAAAA', 'BBBBB'];
    const m = new RoomManager({}, () => seq.shift()!);
    const r1 = m.createRoom();
    const r2 = m.createRoom();
    expect(r1.code).toBe('AAAAA');
    expect(r2.code).toBe('BBBBB');
    m.closeAll();
  });

  it('porównanie ostatniej próby', () => {
    expect(isCorrectGuess('  ŻYRAFA ', 'żyrafa')).toBe(true);
    expect(isCorrectGuess('zyrafa', 'żyrafa')).toBe(true);
    expect(isCorrectGuess('żyraf', 'żyrafa')).toBe(false);
    expect(isCorrectGuess('piłka  nożna', 'piłka nożna')).toBe(true);
    expect(isCorrectGuess('', 'x')).toBe(false);
  });

  it('walidacja nicku', () => {
    expect(nicknameSchema.safeParse('  Ola  ').data).toBe('Ola');
    expect(nicknameSchema.safeParse('a').success).toBe(false);
    expect(nicknameSchema.safeParse('x'.repeat(17)).success).toBe(false);
    expect(nicknameSchema.safeParse('<b>').success).toBe(false);
    expect(DEFAULT_SETTINGS.maxPlayers).toBe(6);
  });
});
