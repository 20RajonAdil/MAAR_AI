import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: 'rgb(var(--maar-base) / <alpha-value>)',
          raised: 'rgb(var(--maar-surface) / <alpha-value>)',
          raised2: 'rgb(var(--maar-surface-2) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--maar-border) / <alpha-value>)',
          strong: 'rgb(var(--maar-border-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--maar-ink) / <alpha-value>)',
          muted: 'rgb(var(--maar-ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--maar-ink-faint) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--maar-gold) / <alpha-value>)',
          soft: 'rgb(var(--maar-gold-soft) / <alpha-value>)',
        },
        ice: {
          DEFAULT: 'rgb(var(--maar-ice) / <alpha-value>)',
        },
        danger: '#E5776B',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        seam: '0 0 40px 0 rgb(var(--maar-gold) / 0.25)',
        panel: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 30px -12px rgb(0 0 0 / 0.6)',
      },
      keyframes: {
        'seam-flicker': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(0.85)', opacity: '0.5' },
          '50%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        seam: 'seam-flicker 4.5s ease-in-out infinite',
        'rise-in': 'rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
