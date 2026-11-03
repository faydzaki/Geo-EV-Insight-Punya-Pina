import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6f7f7',
          100: '#ccefef',
          200: '#99dfdf',
          300: '#4db8bb',
          400: '#1a9ea3',
          500: '#087f83',
          600: '#066669',
          700: '#054f52',
        },
        navy: {
          900: '#0f1629',
          800: '#1a2744',
          700: '#1e3a5f',
          600: '#243b55',
        },
        electric: {
          400: '#38bdf8',
          500: '#0ea5e9',
        },
        pln: '#006199',
        nonpln: '#E9AD2F',
        hcs: '#6B4EC6',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 6px 16px 0 rgba(0,0,0,0.10)',
        glow: '0 0 20px rgba(8,127,131,0.3)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer:    'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
