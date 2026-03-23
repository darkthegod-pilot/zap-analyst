/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Surfaces (deep navy-blue base) ─────────────────── */
        canvas:  '#080D18',
        panel:   '#0D1525',
        raised:  '#121D35',
        hover:   '#172240',
        overlay: '#1E2D4F',

        /* ── Brand (muted emerald — not neon) ────────────────── */
        brand: {
          DEFAULT: '#10B981',
          hi:  '#34D399',
          bg:  'rgba(16,185,129,0.10)',
          bdr: 'rgba(16,185,129,0.25)',
          dim: 'rgba(16,185,129,0.06)',
        },

        /* ── Status ──────────────────────────────────────────── */
        ok: {
          DEFAULT: '#10B981',
          hi:  '#34D399',
          bg:  'rgba(16,185,129,0.10)',
          bdr: 'rgba(16,185,129,0.20)',
        },
        warn: {
          DEFAULT: '#F59E0B',
          hi:  '#FCD34D',
          bg:  'rgba(245,158,11,0.10)',
          bdr: 'rgba(245,158,11,0.20)',
        },
        danger: {
          DEFAULT: '#EF4444',
          hi:  '#F87171',
          bg:  'rgba(239,68,68,0.10)',
          bdr: 'rgba(239,68,68,0.20)',
        },
        idle: {
          DEFAULT: '#4B5E8A',
          bg:  'rgba(75,94,138,0.10)',
          bdr: 'rgba(75,94,138,0.20)',
        },

        /* ── Text hierarchy ──────────────────────────────────── */
        ink:  '#E8EEF8',
        ink2: '#7A8DB5',
        ink3: '#3D4E72',
        ink4: '#1E2D4F',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },

      borderColor: {
        DEFAULT: 'rgba(100,150,255,0.07)',
        subtle:  'rgba(100,150,255,0.04)',
        strong:  'rgba(100,150,255,0.13)',
        brand:   'rgba(16,185,129,0.28)',
      },

      boxShadow: {
        sm: '0 0 0 0.5px rgba(100,150,255,0.06), 0 1px 2px rgba(0,0,0,0.5)',
        md: '0 0 0 0.5px rgba(100,150,255,0.07), 0 2px 6px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.25)',
        lg: '0 0 0 0.5px rgba(100,150,255,0.08), 0 4px 16px rgba(0,0,0,0.55), 0 20px 48px rgba(0,0,0,0.40)',
        'ok':     '0 0 0 1px rgba(16,185,129,0.25), 0 0 16px rgba(16,185,129,0.10)',
        'warn':   '0 0 0 1px rgba(245,158,11,0.25), 0 0 16px rgba(245,158,11,0.10)',
        'danger': '0 0 0 1px rgba(239,68,68,0.25), 0 0 16px rgba(239,68,68,0.10)',
        'brand':  '0 0 0 1px rgba(16,185,129,0.28), 0 0 20px rgba(16,185,129,0.12)',
        'inset':  'inset 0 1px 0 rgba(100,150,255,0.06)',
      },

      animation: {
        'fade-in':   'fadeIn 0.18s ease-out',
        'slide-up':  'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':'slideDown 0.22s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':  'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':   'shimmer 1.6s infinite',
        'blink':     'blink 2.5s ease-in-out infinite',
      },

      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        blink:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },

      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },

      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}
