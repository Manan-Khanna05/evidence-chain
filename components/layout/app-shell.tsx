"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Anchor,
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Cpu,
  FileText,
  FolderOpen,
  Info,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  MonitorPlay,
  ScanLine,
  ShieldCheck,
  Signature,
  Smartphone,
  TriangleAlert,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button, IconContainer, Pill, cx } from "@/components/ui/primitives";
import { BrandLockup, HeroBanner, HeroStrip } from "@/components/brand/marks";
import { HardwareChip } from "@/features/hardware/widgets";

const NAV_PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/operator", label: "Operator", icon: ScanLine },
  { href: "/capture/trigger", label: "Capture", icon: Camera, match: "/capture" },
  { href: "/queue", label: "Offline Queue", icon: ListChecks },
  { href: "/handoff", label: "Handoff", icon: Activity },
  { href: "/verification", label: "Verification", icon: ShieldCheck },
  { href: "/certificate", label: "Certificates", icon: FileText },
];

const NAV_SECONDARY = [
  { href: "/hardware", label: "Hardware", icon: Cpu },
  { href: "/settings/device", label: "Device Status", icon: Smartphone },
  { href: "/demo", label: "Demo Mode", icon: MonitorPlay },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { store, loading, session, officer, signOut } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel flex items-center gap-3 px-5 py-4 text-fg-muted">
          <CircleDashed size={18} className="animate-spin text-brand" />
          <span className="text-[13.5px]">Loading evidence store…</span>
        </div>
      </div>
    );
  }
  if (!session) return null;

  const queued = store.records.filter((r) => r.status === "queued" || r.status === "captured").length;
  const tampered = store.tamper.length;
  const isActive = (item: { href: string; match?: string }) =>
    pathname === item.href || pathname.startsWith(item.match ?? item.href + "/");

  const NavList = ({ items }: { items: typeof NAV_PRIMARY }) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-all duration-150",
                active
                  ? "bg-brand/[0.10] font-semibold text-brand-deep"
                  : "text-fg-muted hover:bg-white/70 hover:text-fg",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />
              ) : null}
              <Icon size={19} className={active ? "text-brand" : "text-fg-dim"} strokeWidth={2} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/queue" && queued > 0 ? (
                <span className="rounded-full border border-warn/30 bg-warn/[0.14] px-1.5 py-[1px] text-[11px] font-bold text-[#A4601A]">
                  {queued}
                </span>
              ) : null}
              {item.href === "/verification" && tampered > 0 ? (
                <TriangleAlert size={14} className="text-danger" />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const navBody = (
    <div className="flex h-full flex-col gap-6 px-3.5 pb-4 pt-2">
      <NavList items={NAV_PRIMARY} />

      <div>
        <div className="label px-3 pb-2">System</div>
        <NavList items={NAV_SECONDARY} />
      </div>

      <div className="mt-auto space-y-3">
        {/* Understated railway motif + the product's own line. */}
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/60 px-4 py-4">
          <HeroStrip className="pointer-events-none absolute inset-x-0 bottom-0 opacity-[0.22]" height={64} />
          <div className="tricolour mb-2.5 h-[3px] w-9 rounded-full opacity-70" />
          <p className="relative text-[12.5px] font-semibold leading-snug text-brand-deep">
            Safer Railways.
            <br />
            Stronger Justice.
          </p>
        </div>

        <button
          onClick={() => {
            signOut();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-fg-dim transition-colors hover:bg-white/70 hover:text-fg"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* ---------------------------------------------------------- sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-white/70 bg-ink-850/80 backdrop-blur-xl lg:flex">
        <div className="px-4 py-4">
          <Link href="/dashboard" className="block">
            <BrandLockup />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">{navBody}</div>
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-[#152238]/35 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[268px] flex-col border-r border-white/70 bg-ink-850 shadow-lift">
            <div className="flex items-center justify-between px-4 py-4">
              <BrandLockup />
              <button
                aria-label="Close navigation"
                className="rounded-lg p-2 text-fg-muted hover:bg-ink-750"
                onClick={() => setNavOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navBody}</div>
          </aside>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-4 lg:px-7 lg:py-6">
          <HeroBand onOpenNav={() => setNavOpen(true)} />
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1560px] px-4 pb-6 lg:px-7">
          <p className="text-[11.5px] leading-relaxed text-fg-dim">
            Integrity verification does not establish chemical identification. This system records
            what happened; it does not prove what a substance is.
          </p>
        </footer>
      </div>

      <ToastRail />
    </div>
  );
}

/* ------------------------------------------------------------- hero band */

/**
 * The railway hero. Full height on the dashboard, compact everywhere else, so
 * every screen carries the same masthead without stealing vertical space from
 * working views.
 */
function HeroBand({ onOpenNav }: { onOpenNav: () => void }) {
  const { store, officer, session, run } = useApp();
  const pathname = usePathname();
  const full = pathname === "/dashboard";
  if (!store || !session) return null;

  const online = store.connectivity.online;
  const device = store.devices.find((d) => d.assigned_officer_id === session.officer_id) ?? null;
  const attention =
    store.tamper.length +
    store.handoffs.filter((h) => h.transfer_record_id && !h.receipt_record_id).length +
    (store.records.some((r) => r.status === "queued") ? 1 : 0);

  return (
    <section className="relative mb-5 overflow-hidden rounded-panel border border-white/80 shadow-hero">
      {/*
        On the dashboard the artwork carries the masthead text itself. Below lg
        that baked-in text would be unreadable, so there we show a cropped strip
        of the same artwork and render the title live over it.
      */}
      {full ? (
        <>
          <HeroBanner className="hidden lg:block" />
          <HeroStrip className="lg:hidden" height={104} />
        </>
      ) : (
        <HeroStrip height={92} />
      )}

      {/* scrim, only where live text sits on top */}
      <div
        className={cx("absolute inset-0", full && "lg:hidden")}
        style={{
          background:
            "linear-gradient(100deg, rgba(250,249,245,0.97) 0%, rgba(250,249,245,0.9) 38%, rgba(250,249,245,0.45) 62%, rgba(250,249,245,0.1) 82%)",
        }}
      />

      <div
        className={cx(
          "absolute inset-x-0 top-0 flex flex-col gap-4 px-5 py-4 lg:px-7 lg:py-5",
          full && "lg:pointer-events-none",
        )}
      >
        <div className="flex items-start gap-3">
          <button
            aria-label="Open navigation"
            className="rounded-lg border border-white/80 bg-white/70 p-2 text-fg-muted backdrop-blur-sm hover:text-fg lg:hidden"
            onClick={onOpenNav}
          >
            <Menu size={18} />
          </button>

          <div className={cx("min-w-0 flex-1", full && "lg:sr-only")}>
            <h1
              className={cx(
                "font-semibold leading-tight tracking-tight text-brand-deep",
                full ? "text-[19px] sm:text-[22px]" : "text-[16px] lg:text-[19px]",
              )}
            >
              Railway Evidence Integrity Console
            </h1>
            <p className={cx("text-fg-muted", full ? "mt-1 text-[12.5px]" : "mt-0.5 text-[12px]")}>
              Structured evidence capture for railway narcotics events
            </p>
          </div>

          {/* account cluster */}
          <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden md:inline-flex">
              <HardwareChip />
            </span>
            <span
              className={cx(
                "hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold sm:inline-flex",
                online
                  ? "border-ok/25 bg-white/80 text-[#0B7A56]"
                  : "border-warn/30 bg-white/80 text-[#A4601A]",
              )}
            >
              <span
                className={cx(
                  "inline-block h-2 w-2 rounded-full",
                  online ? "animate-pulse-ring bg-ok" : "bg-warn",
                )}
              />
              {online ? "Online" : "Offline"}
            </span>

            <button
              onClick={() =>
                run(
                  "connectivity.set",
                  { online: !online },
                  {
                    toast: {
                      title: online ? "Aeroplane mode" : "Connectivity restored",
                      body: online
                        ? "Capture continues locally. Records will queue on the device."
                        : "Queued records can now be pushed and anchored.",
                    },
                  },
                )
              }
              title={online ? "Simulate going offline" : "Simulate reconnecting"}
              aria-label={`${attention} item(s) need attention`}
              className="relative rounded-full border border-white/80 bg-white/80 p-2 text-fg-muted shadow-chip backdrop-blur-sm transition-colors hover:text-fg"
            >
              <Bell size={17} />
              {attention > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {attention}
                </span>
              ) : null}
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-white/80 bg-white/80 py-1.5 pl-1.5 pr-3 shadow-chip backdrop-blur-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3B7BF0] to-[#1B3F91] text-[11px] font-bold text-white">
                {initials(officer?.name ?? session.officer_id)}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[12.5px] font-semibold text-fg">
                  {officer?.name ?? session.officer_id}
                </span>
                <span className="mono block text-[10px] text-fg-dim">
                  {session.officer_id}
                  {device ? ` | ${device.device_id}` : ""}
                </span>
              </span>
              <ChevronDown size={14} className="hidden text-fg-dim sm:block" />
            </div>
          </div>
        </div>

        {/* The lg+ artwork already carries this row. */}
        {full ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:hidden">
            {[
              { icon: <Signature size={14} />, label: "Sign" },
              { icon: <Link2 size={14} />, label: "Chain" },
              { icon: <Anchor size={14} />, label: "Anchor" },
              { icon: <CheckCircle2 size={14} />, label: "Verify" },
              { icon: <ShieldCheck size={14} />, label: "Secure" },
            ].map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted"
              >
                <span className="text-brand">{s.icon}</span>
                {s.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* standing honesty strip — never dismissible */}
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/70 bg-white/55 px-5 py-1.5 text-[11px] text-fg-dim backdrop-blur-sm lg:px-7">
        {[
          "Mock sensor adapter",
          "Simulated timestamp authorities",
          "Demo signatures — software key, not hardware-backed",
          "Local prototype storage",
        ].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <CircleDashed size={11} className="text-sim" />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z .-]/g, "").split(/[\s.]+/).filter(Boolean);
  if (!parts.length) return "EC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ----------------------------------------------------------------- toasts */

function ToastRail() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "panel panel-solid pointer-events-auto animate-fade-up px-4 py-3 shadow-lift",
            t.tone === "ok" && "border-ok/30",
            t.tone === "danger" && "border-danger/35",
            t.tone === "warn" && "border-warn/30",
          )}
        >
          <div className="flex items-start gap-2.5">
            <IconContainer
              size="sm"
              tone={t.tone === "ok" ? "ok" : t.tone === "danger" ? "danger" : t.tone === "warn" ? "warn" : "info"}
            >
              {t.tone === "ok" ? (
                <CheckCircle2 size={16} />
              ) : t.tone === "danger" ? (
                <TriangleAlert size={16} />
              ) : (
                <Info size={16} />
              )}
            </IconContainer>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-fg">{t.title}</div>
              {t.body ? (
                <div className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{t.body}</div>
              ) : null}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded p-0.5 text-fg-dim hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ page header */

/** Per-screen title block. Sits under the hero band on every page. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  status,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  status?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="label mb-1.5">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-brand-deep lg:text-[30px]">
            {title}
          </h2>
          {status}
        </div>
        {subtitle ? (
          <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-fg-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { Button };
