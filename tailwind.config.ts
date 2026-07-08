import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#08070F",
        surface: "#0F0E1A",
        "surface-raised": "#16142650",
        border: {
          DEFAULT: "#26233C",
          glow: "#4C3B8F",
        },
        signal: {
          purple: "#8B5CF6",
          violet: "#6D28D9",
          blue: "#3B82F6",
          cyan: "#22D3EE",
        },
        ink: {
          DEFAULT: "#F4F2FA",
          dim: "#A6A2C0",
          faint: "#6E6A8C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.15), transparent 60%)",
        "signal-gradient": "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
        "trust-ring": "conic-gradient(from 0deg, #22D3EE, #8B5CF6, #3B82F6, #22D3EE)",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(139,92,246,0.45)",
        "glow-cyan": "0 0 30px -8px rgba(34,211,238,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
