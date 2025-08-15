/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode with class strategy
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      colors: {
        // Medical color palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Main primary color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // Main secondary color
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Status colors
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        },
        info: {
          500: '#3b82f6',
          600: '#2563eb',
        },
        // Light/Dark mode colors
        light: {
          bg: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
        },
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc',
          textSecondary: '#94a3b8',
          border: '#334155',
          bg: "#0f1220",
          surface: "#182033",
          text: "#ffffff",
          border: "#27314a",
        },
        accent: { DEFAULT: "#3b82f6", dark: "#1e40af" },
      },
    },
  },
  plugins: [],
};
