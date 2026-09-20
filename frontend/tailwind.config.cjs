/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--f-display)', 'Georgia', 'serif'],
        sans: ['var(--f-body)', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Colours come from CSS variables so the admin can change them in "Pengaturan → Tampilan"
      // without rebuilding (see src/utils/theme.js). Defaults live in src/index.css.
      colors: Object.fromEntries(
        ['paper', 'card', 'ink', 'ink2', 'mute', 'faint', 'sand', 'line', 'wash', 'accent', 'onaccent', 'solid', 'onsolid', 'danger'].map((k) => [
          k,
          `rgb(var(--c-${k}) / <alpha-value>)`,
        ]),
      ),
      letterSpacing: {
        eyebrow: '0.18em',
      },
      keyframes: {
        // [ID] Animasi pop-up sukses setelah kirim
        pop: { '0%': { opacity: 0, transform: 'translateY(12px) scale(.85)' }, '60%': { opacity: 1, transform: 'scale(1.04)' }, '100%': { transform: 'none' } },
        ring: { '0%': { transform: 'scale(0)' }, '70%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
        draw: { to: { strokeDashoffset: 0 } },
        burst: { '0%': { opacity: 1, transform: 'translate(-50%,-50%) rotate(var(--r)) translateY(0)' }, '100%': { opacity: 0, transform: 'translate(-50%,-50%) rotate(var(--r)) translateY(-40px) scale(.4)' } },
        rise: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        sheet: { from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
      },
      animation: {
        pop: 'pop .45s cubic-bezier(.2,.9,.3,1.2) both',
        ring: 'ring .45s cubic-bezier(.2,.9,.3,1.3) both',
        draw: 'draw .35s .3s ease-out forwards',
        burst: 'burst .6s ease-out both',
        rise: 'rise 0.5s cubic-bezier(.2,.7,.2,1) both',
        fade: 'fade 0.3s ease both',
        sheet: 'sheet 0.32s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
