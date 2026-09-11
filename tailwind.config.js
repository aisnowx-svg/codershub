/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dev: {
          bg: '#f8fafc',          // Very light off-white / light slate
          surface: '#ffffff',     // Pure white surfaces
          surfaceHover: '#f1f5f9',
          surfaceActive: '#e2e8f0',
          card: '#ffffff',
          cardBorder: '#e2e8f0',  // Subtle light gray border
          subtleBorder: '#f1f5f9',
          textPrimary: '#0f172a', // Deep slate primary
          textMuted: '#64748b',   // Calm secondary slate
          textDim: '#94a3b8',     // Muted tertiary
          accent: '#2563eb',       // Modern soft blue
          accentHover: '#1d4ed8',
          accentSoft: '#eff6ff',   // Soft blue tint for active backgrounds
          accentBorder: '#bfdbfe',
          emerald: '#10b981',     // Soft green
          amber: '#f59e0b',       // Subtle amber
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 10px -2px rgba(15, 23, 42, 0.04), 0 1px 3px -1px rgba(15, 23, 42, 0.03)',
        'soft-hover': '0 8px 24px -4px rgba(15, 23, 42, 0.07), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'modal': '0 20px 40px -8px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      }
    },
  },
  plugins: [],
}
