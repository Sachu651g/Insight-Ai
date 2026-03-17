/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark terminal-inspired palette
        'surface': {
          DEFAULT: '#0d0f14',
          50:  '#1a1d26',
          100: '#151820',
          200: '#0d0f14',
          300: '#08090d',
        },
        'panel': {
          DEFAULT: '#141720',
          border: '#1e2235',
        },
        'accent': {
          cyan:    '#00e5ff',
          green:   '#00ff9d',
          amber:   '#ffb300',
          magenta: '#e040fb',
          red:     '#ff4d6a',
        },
        'text': {
          primary:   '#e8eaf6',
          secondary: '#7986cb',
          muted:     '#3d4770',
          code:      '#a5d6a7',
        },
      },
      fontFamily: {
        display: ['"DM Mono"', '"Fira Code"', 'monospace'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)
        `,
        'glow-cyan':    'radial-gradient(circle at center, rgba(0,229,255,0.15) 0%, transparent 70%)',
        'glow-green':   'radial-gradient(circle at center, rgba(0,255,157,0.10) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(0,229,255,0.25)',
        'glow-md': '0 0 20px rgba(0,229,255,0.20)',
        'glow-lg': '0 0 40px rgba(0,229,255,0.15)',
        'panel':   '0 4px 24px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.4s ease-out forwards',
        'slide-up':     'slideUp 0.4s ease-out forwards',
        'blink':        'blink 1.1s step-end infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'spin-slow':    'spin 6s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blink:   { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
    },
  },
  plugins: [],
}
