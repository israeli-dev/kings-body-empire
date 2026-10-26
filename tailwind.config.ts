import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E0C0A",
        panel: "#171410",
        panel2: "#1F1A14",
        line: "#2C251C",
        gold: "#F5B301",
        goldSoft: "#FFD978",
        ink: "#F7F5EF",
        muted: "#A79F94",
        danger: "#F87171",
        success: "#7BE495",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245,179,1,0.25), 0 18px 45px -20px rgba(245,179,1,0.45)",
      },
      backgroundImage: {
        "gold-fade": "linear-gradient(135deg, #FFD978 0%, #F5B301 45%, #B47800 100%)",
        "panel-fade":
          "radial-gradient(120% 120% at 0% 0%, rgba(245,179,1,0.12) 0%, rgba(14,12,10,0) 55%)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
