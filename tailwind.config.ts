import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { 950: '#070a14', 900: '#0b1020', 850: '#0f1529', 800: '#141b33', 700: '#1d2645', 600: '#2a355c' },
        accent: { DEFAULT: '#7c5cff', soft: '#a28bff' },
        danger: '#ff4d6d',
        ok: '#3ddc97',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both', pop: 'pop .25s ease-out both' },
    },
  },
  plugins: [],
};
export default config;
