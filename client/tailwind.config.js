/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F6F2',
        p2: '#EFEEE9',
        p3: '#E5E3DC',
        ink: {
          1: '#111110',
          2: '#2A2A28',
          3: '#545450',
          4: '#888880',
          5: '#B4B4AC',
          6: '#D4D2CA'
        },
        gold: {
          DEFAULT: '#9A7A2E',
          l: '#C4A050',
          bg: '#FBF5E8'
        },
        sage: {
          DEFAULT: '#2E6E4A',
          bg: '#EBF5EE'
        },
        rose: {
          DEFAULT: '#7A2E3C',
          bg: '#F5EBEC'
        },
        ember: {
          DEFAULT: '#7A3E1E',
          bg: '#F5EDE8'
        },
        'ew-blue': '#0052CC',
        'ew-gold': '#C4A050',
        'ew-dark': '#111110',
        'ew-gray': '#F7F6F2',
        /** RM dashboard — same as `paper` / wealthos-hierarchy.html */
        cream: '#F7F6F2',
        whatsapp: '#25D366',
        'risk-high': '#7A2E3C',
        'risk-medium': '#7A3E1E',
        'risk-low': '#2E6E4A'
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        window: '0 8px 48px rgba(0,0,0,.16), 0 0 0 1px rgba(0,0,0,.06)'
      }
    }
  },
  plugins: []
};
