"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { usePrefs } from "@/components/providers/prefs-provider";
import { LANGUAGES, type Locale } from "@/lib/i18n/strings";
import { RailIcon } from "@/components/ui/rail-icon";
import { cx } from "@/components/ui/primitives";

/**
 * Language choice. Each option is written in its own script, with its English
 * name beside it, so anyone can find their language whatever is on screen.
 */

/** Header dropdown: current language, opens the full list. */
export function LanguageMenu({ className }: { className?: string }) {
  const { locale, setLocale, t } = usePrefs();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("header.language")}: ${current.native} (${current.english})`}
        className="flex h-10 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-2.5 text-[13.5px] font-semibold text-brand transition-colors hover:bg-brand-soft"
      >
        <Languages size={16} aria-hidden="true" />
        <span lang={current.code}>{current.native}</span>
        <RailIcon name="chevron-down" size={14} className="text-fg-dim" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[240px] animate-fade-up rounded-[12px] border border-line-strong bg-white p-1.5 shadow-lift">
          <div className="px-2.5 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-dim">
            {t("header.chooseLanguage")}
          </div>
          <LanguageList
            value={locale}
            onPick={(l) => {
              setLocale(l);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Vertical list, used inside the header dropdown. */
function LanguageList({ value, onPick }: { value: Locale; onPick: (l: Locale) => void }) {
  return (
    <ul role="listbox" aria-label="Languages" className="max-h-[60vh] overflow-y-auto">
      {LANGUAGES.map((l) => {
        const active = l.code === value;
        return (
          <li key={l.code} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => onPick(l.code)}
              className={cx(
                "flex min-h-[40px] w-full items-center justify-between gap-2 rounded-[8px] px-2.5 text-left text-[14px] transition-colors",
                active ? "bg-brand-tint font-semibold text-brand-deep" : "text-fg hover:bg-brand-soft",
              )}
            >
              <span lang={l.code}>{l.native}</span>
              <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
                {l.code === "en" ? null : l.english}
                {active ? <RailIcon name="check" size={15} className="text-brand" /> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** A grid of language buttons, for the sign-in page and the operator menu. */
export function LanguageGrid({ columns = 3, compact = false }: { columns?: 2 | 3 | 4; compact?: boolean }) {
  const { locale, setLocale } = usePrefs();
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={cx(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {LANGUAGES.map((l) => {
        const active = l.code === locale;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(l.code)}
            className={cx(
              "flex flex-col items-start rounded-[10px] border px-3 text-left transition-colors",
              compact ? "py-1.5" : "py-2",
              active
                ? "border-brand bg-brand-tint shadow-[inset_0_0_0_1px_rgba(35,66,124,0.5)]"
                : "border-line-strong bg-white hover:border-brand/40 hover:bg-brand-soft",
            )}
          >
            <span lang={l.code} className={cx("font-semibold leading-tight", active ? "text-brand-deep" : "text-fg", compact ? "text-[13.5px]" : "text-[14.5px]")}>
              {l.native}
            </span>
            {l.code === "en" ? null : <span className="text-[11.5px] leading-tight text-fg-muted">{l.english}</span>}
          </button>
        );
      })}
    </div>
  );
}
