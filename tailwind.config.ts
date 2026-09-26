import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E0C0A",
        gold: "#F5B301",
        panel: "#171410",
      },
    },
  },
  plugins: [],
};
export default config;
