import type { Config } from "tailwindcss";

/**
 * Design tokens — V2 warm railway: ivory canvas, forest green, graphite.
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
        gold: { DEFAULT: "#C99A3D", soft: "#F4E8C9" },
        terracotta: { DEFAULT: "#B86B50", soft: "#F4E2DA" },
        sage: "#AEBEAE",
        /* Surfaces, lightest → most recessed. */
        ink: {
          900: "#F7F3EA", // page canvas — warm ivory
          850: "#FFFDF8", // sidebar / raised surface
          800: "#FFFFFF", // card fill (used with /75–/88 for glass)
          750: "#F3EFE5", // hover / inset surface
          700: "#E9E3D5", // pressed / stronger inset
          600: "#DCD5C4",
          500: "#C6BEA9",
        },
        line: {
          DEFAULT: "#E6DFD0", // warm hairline
          strong: "#D6CDB8", // cool hairline for controls
        },
        fg: {
          DEFAULT: "#252722", // graphite
          muted: "#687066",
          dim: "#8A9186",
        },
        brand: {
          DEFAULT: "#285943", // forest green
          deep: "#173C2B", // deep forest
          soft: "#DCE9DF", // tinted fill
        },
        ok: "#2F7D53", // success green
        warn: "#C9851A", // warm gold
        danger: "#B7473D", // terracotta red
        info: "#4E6E5D", // sage,
        sim: "#B86B50", // terracotta — simulated / demo
        saffron: "#C99A3D",
        india: "#2F7D53",
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
          "0%": { boxShadow: "0 0 0 0 rgba(47,125,83,0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(47,125,83,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(47,125,83,0)" },
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
