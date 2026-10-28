/**
 * Dodatkowe stroje (indeksy 54–103 w `SHIRTS`) — tekstury tułowia rysowane na płótnie 256×256.
 * Przód postaci = x 128; widoczny pas mniej więcej x 64–192. Pas spodni od y = 204.
 * Pomocnicze funkcje rysujące dostajemy z Outfit.tsx (bez cyklicznych importów).
 */
export interface ShirtSpecLike {
  base: string;
  sleeves: string | null;
  draw?: (g: CanvasRenderingContext2D, accent: string) => void;
}
export interface ShirtHelpers {
  TEX: number;
  WAIST: number;
  FRONT: number;
  text: (g: CanvasRenderingContext2D, t: string, x: number, y: number, size: number, color: string) => void;
  stripesH: (g: CanvasRenderingContext2D, colors: string[], top?: number, bottom?: number) => void;
  vFront: (g: CanvasRenderingContext2D, color: string, width: number, depth: number) => void;
  buttons: (g: CanvasRenderingContext2D, color: string, x?: number, from?: number, n?: number, step?: number) => void;
  star: (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => void;
  rng: (seed: number) => () => number;
}

export function moreShirts(h: ShirtHelpers): Record<number, ShirtSpecLike> {
  const { TEX, WAIST, FRONT, text, stripesH, vFront, buttons, star, rng } = h;
  const H = TEX * WAIST;

  /** Koszulka z napisem (jedna lub dwie linie). */
  const tee = (base: string, fg: string, lines: string[], size = 30, extra?: (g: CanvasRenderingContext2D) => void): ShirtSpecLike => ({
    base,
    sleeves: null,
    draw: (g) => {
      extra?.(g);
      const n = lines.length;
      lines.forEach((l, i) => {
        const s = Math.min(size, Math.floor(118 / Math.max(2, l.length))); // mieści się na przodzie tułowia
        text(g, l, FRONT, 86 + (i - (n - 1) / 2) * (s + 6), s, fg);
      });
    },
  });

  const pattern = (base: string, sleeves: string | null, draw: (g: CanvasRenderingContext2D) => void): ShirtSpecLike => ({ base, sleeves, draw });

  const blobs = (g: CanvasRenderingContext2D, seed: number, colors: string[], n: number, rx: number, ry: number) => {
    const r = rng(seed);
    for (const c of colors) {
      g.fillStyle = c;
      for (let i = 0; i < n; i++) {
        g.beginPath();
        g.ellipse(r() * TEX, r() * H, rx * (0.6 + r() * 0.8), ry * (0.6 + r() * 0.8), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  };

  return {
    // ── koszulki z napisami ──
    54: tee('#ff4d6d', '#ffffff', ['RIZZ'], 40),
    55: tee('#15151c', '#ffffff', ['NO CAP'], 30, (g) => {
      g.strokeStyle = '#ff4d6d';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(FRONT - 60, 70);
      g.lineTo(FRONT + 60, 104);
      g.stroke();
    }),
    56: tee('#ffb3d9', '#7a1f5c', ['DELULU'], 28, (g) => {
      for (const [x, y] of [
        [FRONT - 50, 130],
        [FRONT + 46, 126],
      ])
        star(g, x, y, 10, '#ffffff');
    }),
    57: tee('#7048e8', '#e9ff70', ['BRAIN', 'ROT'], 30),
    58: tee('#f4f5fb', '#15151c', ['6 7'], 46, (g) => {
      g.fillStyle = '#ffd43b';
      g.fillRect(FRONT - 50, 112, 100, 6);
    }),
    59: tee('#c92a2a', '#ffffff', ['SUS'], 44, (g) => {
      g.fillStyle = '#9b1c1c';
      g.beginPath();
      g.arc(FRONT, 140, 18, 0, Math.PI * 2);
      g.fill();
    }),
    60: tee('#2f9e44', '#ffffff', ['W'], 64),
    61: tee('#495057', '#ff6b6b', ['L'], 64),
    62: tee('#15151c', '#51cf66', ['GG'], 50),
    63: tee('#868e96', '#f4f5fb', ['AFK'], 40, (g) => {
      text(g, 'z z z', FRONT + 40, 130, 14, '#dee2e6');
    }),
    64: tee('#e9ecef', '#343a40', ['lowkey'], 26),
    65: tee('#1c7ed6', '#ffffff', ['RATIO'], 32),
    66: tee('#ffd43b', '#15151c', ['VIBE', 'CHECK'], 26, (g) => {
      g.strokeStyle = '#15151c';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(FRONT - 20, 140);
      g.lineTo(FRONT - 6, 154);
      g.lineTo(FRONT + 22, 124);
      g.stroke();
    }),
    67: tee('#d6336c', '#fff0f6', ['SLAY'], 40, (g) => {
      for (let i = 0; i < 12; i++) star(g, 20 + i * 21, 20 + (i % 3) * 8, 4, '#fff0f6');
    }),
    68: tee('#15151c', '#ffd43b', ['ESSA'], 40),
    69: tee('#f08c00', '#ffffff', ['SZTOS'], 34),
    70: tee('#f4f5fb', '#c92a2a', ['TO NIE', 'JA'], 28),
    71: tee('#212529', '#f8f9fa', ['KTO', 'PYTAŁ?'], 24),
    72: tee('#ffd43b', '#15151c', ['MAIN', 'CHARACTER'], 20, (g) => {
      star(g, FRONT, 140, 14, '#e03131');
    }),
    73: tee('#20c997', '#ffffff', ['TRUST', 'ME'], 30, (g) => {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(FRONT + 52, 132, 8, 0, Math.PI * 2);
      g.fill();
    }),

    // ── wzory ──
    74: pattern('#e8b04a', '#e8b04a', (g) => {
      // panterka
      const r = rng(74);
      for (let i = 0; i < 46; i++) {
        const x = r() * TEX;
        const y = r() * H;
        g.fillStyle = '#5c3a1e';
        g.beginPath();
        g.ellipse(x, y, 9, 7, r() * 3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#c98a2c';
        g.beginPath();
        g.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
        g.fill();
      }
    }),
    75: pattern('#f4f5fb', '#f4f5fb', (g) => {
      // zebra
      g.fillStyle = '#15151c';
      for (let i = 0; i < 16; i++) {
        const x = i * 17;
        g.beginPath();
        g.moveTo(x, 0);
        for (let y = 0; y <= H; y += 20) g.lineTo(x + Math.sin(y * 0.05 + i) * 8 + (y % 40 ? 6 : 0), y);
        g.lineTo(x + 7, H);
        for (let y = H; y >= 0; y -= 20) g.lineTo(x + 7 + Math.sin(y * 0.05 + i) * 8, y);
        g.fill();
      }
    }),
    76: pattern('#f4f5fb', '#f4f5fb', (g) => blobs(g, 76, ['#15151c'], 16, 20, 14)),
    77: pattern('#f4f5fb', null, (g) => {
      // szachownica
      const s = 24;
      g.fillStyle = '#15151c';
      for (let y = 0; y < H; y += s) for (let x = 0; x < TEX; x += s) if ((x / s + y / s) % 2 === 0) g.fillRect(x, y, s, s);
    }),
    78: pattern('#e03131', null, (g) => {
      // groszki retro
      g.fillStyle = '#f4f5fb';
      for (let y = 10; y < H; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < TEX; x += 26) {
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
      }
    }),
    79: pattern('#f4f5fb', null, (g) => {
      // paski pionowe
      for (let x = 0; x < TEX; x += 20) {
        g.fillStyle = '#1c7ed6';
        g.fillRect(x, 0, 8, H);
      }
    }),
    80: pattern('#ff922b', null, (g) => {
      // zachód słońca
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#5f3dc4');
      grd.addColorStop(0.45, '#e64980');
      grd.addColorStop(0.75, '#ff922b');
      grd.addColorStop(1, '#ffd43b');
      g.fillStyle = grd;
      g.fillRect(0, 0, TEX, H);
      g.fillStyle = '#ffe066';
      g.beginPath();
      g.arc(FRONT, 130, 30, Math.PI, 0);
      g.fill();
      g.fillStyle = '#5f3dc4';
      for (let i = 0; i < 4; i++) g.fillRect(FRONT - 34, 112 + i * 6, 68, 2);
    }),
    81: pattern('#0b0f2b', '#0b0f2b', (g) => {
      // galaktyka
      const grd = g.createRadialGradient(FRONT, 90, 5, FRONT, 90, 110);
      grd.addColorStop(0, 'rgba(240,101,255,.8)');
      grd.addColorStop(0.4, 'rgba(112,72,232,.6)');
      grd.addColorStop(1, 'rgba(11,15,43,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, TEX, H);
      const r = rng(81);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) g.fillRect(r() * TEX, r() * H, 2, 2);
    }),
    82: pattern('#15151c', null, (g) => {
      // płomienie
      const draw = (c: string, amp: number, base: number) => {
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= TEX; x += 16) g.lineTo(x, base - (x / 16) % 2 * amp - Math.sin(x * 0.11) * amp * 0.5);
        g.lineTo(TEX, H);
        g.fill();
      };
      draw('#e03131', 50, 120);
      draw('#ff922b', 38, 150);
      draw('#ffd43b', 24, 180);
    }),
    83: pattern('#1c2a5a', null, (g) => {
      // błyskawice
      g.fillStyle = '#ffd43b';
      for (const [x, y] of [
        [FRONT - 40, 40],
        [FRONT + 30, 90],
        [FRONT - 10, 140],
        [30, 80],
        [220, 60],
      ]) {
        g.beginPath();
        g.moveTo(x + 8, y);
        g.lineTo(x - 8, y + 24);
        g.lineTo(x + 2, y + 24);
        g.lineTo(x - 6, y + 44);
        g.lineTo(x + 12, y + 16);
        g.lineTo(x + 2, y + 16);
        g.closePath();
        g.fill();
      }
    }),
    84: pattern('#d2b48c', '#d2b48c', (g) => blobs(g, 84, ['#b08b5a', '#e6cfa4', '#8a6a42'], 12, 22, 12)),
    85: pattern('#f1f3f5', '#f1f3f5', (g) => blobs(g, 85, ['#ced4da', '#adb5bd', '#ffffff'], 12, 22, 12)),
    86: pattern('#1864ab', '#1864ab', (g) => {
      // krata niebieska
      g.fillStyle = 'rgba(255,255,255,.18)';
      for (let x = 0; x < TEX; x += 32) g.fillRect(x, 0, 12, H);
      for (let y = 0; y < H; y += 32) g.fillRect(0, y, TEX, 12);
      g.fillStyle = 'rgba(0,0,0,.25)';
      for (let x = 16; x < TEX; x += 32) g.fillRect(x, 0, 3, H);
      for (let y = 16; y < H; y += 32) g.fillRect(0, y, TEX, 3);
    }),
    87: pattern('#0b0d18', '#0b0d18', (g) => {
      // cyber neon
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, 60);
      g.lineTo(FRONT - 30, 60);
      g.lineTo(FRONT - 10, 80);
      g.lineTo(FRONT - 10, 150);
      g.moveTo(TEX, 100);
      g.lineTo(FRONT + 30, 100);
      g.lineTo(FRONT + 20, 110);
      g.lineTo(FRONT + 20, 180);
      g.stroke();
      g.strokeStyle = '#ff4d9d';
      g.beginPath();
      g.moveTo(0, 130);
      g.lineTo(FRONT - 40, 130);
      g.lineTo(FRONT - 30, 140);
      g.lineTo(TEX, 140);
      g.stroke();
      g.fillStyle = '#22d3ee';
      for (const [x, y] of [
        [FRONT - 10, 150],
        [FRONT + 20, 180],
      ]) {
        g.beginPath();
        g.arc(x, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }),
    88: pattern('#2f9e44', null, (g) => {
      // arbuz
      g.fillStyle = '#8ce99a';
      g.fillRect(0, 24, TEX, 10);
      g.fillStyle = '#ff6b6b';
      g.fillRect(0, 34, TEX, H - 34);
      const r = rng(88);
      g.fillStyle = '#15151c';
      for (let i = 0; i < 30; i++) {
        g.beginPath();
        g.ellipse(r() * TEX, 50 + r() * (H - 60), 3, 5, 0, 0, Math.PI * 2);
        g.fill();
      }
    }),
    89: pattern('#f4d58d', null, (g) => {
      // pizza
      const r = rng(89);
      for (let i = 0; i < 22; i++) {
        g.fillStyle = '#c92a2a';
        g.beginPath();
        g.arc(r() * TEX, r() * H, 10, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 18; i++) {
        g.fillStyle = '#2f9e44';
        g.fillRect(r() * TEX, r() * H, 6, 3);
      }
      g.fillStyle = '#c98a2c';
      g.fillRect(0, 0, TEX, 10);
    }),
    90: pattern('#4dabf7', null, (g) => {
      // banany
      const r = rng(90);
      g.strokeStyle = '#ffd43b';
      g.lineWidth = 7;
      g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const x = r() * TEX;
        const y = r() * H;
        g.beginPath();
        g.arc(x, y, 14, 0.2, 2.2);
        g.stroke();
      }
    }),
    91: pattern('#fff3bf', null, (g) => {
      // kaktusy
      const r = rng(91);
      for (let i = 0; i < 9; i++) {
        const x = 15 + r() * 226;
        const y = 30 + r() * 150;
        g.fillStyle = '#2f9e44';
        g.fillRect(x - 5, y - 18, 10, 30);
        g.fillRect(x - 15, y - 8, 10, 6);
        g.fillRect(x - 15, y - 16, 5, 10);
        g.fillRect(x + 5, y - 4, 10, 6);
        g.fillRect(x + 10, y - 12, 5, 10);
        g.fillStyle = '#e8590c';
        g.fillRect(x - 8, y + 12, 16, 8);
      }
    }),
    92: pattern('#05140a', '#05140a', (g) => {
      // kod matrixa
      const r = rng(92);
      g.font = '700 12px monospace';
      for (let x = 4; x < TEX; x += 12) {
        const len = 6 + Math.floor(r() * 12);
        const y0 = r() * H;
        for (let k = 0; k < len; k++) {
          g.fillStyle = k === len - 1 ? '#d3f9d8' : `rgba(81,207,102,${0.3 + (k / len) * 0.7})`;
          g.fillText(String.fromCharCode(0x30 + Math.floor(r() * 42)), x, (y0 + k * 13) % H);
        }
      }
    }),
    93: pattern('#0b1d3a', '#0b1d3a', (g) => {
      // gwiaździste niebo
      const r = rng(93);
      for (let i = 0; i < 26; i++) star(g, r() * TEX, r() * H, 2 + r() * 5, '#ffe066');
      g.fillStyle = '#ffe066';
      g.beginPath();
      g.arc(FRONT + 30, 60, 18, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0b1d3a';
      g.beginPath();
      g.arc(FRONT + 38, 54, 16, 0, Math.PI * 2);
      g.fill();
    }),

    // ── kostiumy ──
    94: pattern('#3b3b3b', '#3b3b3b', (g) => {
      // strażak
      g.fillStyle = '#ffd43b';
      g.fillRect(0, 120, TEX, 12);
      g.fillRect(0, 160, TEX, 12);
      g.fillStyle = '#d0d4dc';
      g.fillRect(0, 124, TEX, 4);
      g.fillRect(0, 164, TEX, 4);
      buttons(g, '#15151c', FRONT, 30, 3, 26);
    }),
    95: pattern('#1971c2', '#1971c2', (g) => {
      // listonosz
      vFront(g, '#1864ab', 20, 30);
      g.fillStyle = '#ffd43b';
      g.fillRect(FRONT - 50, 50, 26, 18);
      g.fillStyle = '#c92a2a';
      g.beginPath();
      g.moveTo(FRONT - 50, 50);
      g.lineTo(FRONT - 37, 60);
      g.lineTo(FRONT - 24, 50);
      g.fill();
      g.strokeStyle = '#7a4a2a';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(FRONT - 60, 0);
      g.lineTo(FRONT + 60, H);
      g.stroke();
    }),
    96: pattern('#f8f1d8', '#f8f1d8', (g) => {
      // pszczelarz
      g.fillStyle = '#e9e1c4';
      for (let y = 20; y < H; y += 30) g.fillRect(0, y, TEX, 3);
      g.fillStyle = '#ffd43b';
      g.fillRect(FRONT + 20, 70, 30, 24);
      g.fillStyle = '#15151c';
      for (let i = 0; i < 3; i++) g.fillRect(FRONT + 20, 74 + i * 8, 30, 3);
      buttons(g, '#adb5bd', FRONT, 40, 5, 30);
    }),
    97: pattern('#ffc9e3', null, (g) => {
      // baletnica
      g.fillStyle = '#ffa8d0';
      g.beginPath();
      g.moveTo(0, 150);
      for (let x = 0; x <= TEX; x += 16) g.lineTo(x, x % 32 ? 196 : 176);
      g.lineTo(TEX, 150);
      g.fill();
      for (let i = 0; i < 10; i++) star(g, FRONT - 40 + (i % 5) * 20, 60 + Math.floor(i / 5) * 24, 3, '#ffffff');
    }),
    98: pattern('#adb5bd', '#868e96', (g) => {
      // robot
      g.fillStyle = '#868e96';
      g.fillRect(FRONT - 46, 40, 92, 90);
      g.fillStyle = '#212529';
      g.fillRect(FRONT - 40, 46, 80, 78);
      g.fillStyle = '#51cf66';
      for (let i = 0; i < 4; i++) g.fillRect(FRONT - 32 + i * 18, 60, 10, 10);
      g.fillStyle = '#ff6b6b';
      g.fillRect(FRONT - 32, 84, 64, 6);
      g.fillStyle = '#ffd43b';
      g.fillRect(FRONT - 32, 100, 40, 6);
      g.fillStyle = '#495057';
      for (const [x, y] of [
        [20, 20],
        [236, 20],
        [20, 180],
        [236, 180],
      ]) {
        g.beginPath();
        g.arc(x, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }),
    99: pattern('#15151c', '#15151c', (g) => {
      // szkielet
      g.fillStyle = '#f1f3f5';
      g.fillRect(FRONT - 5, 10, 10, 170);
      for (let i = 0; i < 5; i++) {
        const y = 40 + i * 22;
        g.beginPath();
        g.ellipse(FRONT - 30, y, 26, 6, -0.2, 0, Math.PI * 2);
        g.ellipse(FRONT + 30, y, 26, 6, 0.2, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.ellipse(FRONT, 182, 34, 14, 0, 0, Math.PI * 2);
      g.fill();
    }),
    100: pattern('#e03131', '#e03131', (g) => {
      // kombinezon wyścigowy
      g.fillStyle = '#f4f5fb';
      g.fillRect(FRONT - 70, 0, 18, H);
      g.fillRect(FRONT + 52, 0, 18, H);
      g.fillStyle = '#15151c';
      g.fillRect(FRONT - 30, 50, 60, 22);
      text(g, 'TURBO', FRONT, 61, 13, '#ffd43b');
      g.fillStyle = '#ffd43b';
      g.fillRect(FRONT - 30, 90, 26, 16);
      g.fillStyle = '#1c7ed6';
      g.fillRect(FRONT + 4, 90, 26, 16);
      star(g, FRONT, 140, 12, '#f4f5fb');
    }),
    101: pattern('#212529', '#212529', (g) => {
      // garnitur w paski
      g.fillStyle = '#495057';
      for (let x = 0; x < TEX; x += 12) g.fillRect(x, 0, 2, H);
      vFront(g, '#f4f5fb', 22, 100);
      g.fillStyle = '#c92a2a';
      g.fillRect(FRONT - 4, 24, 8, 70);
      g.fillStyle = '#f4f5fb';
      g.beginPath();
      g.moveTo(FRONT + 34, 60);
      g.lineTo(FRONT + 50, 60);
      g.lineTo(FRONT + 42, 50);
      g.fill();
    }),
    102: pattern('#f8f9fa', '#f8f9fa', (g) => {
      // biały smoking
      vFront(g, '#e9ecef', 26, 110);
      g.fillStyle = '#15151c';
      g.beginPath();
      g.moveTo(FRONT, 30);
      g.lineTo(FRONT - 22, 18);
      g.lineTo(FRONT - 22, 42);
      g.closePath();
      g.moveTo(FRONT, 30);
      g.lineTo(FRONT + 22, 18);
      g.lineTo(FRONT + 22, 42);
      g.closePath();
      g.fill();
      buttons(g, '#15151c', FRONT, 60, 3, 18);
      g.fillStyle = '#e03131';
      g.beginPath();
      g.arc(FRONT + 44, 60, 6, 0, Math.PI * 2);
      g.fill();
    }),
    103: pattern('#2b8a3e', '#2b8a3e', (g) => {
      // polar
      const r = rng(103);
      g.fillStyle = 'rgba(255,255,255,.08)';
      for (let i = 0; i < 400; i++) g.fillRect(r() * TEX, r() * H, 3, 3);
      g.fillStyle = '#237032';
      g.fillRect(FRONT - 3, 0, 6, 60);
      g.fillStyle = '#c0c0c8';
      g.fillRect(FRONT - 2, 0, 4, 60);
      g.fillStyle = '#237032';
      g.fillRect(0, 0, TEX, 14);
      stripesH(g, ['#237032'], H - 12, H);
    }),
  };
}
