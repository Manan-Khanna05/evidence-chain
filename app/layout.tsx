import type { Metadata, Viewport } from "next";
import {
  Inter,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Noto_Serif_Devanagari,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { HardwareProvider } from "@/components/providers/hardware-provider";
import { PrefsProvider } from "@/components/providers/prefs-provider";

/** Self-hosted at build time by next/font — no font request leaves the app at runtime. */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
/** The display serif for the brand, hero and page titles — the reference's printed-notice voice. */
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["600", "700"], display: "swap", variable: "--font-serif" });
/** Devanagari for the bilingual slogan, so Hindi is real text rather than a picture of text. */
const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-deva",
});

/**
 * One Noto Sans per Indian script, for the interface languages. Each carries
 * only its own script, so the browser downloads a file only when that script
 * is actually on screen; Latin text stays in Inter.
 */
const notoDeva = Noto_Sans_Devanagari({ subsets: ["devanagari"], display: "swap", preload: false, variable: "--font-noto-deva" });
const notoBeng = Noto_Sans_Bengali({ subsets: ["bengali"], display: "swap", preload: false, variable: "--font-noto-beng" });
const notoTaml = Noto_Sans_Tamil({ subsets: ["tamil"], display: "swap", preload: false, variable: "--font-noto-taml" });
const notoTelu = Noto_Sans_Telugu({ subsets: ["telugu"], display: "swap", preload: false, variable: "--font-noto-telu" });
const notoGujr = Noto_Sans_Gujarati({ subsets: ["gujarati"], display: "swap", preload: false, variable: "--font-noto-gujr" });
const notoKnda = Noto_Sans_Kannada({ subsets: ["kannada"], display: "swap", preload: false, variable: "--font-noto-knda" });
const notoMlym = Noto_Sans_Malayalam({ subsets: ["malayalam"], display: "swap", preload: false, variable: "--font-noto-mlym" });
const notoGuru = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], display: "swap", preload: false, variable: "--font-noto-guru" });
const notoOrya = Noto_Sans_Oriya({ subsets: ["oriya"], display: "swap", preload: false, variable: "--font-noto-orya" });
const indicVars = [notoDeva, notoBeng, notoTaml, notoTelu, notoGujr, notoKnda, notoMlym, notoGuru, notoOrya]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Evidence Chain — Railway Evidence Integrity Console",
  description:
    "Structured evidence capture for railway narcotics events: s.43 trigger, presumptive field test and RPF to GRP custody handoff, hash-chained and anchored to bounded trusted time.",
};

export const viewport: Viewport = {
  themeColor: "#23427C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${devanagari.variable} ${indicVars}`}>
      <body>
        <PrefsProvider>
          <AppProvider>
            <HardwareProvider>{children}</HardwareProvider>
          </AppProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
