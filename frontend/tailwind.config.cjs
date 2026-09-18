/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Palette from the first mockup: warm cream, near-black ink, neon lime accent
        paper: '#F4F1EA',
        card: '#FFFFFF',
        ink: '#141413',
        ink2: '#252522',
        mute: '#55524B',
        faint: '#8A877F',
        sand: '#CFCBC1', // secondary text on dark
        line: '#E2DDD2',
        wash: '#ECE7DC',
        accent: '#D4FF3A', // neon lime — use on dark surfaces or as a fill under ink text
        danger: '#B3261E',
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
