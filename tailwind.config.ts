import type { Config } from "tailwindcss";

/**
 * Design tokens — V2 railway: ivory canvas, railway green, graphite, brass,
 * terracotta. Mirrored as --ec-* CSS variables in app/globals.css.
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
        /* V2 accents used sparingly for state and emphasis. */
        gold: { DEFAULT: "#C58A27", soft: "#F4E6C5" },
        terracotta: { DEFAULT: "#B65C45", soft: "#F6E1DA" },
        sage: "#AEBEAE",
        /* Surfaces, lightest → most recessed. */
        ink: {
          900: "#F5F0E5", // page canvas — railway ivory
          850: "#FFFDF8", // warm surface
          800: "#FFFFFF", // card fill (used with /75–/88 for glass)
          750: "#F3EFE5", // hover / inset surface
          700: "#EAE3D3", // pressed / stronger inset
          600: "#DCD5C4",
          500: "#C6BEA9",
        },
        line: {
          DEFAULT: "#E5DDCC", // warm hairline
          strong: "#D5CBB5", // cool hairline for controls
        },
        fg: {
          DEFAULT: "#252525", // graphite
          muted: "#6B716A",
          dim: "#8B9088",
        },
        brand: {
          DEFAULT: "#14532D", // railway green
          deep: "#0B3B27", // deep green
          soft: "#E1EBE2", // tinted fill
        },
        ok: "#2E7D52", // verified
        warn: "#C58A27", // brass — pending
        danger: "#B84035", // integrity failure
        info: "#4E6E5D", // sage — informational,
        sim: "#B65C45", // terracotta — demo / attention
        saffron: "#C58A27",
        india: "#2E7D52",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        deva: ["var(--font-deva)", "var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "20px",
        panel: "24px",
      },
      boxShadow: {
        /* Soft, wide, low-opacity — expensive rather than flashy. */
        glass:
          "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 10px 30px -18px rgba(50,44,35,0.28), 0 2px 6px -3px rgba(50,44,35,0.10)",
        lift: "0 18px 44px -26px rgba(50,44,35,0.42), 0 4px 12px -6px rgba(50,44,35,0.12)",
        hero: "0 24px 60px -32px rgba(50,44,35,0.45)",
        chip: "0 1px 2px 0 rgba(50,44,35,0.06)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(46,125,82,0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(46,125,82,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(46,125,82,0)" },
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
