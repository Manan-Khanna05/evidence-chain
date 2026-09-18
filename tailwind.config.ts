import type { Config } from "tailwindcss";

/**
 * Design tokens — premium light / warm ivory / glass.
 *
 * The token NAMES are stable across the app (ink-*, line, fg-*, brand, ok,
 * warn, danger, info, sim). Only their values changed when the console moved
 * from the dark forensic theme to this one, which is why a palette change
 * propagates to every screen instead of being re-specified per component.
 *
 * Every surface colour is a solid hex so Tailwind's opacity modifier works:
 * `bg-ink-800/75` is the glass fill, `border-white/70` the glass rim.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Surfaces, lightest → most recessed. */
        ink: {
          900: "#F5F3ED", // page canvas — warm ivory
          850: "#FBFAF6", // sidebar / raised cream
          800: "#FFFFFF", // card fill (used with /75–/88 for glass)
          750: "#F1F5FA", // hover / inset surface
          700: "#E8EEF6", // pressed / stronger inset
          600: "#DDE5EF",
          500: "#CBD6E4",
        },
        line: {
          DEFAULT: "#E7E4DA", // warm hairline
          strong: "#D6DEE9", // cool hairline for controls
        },
        fg: {
          DEFAULT: "#152238", // deep navy, never pure black
          muted: "#4E6180",
          dim: "#8093AA",
        },
        brand: {
          DEFAULT: "#2E6BE6", // soft royal blue
          deep: "#1B3F91", // navy for headings/logo
          soft: "#E7EFFD", // tinted fill
        },
        ok: "#0F9D6E", // emerald
        warn: "#D98324", // warm amber
        danger: "#E05252", // soft coral
        info: "#2E6BE6",
        sim: "#7C5CD6", // lavender / violet
        saffron: "#E8891E",
        india: "#0E8A4F",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "20px",
        panel: "24px",
      },
      boxShadow: {
        /* Soft, wide, low-opacity — expensive rather than flashy. */
        glass:
          "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 10px 30px -18px rgba(21,34,56,0.28), 0 2px 6px -3px rgba(21,34,56,0.10)",
        lift: "0 18px 44px -26px rgba(21,34,56,0.42), 0 4px 12px -6px rgba(21,34,56,0.12)",
        hero: "0 24px 60px -32px rgba(21,34,56,0.45)",
        chip: "0 1px 2px 0 rgba(21,34,56,0.06)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(15,157,110,0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(15,157,110,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(15,157,110,0)" },
        },
        "grow-x": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-up": "fade-up .3s cubic-bezier(.22,.61,.36,1) both",
        "pulse-ring": "pulse-ring 2.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
