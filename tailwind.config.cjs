module.exports = {
  darkMode: "class",
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        light: {
          bg: "#ffffff",
          surface: "#f5f7fa",
          text: "#000000",
          border: "#e2e8f0",
        },
        dark: {
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
