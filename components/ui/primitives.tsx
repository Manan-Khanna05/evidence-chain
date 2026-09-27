"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Loader2 } from "lucide-react";
import { Check, ChevronRight } from "@/components/ui/icons";
import { ASSETS } from "@/lib/assets";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ panel */

export function Panel({
  children,
  className,
  solid = false,
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  /** Slightly more opaque, for dense content like tables and forms. */
  solid?: boolean;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={cx("panel", solid && "panel-solid", className)}>{children}</Tag>;
}

/** Alias used by newer screens; same surface, clearer name. */
export const GlassCard = Panel;

export function PanelHead({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="panel-head">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <IconContainer size="sm">{icon}</IconContainer> : null}
        <div className="min-w-0">
          <h2 className="panel-title">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="label">{children}</div>;
}

/* ----------------------------------------------------------------- status */

export type Tone = "ok" | "warn" | "danger" | "info" | "sim" | "neutral" | "brand";

/** Pill / chip surface: tinted fill, soft rim, readable text on cream. */
const TONES: Record<Tone, string> = {
  ok: "border-ok/25 bg-ok/[0.10] text-ok-ink",
  warn: "border-warn/30 bg-warn/[0.12] text-warn-ink",
  danger: "border-danger/30 bg-danger/[0.10] text-danger-ink",
  info: "border-info/25 bg-brand-soft text-brand-deep",
  sim: "border-sim/28 bg-sim/[0.10] text-sim-ink",
  brand: "border-brand/25 bg-brand-soft text-brand-deep",
  neutral: "border-line-strong bg-white text-fg-muted",
};

/** Solid accent colour for numerals, icons and rules. */
export const TONE_FG: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  info: "text-info",
  sim: "text-sim",
  brand: "text-brand",
  neutral: "text-fg",
};

/** Soft tinted container background, for icon wells and accent panels. */
export const TONE_BG: Record<Tone, string> = {
  ok: "bg-ok/[0.10] border-ok/20",
  warn: "bg-warn/[0.12] border-warn/22",
  danger: "bg-danger/[0.10] border-danger/22",
  info: "bg-info/[0.09] border-info/20",
  sim: "bg-sim/[0.10] border-sim/20",
  brand: "bg-brand/[0.09] border-brand/20",
  neutral: "bg-ink-750 border-line-strong",
};

/* ----------------------------------------------------------------- button */

type ButtonVariant = "primary" | "navy" | "secondary" | "accent" | "ghost" | "danger" | "success";

function buttonClasses(variant: ButtonVariant, size: "sm" | "md" | "lg") {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 select-none";
  const sizes = {
    sm: "h-9 px-3 text-[13px]",
    md: "h-11 px-4 text-[14px]",
    lg: "h-12 px-5 text-[15px]",
  }[size];
  const variants: Record<ButtonVariant, string> = {
    /* Railway orange: the one main action in an area. */
    primary: "bg-accent-strong text-white shadow-chip hover:bg-accent-hover active:bg-accent-hover",
    /* Navy: strong secondary actions (technical details, open, confirm). */
    navy: "bg-brand text-white shadow-chip hover:bg-brand-deep active:bg-brand-deep",
    /* Outline navy: everything else. */
    secondary: "border border-line-strong bg-white text-brand shadow-chip hover:border-brand/45 hover:bg-brand-soft",
    /* Orange outline: demo mode and other railway-accented secondary actions. */
    accent: "border border-accent/50 bg-accent-soft text-accent-ink shadow-chip hover:border-accent hover:bg-[#FFE6D2]",
    ghost: "text-fg-muted hover:text-fg hover:bg-ink-750",
    danger: "border border-danger/30 bg-danger/[0.09] text-danger-ink hover:bg-danger/[0.15]",
    success: "border border-ok/30 bg-ok/[0.09] text-ok-ink hover:bg-ok/[0.15]",
  };
  return cx(base, sizes, variants[variant]);
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  busy,
  className,
  icon,
  ...rest
}: React.ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button className={cx(buttonClasses(variant, size), className)} {...rest}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

/**
 * A link that looks like a button. Wrapping a <Button> in a <Link> would nest
 * interactive content inside an anchor — invalid HTML and a duplicated tab stop.
 */
export function ButtonLink({
  href,
  children,
  variant = "secondary",
  size = "md",
  className,
  icon,
  title,
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: React.ReactNode;
  title?: string;
}) {
  return (
    <Link href={href} title={title} className={cx(buttonClasses(variant, size), className)}>
      {icon}
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------- icon well */

/**
 * Icons always sit in a soft rounded container rather than floating loose.
 * Sizes are human-scaled: sm for list rows, md for card headers, lg for the
 * major workflow nodes.
 */
export function IconContainer({
  children,
  tone = "brand",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: "h-8 w-8 rounded-[10px]",
    md: "h-10 w-10 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
  }[size];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center border",
        dims,
        TONE_BG[tone],
        TONE_FG[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- pill */

export function Pill({
  children,
  tone = "neutral",
  icon,
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.01em]",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** A dot + label, so status is never conveyed by colour alone. */
export function StatusDot({ tone }: { tone: Tone }) {
  const dot: Record<Tone, string> = {
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    info: "bg-info",
    sim: "bg-sim",
    brand: "bg-brand",
    neutral: "bg-fg-dim",
  };
  return <span className={cx("inline-block h-2 w-2 shrink-0 rounded-full", dot[tone])} />;
}

/* ------------------------------------------------------------------- hash */

export function HashChip({
  value,
  label,
  full = false,
  tone = "neutral",
}: {
  value: string | null | undefined;
  label?: string;
  full?: boolean;
  tone?: Tone;
}) {
  const [copied, setCopied] = React.useState(false);
  if (!value) return <span className="mono text-fg-dim">—</span>;
  const shown = full ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
  return (
    <button
      type="button"
      title={`${label ? label + ": " : ""}${value} — click to copy`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable — the title attribute still shows the value */
        }
      }}
      className={cx(
        "mono group inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-[3px] transition-colors",
        TONES[tone],
        full && "break-all text-left",
      )}
    >
      <span className={full ? "break-all" : "truncate"}>{shown}</span>
      {copied ? (
        <Check size={11} className="shrink-0" />
      ) : (
        <Copy size={11} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ misc */

export function KeyValue({
  k,
  children,
  hint,
  className,
}: {
  k: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="label">{k}</div>
      <div className="mt-1 text-[13.5px] leading-snug text-fg">{children}</div>
      {hint ? <div className="mt-1 text-[11.5px] leading-snug text-fg-dim">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  scene = false,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  /** Show the supplied railway-light platform scene above the message. */
  scene?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 pb-14 pt-10 text-center">
      {scene ? (
        <div
          aria-hidden="true"
          className="relative mb-1 aspect-[464/200] w-full max-w-[380px] overflow-hidden rounded-2xl border border-line"
          style={{
            backgroundImage: `url(${ASSETS.railwayLight.src})`,
            // Framed on the train; the station signboard on the left stays out of view.
            backgroundSize: "185% auto",
            backgroundPosition: "right 62%",
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.85) 100%)" }} />
          {icon ? (
            <span className="absolute bottom-3 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-2xl border border-line bg-white text-brand shadow-chip">
              {icon}
            </span>
          ) : null}
        </div>
      ) : icon ? (
        <IconContainer tone="neutral" size="lg">
          {icon}
        </IconContainer>
      ) : null}
      <div className={scene ? "text-[19px] font-bold text-brand-deep" : "text-[15px] font-semibold text-fg"}>{title}</div>
      <p className="max-w-md text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
      {action}
    </div>
  );
}

/**
 * An error, explained: what happened, why, and what to do next. Used for device,
 * sync and verification failures, so none of them ends at a raw error string.
 */
export function ErrorState({
  title,
  why,
  next,
  actions,
  tone = "danger",
  className,
}: {
  /** What happened, in plain words. */
  title: string;
  /** Why it happened, as far as the system knows. */
  why: React.ReactNode;
  /** The next thing the operator should do. */
  next?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: "danger" | "warn";
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cx(
        "flex gap-3.5 overflow-hidden rounded-[12px] border bg-white py-3.5 pl-0 pr-4",
        tone === "danger" ? "border-danger/30" : "border-warn/35",
        className,
      )}
    >
      <span aria-hidden="true" className={cx("w-1 shrink-0 rounded-r-full", tone === "danger" ? "bg-danger" : "bg-warn")} />
      <div className="min-w-0 flex-1">
        <div className={cx("text-[15px] font-semibold", tone === "danger" ? "text-danger-ink" : "text-warn-ink")}>{title}</div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-fg">
          <span className="font-semibold text-fg-muted">Why: </span>
          {why}
        </p>
        {next ? (
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg">
            <span className="font-semibold text-fg-muted">Next: </span>
            {next}
          </p>
        ) : null}
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/**
 * KPI card — big numeral, icon well, title, one explanatory line, optional
 * trend chip. Matches the four cards across the top of the dashboard.
 */
export function Stat({
  value,
  label,
  tone = "neutral",
  hint,
  href,
  icon,
  trend,
}: {
  value: React.ReactNode;
  label: string;
  tone?: Tone;
  hint?: string;
  href?: string;
  icon?: React.ReactNode;
  trend?: { text: string; tone?: Tone };
}) {
  const inner = (
    <>
      <div className="flex items-start gap-3.5">
        {icon ? (
          <IconContainer tone={tone === "neutral" ? "brand" : tone} size="lg">
            {icon}
          </IconContainer>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cx(
                "text-[30px] font-semibold leading-none tracking-tight",
                TONE_FG[tone === "neutral" ? "brand" : tone],
              )}
            >
              {value}
            </span>
            {trend ? (
              <Pill tone={trend.tone ?? "neutral"} className="mt-0.5">
                {trend.text}
              </Pill>
            ) : href ? (
              <ChevronRight
                size={16}
                className="mt-1 text-fg-dim transition-transform group-hover:translate-x-0.5"
              />
            ) : null}
          </div>
          <div className="mt-2 text-[13.5px] font-semibold text-fg">{label}</div>
          {hint ? (
            <div className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">{hint}</div>
          ) : null}
        </div>
      </div>
    </>
  );
  const cls = "panel hover-lift group block px-5 py-[18px] hover:shadow-lift";
  if (href) {
    return (
      <Link className={cls} href={href}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="rule my-4" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-line" />
      <span className="label">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Prominent, never-hidden disclosure that something is simulated. */
export function SimulatedNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex gap-2.5 rounded-xl border border-sim/22 bg-sim/[0.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-sim-ink",
        className,
      )}
    >
      <span className="mt-[1px] shrink-0 rounded-md border border-sim/30 bg-white/70 px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-[0.1em]">
        Sim
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  icon,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const map: Record<Tone, string> = {
    ok: "border-ok/22 bg-ok/[0.07]",
    warn: "border-warn/28 bg-warn/[0.09]",
    danger: "border-danger/28 bg-danger/[0.08]",
    info: "border-info/22 bg-info/[0.07]",
    sim: "border-sim/22 bg-sim/[0.07]",
    brand: "border-brand/22 bg-brand/[0.07]",
    neutral: "border-line bg-white/60",
  };
  return (
    <div className={cx("rounded-xl border px-4 py-3.5", map[tone])}>
      {title ? (
        <div className={cx("mb-1 flex items-center gap-2 text-[12.5px] font-semibold text-fg")}>
          <span className={TONE_FG[tone]}>{icon}</span>
          {title}
        </div>
      ) : null}
      <div className="text-[12.5px] leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}

/**
 * Quick-action tile — icon, label, tinted ground. Always routed to a real
 * destination or a real action; there are no decorative tiles.
 */
export function QuickAction({
  label,
  icon,
  tone = "brand",
  href,
  onClick,
  busy,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  const body = (
    <>
      <IconContainer tone={tone} size="sm">
        {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      </IconContainer>
      <span className="text-[13px] font-semibold text-fg">{label}</span>
    </>
  );
  const cls = cx(
    "hover-lift flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left hover:shadow-chip",
    TONE_BG[tone],
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Thin progress rail used by the integrity card. */
export function ProgressRail({
  value,
  tone = "ok",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const fill: Record<Tone, string> = {
    ok: "bg-gradient-to-r from-ok/70 to-ok",
    warn: "bg-gradient-to-r from-warn/70 to-warn",
    danger: "bg-gradient-to-r from-danger/70 to-danger",
    info: "bg-gradient-to-r from-info/70 to-info",
    sim: "bg-gradient-to-r from-sim/70 to-sim",
    brand: "bg-gradient-to-r from-brand/70 to-brand",
    neutral: "bg-fg-dim",
  };
  return (
    <div
      className={cx("h-2 w-full overflow-hidden rounded-full bg-ink-700", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx("h-full rounded-full transition-[width] duration-700 ease-out", fill[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
