/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand ramp — built around #105279 (700) and #1f83b6 (500)
        brand: {
          50:  '#eaf3f8',
          100: '#cfe4ee',
          200: '#a3cbdf',
          300: '#6fb0cf',
          400: '#3f97c0',
          500: '#1f83b6',
          600: '#176a96',
          700: '#105279',
          800: '#0c425f',
          900: '#0a3148',
        },
        // Secondary accent — lavender #b098eb
        accent: {
          50:  '#f5f1fd',
          100: '#e9e1fa',
          200: '#d7c8f4',
          300: '#cbb8f3',
          400: '#bda6ef',
          500: '#b098eb',
          600: '#9b7ee4',
          700: '#8364d6',
          800: '#6b4fc0',
          900: '#553f99',
        },
      },
      boxShadow: {
        brand: '0 10px 30px -10px rgba(16, 82, 121, 0.45)',
      },
    },
  },
  plugins: [],
};
