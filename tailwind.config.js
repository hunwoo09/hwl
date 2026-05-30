/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    fontFamily: {
      sans:  ['"Noto Sans Mono"', 'monospace'],
      serif: ['"Noto Sans Mono"', 'monospace'],
      mono:  ['"Noto Sans Mono"', 'monospace'],
    },
    extend: {
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))',     foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',   foreground: 'hsl(var(--secondary-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))',      foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        cream: {
          DEFAULT: '#000000',
          50:  '#111',
          100: '#000000',
          200: '#111',
          300: '#222',
          400: '#333',
          500: '#444',
        },
      },
    },
  },
  plugins: [],
}