/**
 * The supplied artwork, served as-is from /public/assets.
 *
 * These files are used exactly as provided — never renamed, re-encoded,
 * regenerated or replaced — and every reference in the app goes through this
 * table so a missing file is one grep away. Sizes are the intrinsic pixel
 * dimensions: layouts must not display an image wider than its own width.
 *
 * `optimize` marks the large generated files (1–2 MB). They are still served
 * from /assets unchanged; Next's image optimiser sends the browser a resized
 * copy for the size actually on screen, so a 44 px crest does not cost 1.2 MB.
 */
export const ASSETS = {
  railwayHero: { src: "/assets/railway-hero.jpg", w: 2048, h: 768 },
  railwayLight: { src: "/assets/railway-light.jpg", w: 464, h: 277 },
  railwayBranding: { src: "/assets/railway-branding.png", w: 2062, h: 763 },
  indiaIntegrity: { src: "/assets/india-integrity.png", w: 404, h: 277 },
  evidencePattern: { src: "/assets/evidence-pattern.png", w: 353, h: 246 },
  deviceEvidence: { src: "/assets/device-evidence.png", w: 386, h: 246 },
  handoff: { src: "/assets/handoff-rpf-grp.png", w: 353, h: 246 },
  evidenceFlow: { src: "/assets/evidence-flow.png", w: 387, h: 246 },
  helpCapture: { src: "/assets/help-capture.png", w: 340, h: 250 },
  helpSync: { src: "/assets/help-sync.png", w: 328, h: 250 },
  helpVerify: { src: "/assets/help-verify.png", w: 333, h: 250 },
  extraIcons: { src: "/assets/extra-icons.png", w: 477, h: 250 },
  // V2 complete pack, reference-specific/ — production-safe and generated art.
  crest: { src: "/assets/production-safe-crest.png", w: 1208, h: 1302, optimize: true },
  pramaanDevice: { src: "/assets/pramaan-device-hero.png", w: 1536, h: 1024, optimize: true },
  railwayFooter: { src: "/assets/reference-railway-footer.png", w: 250, h: 189 },
} as const satisfies Record<string, { src: string; w: number; h: number; optimize?: boolean }>;

export type AssetKey = keyof typeof ASSETS;
