/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Core GORGONA ONE identity (kept for existing components)
        brand: {
          gold: '#d4af37',
          dark: '#050505',
          panel: '#101010'
        },
        // Home foundation — Planhat (cinematic monochrome editorial)
        planhat: {
          obsidian: '#000000',
          paper: '#ffffff',
          ink: '#121211',
          graphite: '#575551',
          stone: '#958d7e',
          ember: '#e8552b'
        },
        // Travel — dope.security (midnight terminal + violet beacon)
        travel: {
          void: '#090909',
          paper: '#f7f9fa',
          steel: '#828384',
          iron: '#423738',
          violet: '#af50ff',
          lavender: '#e1bdff'
        },
        // Shopping — entire studios (concrete-walled fashion zine)
        shop: {
          bone: '#e7ecea',
          ink: '#000000'
        },
        // Villas / Stays — Kobu (monochrome travel gazette)
        villa: {
          obsidian: '#242429',
          parchment: '#f9f5f2',
          graphite: '#3e3e3e',
          ash: '#919191',
          charcoal: '#070707'
        },
        // Yacht Rentals — Arc (white gallery over midnight water)
        yacht: {
          bone: '#e5e7eb',
          charcoal: '#0a0a0a',
          current: '#031e25',
          slate: '#1d1d1e'
        },
        // Car Rentals — BMW (austere automotive showcase)
        car: {
          carbon: '#262626',
          white: '#ffffff',
          concrete: '#bbbbbb',
          fog: '#f1f1f1'
        },
        // Cinematic layer — Ferrari (cavallino on black marble)
        ferrari: {
          rosso: '#da291c',
          scuro: '#9d2211',
          nero: '#000000',
          notte: '#181818',
          grafite: '#303030',
          fumo: '#8f8f8f',
          argento: '#d2d2d2'
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        fira: ['var(--font-fira)', 'ui-monospace', 'monospace']
      },
      letterSpacing: {
        stamp: '0.18em',
        wordmark: '-0.06em'
      },
      boxShadow: {
        premium: '0 0 0 1px rgba(212,175,55,0.25), 0 12px 45px rgba(0,0,0,0.45)'
      },
      maxWidth: {
        editorial: '90rem'
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite'
      }
    }
  },
  plugins: []
};
