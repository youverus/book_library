import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#e8ecff',
          500: '#5b6cff',
          600: '#4554e6',
          700: '#3340b8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
