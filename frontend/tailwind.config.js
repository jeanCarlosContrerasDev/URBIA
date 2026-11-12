/**
 * Tailwind CSS v4 se configura principalmente desde CSS (@theme en src/index.css).
 * Este archivo se carga mediante la directiva `@config` en index.css para
 * extensiones en JS (colores de marca, plugins, etc.).
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        urbix: {
          50: "#ecfeff",
          100: "#cffafe",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          900: "#164e63",
        },
      },
    },
  },
  plugins: [],
};

