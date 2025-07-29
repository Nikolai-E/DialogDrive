import tailwindScrollbar from 'tailwind-scrollbar';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,js,ts,jsx,tsx}",
  ],
  
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  
  plugins: [
    tailwindScrollbar,
  ],
}