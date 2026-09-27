import type { Config } from "tailwindcss";

/**
 * Design tokens — Indian Railways visual language: navy, white, light railway
 * blue, orange and graphite. Green is for success only, red for integrity
 * failure only. Mirrored as --ec-* CSS variables in app/globals.css.
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
        /* Railway orange: primary actions, the active indicator, attention. */
        accent: {
          DEFAULT: "#F57C20", // railway orange — accents, indicators, icon wells
          strong: "#D9600C", // filled buttons (white text needs the deeper shade)
          hover: "#C8570A",
          soft: "#FFF1E6", // tinted fill
          ink: "#B4530B", // orange text on white (5:1)
        },
        /* Older accent names now resolve to the railway palette. */
        gold: { DEFAULT: "#F57C20", soft: "#FFF1E6" },
        terracotta: { DEFAULT: "#D2561A", soft: "#FDEBDF" },
        sage: "#C9D5E8",
        /* Surfaces, lightest → most recessed. */
        ink: {
          900: "#F7F8FA", // page canvas
          850: "#FFFFFF", // surface
          800: "#FFFFFF", // card fill
          750: "#F1F4F9", // hover / inset surface
          700: "#E6EBF3", // pressed / stronger inset
          600: "#D9DEE8",
          500: "#B8C1D1",
        },
        line: {
          DEFAULT: "#D9DEE8", // 1px border
          strong: "#C5CDDA", // controls
        },
        fg: {
          DEFAULT: "#1F2937", // primary text
          muted: "#667085", // secondary text
          dim: "#7A8599", // metadata
        },
        brand: {
          DEFAULT: "#23427C", // railway navy
          deep: "#173666", // deep navy
          mid: "#2D5AA0", // secondary railway blue
          soft: "#EEF4FF", // light railway blue
          tint: "#E3ECFB", // active navigation
        },
        ok: { DEFAULT: "#2E7D32", ink: "#1B5E20", soft: "#EAF4EA" }, // success only
        warn: { DEFAULT: "#C77C00", ink: "#8A5300" }, // pending / caution
        danger: { DEFAULT: "#C62828", ink: "#9F1D1D" }, // integrity failure only
        info: "#2D5AA0",
        sim: { DEFAULT: "#D2561A", ink: "#A4440C" }, // simulated / demo marker
        saffron: "#F57C20",
        india: "#2E7D32",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        deva: ["var(--font-deva)", "var(--font-serif)", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "12px",
        panel: "14px",
      },
      boxShadow: {
        /* Quiet, portal-like elevation: a hairline and a short soft drop. */
        glass: "0 1px 2px 0 rgba(16,24,40,0.05)",
        lift: "0 8px 24px -12px rgba(16,24,40,0.22), 0 2px 6px -2px rgba(16,24,40,0.06)",
        hero: "0 10px 30px -18px rgba(23,54,102,0.35)",
        chip: "0 1px 2px 0 rgba(16,24,40,0.05)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(46,125,50,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
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
