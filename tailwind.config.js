export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F6F4',
        surface: '#FFFFFF',
        ink: '#1D211E',
        'ink-soft': '#4A5049',
        muted: '#828A81',
        line: '#E6E9E4',
        primary: {
          DEFAULT: '#1F5A44',
          soft: '#2E7157',
          tint: '#E9F0EC',
        },
        sphere: {
          faith: '#2F6B52',
          family: '#B05F4E',
          health: '#3F7C8C',
          rizq: '#6E6AA6',
          knowledge: '#8A6E3B',
          charity: '#77874B',
          other: '#8A8F87',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Naskh Arabic"', 'serif'],
      },
      borderRadius: {
        card: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(29, 33, 30, 0.04)',
        nav: '0 8px 28px rgba(29, 33, 30, 0.12)',
      },
    },
  },
}
