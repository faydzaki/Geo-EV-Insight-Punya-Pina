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
        // ── Brand purple-blue palette (from reference) ──
        primary: {
          50:  '#F0EFFE',
          100: '#E4E1FD',
          200: '#C9C3FB',
          300: '#A89CF7',
          400: '#8B7DF2',
          500: '#6C63FF',  // ← main brand purple-blue
          600: '#5B52E8',
          700: '#4A43CC',
          800: '#3933AA',
          900: '#2B268A',
        },
        // ── Blue accent gradient endpoint ──
        accent: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
        },
        // ── Page background lavender ──
        lavender: {
          50:  '#F8F7FF',
          100: '#F0EFFE',
          200: '#E5E4FF',
          300: '#D4D2FF',
          bg:  '#EDEEFF',   // ← page background
          card: '#F5F4FF',  // ← card tint
        },
        // ── Legacy aliases (kept for backward compat) ──
        pln:    '#3B82F6',
        nonpln: '#F59E0B',
        hcs:    '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Glass card shadow — purple-tinted soft
        glass:       '0 4px 24px rgba(108, 99, 255, 0.10)',
        'glass-md':  '0 8px 32px rgba(108, 99, 255, 0.14)',
        'glass-lg':  '0 16px 48px rgba(108, 99, 255, 0.18)',
        // Standard utility
        card:        '0 2px 8px rgba(108, 99, 255, 0.08)',
        'card-hover':'0 8px 24px rgba(108, 99, 255, 0.16)',
        'inner-sm':  'inset 0 1px 3px rgba(108, 99, 255, 0.06)',
        brand:       '0 4px 20px rgba(108, 99, 255, 0.45)',
      },
      backgroundImage: {
        // Page background gradient (image reference)
        'page-gradient': 'linear-gradient(135deg, #F0EFFE 0%, #EDEEFF 40%, #EEF2FF 70%, #F5F0FF 100%)',
        // Brand gradient (button, active states)
        'brand-gradient': 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 100%)',
        // Light card shimmer
        'shimmer-light': 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:   { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-8px)' } },
        pulse:   { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        shimmer:    'shimmer 1.6s linear infinite',
        float:      'float 3s ease-in-out infinite',
        pulse:      'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
