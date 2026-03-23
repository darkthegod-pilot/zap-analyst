/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00ff88',
          dim:    '#00ff8820',
          hover:  '#00e87a',
          muted:  '#00ff8840',
          glow:   '#00ff8815',
        },
        surface: {
          DEFAULT: '#111118',
          raised:  '#1a1a26',
          hover:   '#1e1e2e',
          border:  '#2a2a3a',
          subtle:  '#0d0d14',
        },
        ink: {
          DEFAULT: '#f0f0f8',
          secondary: '#9090b0',
          muted:     '#50506a',
          faint:     '#2a2a3a',
        },
        status: {
          approved:  '#00ff88',
          rejected:  '#ff4466',
          suspicious:'#ffb020',
          pending:   '#7070a0',
          'approved-bg':   '#00ff8815',
          'rejected-bg':   '#ff446615',
          'suspicious-bg': '#ffb02015',
          'pending-bg':    '#7070a015',
          'approved-border':   '#00ff8840',
          'rejected-border':   '#ff446640',
          'suspicious-border': '#ffb02040',
          'pending-border':    '#7070a040',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px #00ff8830' },
          '50%':      { boxShadow: '0 0 20px #00ff8860' },
        },
      },
      boxShadow: {
        'brand':    '0 0 20px #00ff8830',
        'brand-sm': '0 0 8px #00ff8820',
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px #2a2a3a',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px #3a3a4a',
        'glow-green': '0 0 0 1px #00ff8840, 0 0 16px #00ff8820',
        'glow-red':   '0 0 0 1px #ff446640, 0 0 16px #ff446620',
        'glow-yellow':'0 0 0 1px #ffb02040, 0 0 16px #ffb02020',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
        'gradient-card':  'linear-gradient(180deg, #1a1a26 0%, #111118 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}
