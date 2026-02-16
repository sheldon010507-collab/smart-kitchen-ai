/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#171717",
        primary: "#171717",
        secondary: "#f5f5f5",
        accent: "#4285F4", // Google Blue
        scanline: "#34A853", // Google Green
        "brand-green": "#34A853",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "gemini-gradient": "linear-gradient(90deg, #4285F4, #9B72CB, #D96570)",
      },
    },
  },
  plugins: [],
}
