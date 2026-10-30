import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        elvora: {
          blue: "#2563EB",
          "blue-hover": "#1D4ED8",
          navy: "#0F172A",
          heading: "#111827",
          body: "#475569",
          muted: "#64748B",
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          teal: "#0D9488",
          success: "#16A34A",
          warning: "#D97706",
          error: "#DC2626",
        },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
