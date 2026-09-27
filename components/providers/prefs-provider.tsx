"use client";

import * as React from "react";
import { isLocale, translate, type Locale, type StringKey } from "@/lib/i18n/strings";

/**
 * Per-viewer display preferences: interface language and text size.
 *
 * Both live in this browser only (localStorage) and never touch evidence. The
 * language is first chosen on the sign-in page and can be changed at any time
 * from the header or the operator menu.
 * Text size scales the page content area, not the navigation, so the frame
 * stays put while the reading area grows.
 */

export type TextScale = "sm" | "md" | "lg";
export const TEXT_SCALE: Record<TextScale, number> = { sm: 0.92, md: 1, lg: 1.1 };

type Prefs = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  textScale: TextScale;
  setTextScale: (s: TextScale) => void;
  t: (key: StringKey) => string;
};

const PrefsContext = React.createContext<Prefs | null>(null);

const LOCALE_KEY = "evidence-chain.locale";
const SCALE_KEY = "evidence-chain.text-scale";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private window or blocked storage: the preference just won't persist */
  }
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("en");
  const [textScale, setScaleState] = React.useState<TextScale>("md");

  React.useEffect(() => {
    const l = read(LOCALE_KEY);
    if (isLocale(l)) setLocaleState(l);
    const s = read(SCALE_KEY);
    if (s === "sm" || s === "md" || s === "lg") setScaleState(s);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = React.useMemo<Prefs>(
    () => ({
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        write(LOCALE_KEY, l);
      },
      textScale,
      setTextScale: (s) => {
        setScaleState(s);
        write(SCALE_KEY, s);
      },
      t: (key) => translate(locale, key),
    }),
    [locale, textScale],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = React.useContext(PrefsContext);
  if (!ctx) {
    // Outside the provider (e.g. an isolated test render): English, default size.
    return {
      locale: "en",
      setLocale: () => {},
      textScale: "md",
      setTextScale: () => {},
      t: (key) => translate("en", key),
    };
  }
  return ctx;
}

export function useT() {
  return usePrefs().t;
}
