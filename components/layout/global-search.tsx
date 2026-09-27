"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import {
  Cpu,
  FolderOpen,
  Search,
  User,
  X,
} from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { cx } from "@/components/ui/primitives";
import { useT } from "@/components/providers/prefs-provider";
import { RailIcon } from "@/components/ui/rail-icon";
import { RECORD_TYPE_LABEL } from "@/lib/domain/vocab";

type Hit = {
  kind: "Case" | "Record" | "Officer" | "Device";
  title: string;
  detail: string;
  href: string;
};

const ICON = {
  Case: FolderOpen,
  Record: FileText,
  Officer: User,
  Device: Cpu,
} as const;

/**
 * One search box over everything in the store: case ID, record ID, officer,
 * device, location and record type. Results are computed locally from the
 * store already in memory — nothing is sent anywhere.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search cases, records, device, train, coach"
        className={cx(
          "flex h-11 items-center gap-2.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-left text-[14px] text-fg-dim shadow-chip transition-colors duration-150 hover:border-line-strong hover:text-fg-muted",
          className,
        )}
      >
        <RailIcon name="search" size={18} className="shrink-0 text-fg-muted" />
        <span className="min-w-0 flex-1 truncate">
          <span className="sm:hidden">{t("search.short")}</span>
          <span className="hidden sm:inline">{t("search.placeholder")}</span>
        </span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border border-line-strong bg-ink-750 px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-dim md:inline">
          Ctrl K
        </kbd>
      </button>
      {open ? <SearchDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { store } = useApp();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    input.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hits = React.useMemo<Hit[]>(() => {
    if (!store) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const has = (...xs: (string | null | undefined)[]) =>
      xs.some((x) => x && x.toLowerCase().includes(needle));
    const out: Hit[] = [];
    for (const c of store.cases) {
      if (has(c.case_ref, c.place, c.title, c.opened_by_officer_id, c.device_id)) {
        out.push({
          kind: "Case",
          title: c.case_ref,
          detail: `${c.place} · ${c.title}`,
          href: `/cases/${c.case_ref}`,
        });
      }
    }
    for (const r of store.records) {
      const typeLabel = RECORD_TYPE_LABEL[r.type] ?? r.type;
      if (has(r.record_id, r.officer_id, r.device_id, typeLabel, r.type)) {
        out.push({
          kind: "Record",
          title: r.record_id,
          detail: `${typeLabel} · ${r.case_ref} · ${r.officer_id}`,
          href: `/cases/${r.case_ref}?record=${encodeURIComponent(r.record_id)}`,
        });
      }
    }
    for (const r of store.records) {
      if (r.type !== "screening_flag") continue;
      const p = r.payload as { train_id?: string; coach?: string; seat?: string };
      if (has(p.train_id, p.coach, p.seat && `seat ${p.seat}`)) {
        out.push({
          kind: "Record",
          title: `${r.record_id} · DEMO screening flag`,
          detail: `Train ${p.train_id} · Coach ${p.coach} · Seat ${p.seat} · ${r.case_ref}`,
          href: `/cases/${r.case_ref}?record=${encodeURIComponent(r.record_id)}`,
        });
      }
    }
    for (const o of store.officers) {
      if (has(o.officer_id, o.name, o.rank)) {
        const firstCase = store.cases.find((c) => c.opened_by_officer_id === o.officer_id);
        out.push({
          kind: "Officer",
          title: `${o.name}`,
          detail: `${o.officer_id} · ${o.rank} · ${o.force}`,
          href: firstCase ? `/cases?officer=${o.officer_id}` : "/cases",
        });
      }
    }
    for (const d of store.devices) {
      if (has(d.device_id, d.make, d.model)) {
        out.push({
          kind: "Device",
          title: d.device_id,
          detail: `${d.make} ${d.model}`,
          href: "/settings/device",
        });
      }
    }
    return out.slice(0, 24);
  }, [store, q]);

  React.useEffect(() => setCursor(0), [q]);

  const go = (h: Hit) => {
    onClose();
    router.push(h.href);
  };

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-4 pt-[10vh]">
      <div className="absolute inset-0 animate-[fade-in_.18s_ease-out] bg-fg/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-[640px] animate-fade-up overflow-hidden rounded-2xl border border-line-strong bg-white shadow-lift"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-fg-dim" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, hits.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === "Enter" && hits[cursor]) go(hits[cursor]);
            }}
            placeholder="Case, record, officer, device, train, coach, location or record type"
            aria-label="Search query"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="global-search-results"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-dim"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-ink-750 hover:text-fg"
          >
            <X size={17} />
          </button>
        </div>
        <ul id="global-search-results" role="listbox" className="max-h-[56vh] overflow-y-auto p-2">
          {!q.trim() ? (
            <li className="px-3 py-8 text-center text-[13.5px] text-fg-muted">
              Try <span className="mono">CASE-2026</span>, <span className="mono">RPF-104</span>,{" "}
              <span className="mono">EC-RPF-042</span>, a station name or “field test”.
            </li>
          ) : hits.length === 0 ? (
            <li className="px-3 py-8 text-center text-[13.5px] text-fg-muted">
              Nothing matches “{q}”. Check the spelling, or search by case ID.
            </li>
          ) : (
            hits.map((h, i) => {
              const Icon = ICON[h.kind];
              return (
                <li key={`${h.kind}-${h.title}-${i}`} role="option" aria-selected={i === cursor}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(h)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                      i === cursor ? "bg-brand/[0.08]" : "hover:bg-ink-750",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/[0.09] text-brand">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-fg">{h.title}</span>
                      <span className="block truncate text-[12.5px] text-fg-muted">{h.detail}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-dim">
                      {h.kind}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
