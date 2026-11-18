import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kalbe: {
          50: '#e8f5ee',
          100: '#c5e7d3',
          200: '#9ed6b4',
          300: '#73c393',
          400: '#4fb57a',
          500: '#008444',
          600: '#006b37',
          700: '#00542b',
          800: '#003e20',
          900: '#002915',
        },
      },
    },
  },
  plugins: [],
};

export default config;
