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
          50: '#e6f5ed',
          100: '#b3e0c7',
          200: '#80cc9f',
          300: '#4db878',
          400: '#26a85a',
          500: '#0a7a3c',
          600: '#066b32',
          700: '#005c28',
          800: '#004d1f',
          900: '#003e16',
        },
      },
    },
  },
  plugins: [],
};

export default config;
