import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        app: "#0B0E14",
        panel: "#131722",
        elevated: "#1B2230",
        accent: "#3B82F6",
        success: "#10B981",
        muted: "#8B95A7"
      },
      boxShadow: { glow: "0 0 30px rgba(59, 130, 246, 0.12)" }
    }
  },
  plugins: []
};
export default config;
