/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        "128": "32rem",
      },
      colors: {
        "custom-green": "#14a800",
      }
    }
  },
  plugins: [],
  safelist: [
    "cursor-not-allowed"
  ]
}

