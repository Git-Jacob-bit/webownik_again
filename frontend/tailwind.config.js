/** @type {import('tailwindcss').Config} */
// Kolory pochodzą ze zmiennych CSS w src/index.css (motyw ciemny i jasny).
const token = name => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        desk: token('desk'),
        glow: token('glow'),
        panel: token('panel'),
        tab: token('tab'),
        raise: token('raise'),
        field: token('field'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        accent: { DEFAULT: token('accent'), ink: token('accent-ink'), text: token('accent-text') },
        warn: { DEFAULT: token('warn'), ink: token('warn-ink') },
        ok: token('ok'),
        card: { DEFAULT: token('card'), ink: token('card-ink'), muted: token('card-muted') },
        stack: { 1: token('stack1'), 2: token('stack2') },
        key: { DEFAULT: token('key'), ink: token('key-ink'), edge: token('key-edge') },
        pen: token('pen'),
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next Variable"', 'system-ui', 'sans-serif'],
        slab: ['"Zilla Slab"', 'Rockwell', 'Georgia', 'serif'],
      },
      boxShadow: {
        key: 'inset 0 -3px 0 rgb(var(--c-key-edge)), 0 18px 30px -16px var(--shadow)',
        'key-pressed': 'inset 0 -1px 0 rgb(var(--c-key-edge))',
        paper: '0 0 0 1px var(--card-edge), 0 24px 40px -22px var(--shadow)',
        stack: '0 0 0 1px var(--card-edge), 3px 3px 0 rgb(var(--c-stack1)), 6px 6px 0 rgb(var(--c-stack2)), 0 22px 30px -18px var(--shadow)',
        lift: '0 40px 80px -40px var(--shadow)',
      },
    },
  },
  plugins: [],
}
