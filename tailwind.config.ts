/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'glass-white': 'rgba(255, 255, 255, 0.05)',
        'glass-dark': 'rgba(0, 0, 0, 0.3)',
    },
    backdropBlur: {
      xs: '2px',
      sm: '3px',
    },
    animation: {
    'pulse-slow': 'pulse 8s ease-in-out infinite',
    }
  },
  plugins: [],
  }
};


export default config;
