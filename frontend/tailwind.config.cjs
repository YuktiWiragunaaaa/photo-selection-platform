/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: '#ffffff',
        ink: '#111111',
        mute: '#7a7a7a',
        faint: '#b5b5b5',
        line: '#e8e8e8',
        wash: '#f6f6f6',
        danger: '#b3261e',
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(.2,.7,.2,1) both',
        fade: 'fade 0.3s ease both',
      },
    },
  },
  plugins: [],
}
