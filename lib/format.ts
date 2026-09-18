/** Presentation helpers. All time rendering runs client-side after mount. */

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return "just now";
  if (Math.abs(mins) < 60) return `${mins > 0 ? "" : "in "}${Math.abs(mins)} min${Math.abs(mins) === 1 ? "" : "s"}${mins > 0 ? " ago" : ""}`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return `${hrs > 0 ? "" : "in "}${Math.abs(hrs)} hr${Math.abs(hrs) === 1 ? "" : "s"}${hrs > 0 ? " ago" : ""}`;
  return fmtDate(iso);
}

export function minutesBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const d = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(d)) return null;
  return Math.round(d / 60000);
}

/** "14:02 – 14:19" or, with no lower bound, "not later than 14:02". */
export function fmtInterval(start: string | null, end: string): string {
  if (!start) return `not later than ${fmtTime(end)}`;
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
