/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Azul corporativo: confianza, orden y estabilidad financiera.
        // Usado en barra de navegación, logotipo y acciones primarias.
        petrol: {
          950: '#081B33',
          900: '#0E2A4D',
          800: '#153E6E',
          700: '#1D4F87',
          600: '#2563A6',
          500: '#3B82C4',
          100: '#DCEAF7',
          50: '#F1F6FC',
        },
        stamp: {
          700: '#9C6118',
          600: '#C8892F',
          500: '#D9A043',
          100: '#FBEDD8',
        },
        success: {
          700: '#1E7A4C',
          600: '#25925B',
          100: '#DCF3E6',
        },
        danger: {
          700: '#B3261E',
          600: '#D3352C',
          100: '#FBE1DF',
        },
        surface: '#F4F6F8',
        paper: '#F4F6F8',
        ink: '#1F2A2E',
        // Paleta técnica exclusiva para las pantallas de autenticación (login, recuperación de contraseña).
        tech: {
          bg: '#0D1117',
          bgSoft: '#131A24',
          blue: '#2563EB',
          cyan: '#06B6D4',
          white: '#F8FAFC',
          gray: '#64748B',
        },
      },
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 61, 62, 0.06), 0 1px 3px 0 rgba(15, 61, 62, 0.08)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
