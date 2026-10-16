/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#f5f5ee",
        ink: "#1e1e1e",
        accent: "#d1495b",
        accent2: "#00798c",
        card: "#fffdf7"
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        body: ["'Source Sans 3'", "sans-serif"]
      },
      boxShadow: {
        card: "0 10px 30px rgba(30, 30, 30, 0.08)"
      }
    }
  },
  plugins: []
};
