import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_Devanagari, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { HardwareProvider } from "@/components/providers/hardware-provider";

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

export const metadata: Metadata = {
  title: "Evidence Chain — Railway Evidence Integrity Console",
  description:
    "Structured evidence capture for railway narcotics events: s.43 trigger, presumptive field test and RPF to GRP custody handoff, hash-chained and anchored to bounded trusted time.",
};

export const viewport: Viewport = {
  themeColor: "#F5F0E5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${devanagari.variable}`}>
      <body>
        <AppProvider>
          <HardwareProvider>{children}</HardwareProvider>
        </AppProvider>
      </body>
    </html>
  );
}
