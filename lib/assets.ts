/**
 * The supplied artwork, served as-is from /public/assets.
 *
 * These files are used exactly as provided — never renamed, re-encoded,
 * regenerated or replaced — and every reference in the app goes through this
 * table so a missing file is one grep away. Sizes are the intrinsic pixel
 * dimensions: layouts must not display an image wider than its own width.
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
} as const;

export type AssetKey = keyof typeof ASSETS;
