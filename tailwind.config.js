/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:  { DEFAULT: '#F3F1EA', dark: '#E8E5DC' },
        card:   '#FFFFFF',
        ink:    { DEFAULT: '#17181B', soft: '#4B4D55', light: '#6B7280' },
        muted:  '#6E7078',
        line:   '#E7E4DA',
        accent: { DEFAULT: '#B5522F', soft: '#F5E4DC', light: '#E8A88E' },
        sage:   { DEFAULT: '#4A5D57', soft: '#E4EAE6', light: '#8BA59B' },
        gold:   { DEFAULT: '#8F6A1F', soft: '#F1EAD6', light: '#D4AD5A' },
        ok:     '#3C7A5A',
        warn:   '#B5732A',
        danger: '#B23A3A',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans:    ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card:  '18px',
        block: '22px',
        pill:  '999px',
      },
      boxShadow: {
        soft:  '0 1px 2px rgba(23,24,27,.04), 0 8px 24px rgba(23,24,27,.06)',
        lift:  '0 2px 4px rgba(23,24,27,.05), 0 18px 40px rgba(23,24,27,.12)',
        card:      '0 1px 2px rgba(23,24,27,.04), 0 8px 24px rgba(23,24,27,.06)',
        'card-hover': '0 2px 4px rgba(23,24,27,.05), 0 18px 40px rgba(23,24,27,.12)',
      },
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '70%':  { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        ringGrow: {
          from: { strokeDashoffset: '251' },
        },
        barGrow: {
          from: { transform: 'scaleX(0)' },
          to:   { transform: 'scaleX(1)' },
        },
      },
      animation: {
        pop:          'pop .35s cubic-bezier(.2,.7,.3,1) both',
        fadeIn:       'fadeIn .4s ease-out both',
        fadeInScale:  'fadeInScale .35s ease-out both',
        ringGrow:     'ringGrow .8s ease-out both',
        barGrow:      'barGrow .6s ease-out both',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(.2,.7,.3,1)',
      },
    },
  },
  plugins: [],
};
