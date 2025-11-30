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
          50: '#f0f1ff',
          100: '#e0e3ff',
          200: '#c7cbff',
          300: '#a4a9ff',
          400: '#8080ff',
          500: '#667eea',
          600: '#5a5cd6',
          700: '#4a4ab3',
          800: '#3d3d91',
          900: '#353576',
        },
        secondary: {
          500: '#764ba2',
          600: '#6a4190',
        },
        dark: {
          100: '#2d2d44',
          200: '#252538',
          300: '#1f1f30',
          400: '#1a1a2e',
          500: '#15152a',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
    },
  },
  plugins: [],
}
export default config
