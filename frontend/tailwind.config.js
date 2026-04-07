/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface": "#f7f9fb",
        "on-surface": "#191c1e",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "on-surface-variant": "#45464d",
        "outline-variant": "#c6c6cd",
        "primary": "#001e2f",
        "on-primary": "#ffffff",
        "primary-container": "#001e2f",
        "on-primary-container": "#008cc7",
        "secondary-container": "#d5e0f8",
        "on-secondary-container": "#586377",
        "tertiary-fixed": "#6ffbbe",
        "on-tertiary-fixed": "#002113",
        "tertiary-fixed-dim": "#4edea3",
        "on-tertiary-fixed-variant": "#005236",
        "error": "#ba1a1a",
        "outline": "#76777d",
      },
      fontFamily: {
        "headline": ["Manrope", "sans-serif"],
        "body": ["Inter", "sans-serif"],
      },
      borderRadius: {
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px",
      },
    },
  },
  plugins: [],
}
