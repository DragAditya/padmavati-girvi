/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#FFFBEB',
          100: '#FFF8E7',
          200: '#FDEEA3',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#D4A017',
          600: '#B8860B',
          700: '#92680A',
          800: '#6D4C08',
          900: '#4A3205',
        },
        danger: { DEFAULT: '#EF4444', light: '#FEF2F2' },
        success: { DEFAULT: '#22C55E', light: '#F0FDF4' },
        warning: { DEFAULT: '#F97316', light: '#FFF7ED' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 4px rgba(0,0,0,0.08)',
        modal: '0 8px 32px rgba(0,0,0,0.16)',
        gold:  '0 4px 16px rgba(212,160,23,0.3)',
      },
      animation: {
        'shake': 'shake 0.4s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-8px)' },
          '40%':     { transform: 'translateX(8px)' },
          '60%':     { transform: 'translateX(-6px)' },
          '80%':     { transform: 'translateX(6px)' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseGold: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(212,160,23,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(212,160,23,0)' },
        },
      },
    },
  },
  plugins: [],
}
