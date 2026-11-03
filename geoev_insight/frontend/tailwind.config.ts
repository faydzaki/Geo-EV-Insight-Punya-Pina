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
          500: '#087f83',
          600: '#066669',
          700: '#054f52',
        },
        pln: '#006199',
        nonpln: '#E9AD2F',
        hcs: '#6B4EC6',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

