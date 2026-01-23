import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Neo-Brutalism Color Palette
        brutal: {
          yellow: '#FFDE59',
          pink: '#FF6B9D',
          blue: '#4ECDC4',
          green: '#95E1A3',
          orange: '#FF9F45',
          purple: '#A855F7',
          red: '#FF6B6B',
          black: '#1a1a1a',
          white: '#FFFEF0',
        },
      },
      boxShadow: {
        // Neo-Brutalism Shadows
        brutal: '4px 4px 0px 0px #1a1a1a',
        'brutal-sm': '2px 2px 0px 0px #1a1a1a',
        'brutal-lg': '6px 6px 0px 0px #1a1a1a',
        'brutal-hover': '6px 6px 0px 0px #1a1a1a',
        'brutal-active': '2px 2px 0px 0px #1a1a1a',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
}
export default config
