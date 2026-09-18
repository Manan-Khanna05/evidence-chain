import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { HardwareProvider } from "@/components/providers/hardware-provider";

/** Self-hosted at build time by next/font — no font request leaves the app at runtime. */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Evidence Chain — Railway Evidence Integrity Console",
  description:
    "Structured evidence capture for railway narcotics events: s.43 trigger, presumptive field test and RPF to GRP custody handoff, hash-chained and anchored to bounded trusted time.",
};

export const viewport: Viewport = {
  themeColor: "#F6F8FC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppProvider>
          <HardwareProvider>{children}</HardwareProvider>
        </AppProvider>
      </body>
    </html>
  );
}
