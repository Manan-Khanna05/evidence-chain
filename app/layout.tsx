import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { HardwareProvider } from "@/components/providers/hardware-provider";

export const metadata: Metadata = {
  title: "Evidence Chain — Railway Evidence Integrity Console",
  description:
    "Structured evidence capture for railway narcotics events: s.43 trigger, presumptive field test and RPF to GRP custody handoff, hash-chained and anchored to bounded trusted time.",
};

export const viewport: Viewport = {
  themeColor: "#0A0E13",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <HardwareProvider>{children}</HardwareProvider>
        </AppProvider>
      </body>
    </html>
  );
}
