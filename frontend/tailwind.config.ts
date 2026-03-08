import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts,jsx,tsx,mdx}',
    './src/styles/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAFAF7',
          background: '#FAFAF7',
        },
        accent: {
          DEFAULT: '#16A34A',
          green: '#16A34A',
        },
        dark: {
          DEFAULT: '#1A1A1A',
          text: '#1A1A1A',
        },
        muted: {
          DEFAULT: '#6B7280',
        },
        'card-bg': {
          DEFAULT: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E5E5',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        sans: ['Inter', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
