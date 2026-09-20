"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  CircleDashed,
  CloudOff,
  CloudUpload,
  Cpu,
  Database,
  FileBadge,
  FolderOpen,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  MoreHorizontal,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button, IconContainer, cx } from "@/components/ui/primitives";
import { EvidenceChainMark } from "@/components/brand/marks";
import { ConnectionStatus } from "@/features/hardware/connection-status";
import { GlobalSearch } from "@/components/layout/global-search";
import { OnboardingProvider, useReplayGuide } from "@/components/onboarding/onboarding";
import { ASSETS } from "@/lib/assets";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  /** Extra path prefixes that should light this item. */
  match?: string[];
};

const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/capture/trigger", label: "Capture", icon: Camera, match: ["/capture", "/operator"] },
  { href: "/queue", label: "Pending Sync", icon: CloudUpload },
  { href: "/handoff", label: "Handoff", icon: ArrowLeftRight },
  { href: "/verification", label: "Verification", icon: ShieldCheck },
  { href: "/certificate", label: "Certificates", icon: FileBadge },
];

const NAV_SYSTEM: NavItem[] = [
  { href: "/hardware", label: "Hardware", icon: Cpu },
  { href: "/settings/device", label: "Device Status", icon: Smartphone },
  { href: "/demo", label: "Demo Mode", icon: MonitorPlay },
];

const NAV_HELP: NavItem[] = [{ href: "/help", label: "How to Use", icon: BookOpen }];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <Shell>{children}</Shell>
    </OnboardingProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { store, loading, session } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  React.useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  if (loading || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel flex items-center gap-3 px-5 py-4 text-fg-muted">
          <CircleDashed size={18} className="animate-spin text-brand" />
          <span className="text-[14px]">Loading evidence store…</span>
        </div>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>

      {/* ---------------------------------------------------------- sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-line bg-white/85 backdrop-blur-xl lg:flex">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto">
          <SidebarBody pathname={pathname} />
        </div>
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-[#102A56]/35"
            onClick={() => setNavOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute left-0 top-0 flex h-full w-[288px] max-w-[86vw] animate-[drawer-in_.22s_ease-out] flex-col border-r border-line bg-white shadow-lift"
          >
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand />
              <button
                aria-label="Close navigation"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted hover:bg-ink-750"
                onClick={() => setNavOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarBody pathname={pathname} />
            </div>
          </aside>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-6 pt-4 lg:px-8 lg:pb-8 lg:pt-6">
          <GlobalHeader onOpenNav={() => setNavOpen(true)} />
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>

        <SiteFooter />
      </div>

      <MobileNav pathname={pathname} onMore={() => setNavOpen(true)} />
      <ToastRail />
    </div>
  );
}

/* --------------------------------------------------------------- sidebar */

function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-5 pb-4 pt-5">
      <EvidenceChainMark size={42} />
      <span className="leading-tight">
        <span className="block text-[17px] font-bold tracking-tight text-brand-deep">Evidence Chain</span>
        <span className="block text-[12px] font-medium text-fg-muted">Railway Evidence Console</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-brand">SIH 2026 • Phase 1</span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return (item.match ?? []).some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function SidebarBody({ pathname }: { pathname: string }) {
  const { store, officer, session, signOut } = useApp();
  const router = useRouter();
  const replay = useReplayGuide();
  if (!store || !session) return null;

  const pending = store.records.filter((r) => r.status === "queued" || r.status === "captured").length;
  const needsVerification = store.tamper.length > 0;
  const device = store.devices.find((d) => d.assigned_officer_id === session.officer_id) ?? null;

  const Section = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div>
      <div className="label px-3 pb-1.5">{title}</div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors duration-150",
                  active
                    ? "bg-brand/[0.09] font-semibold text-brand-deep"
                    : "text-fg-muted hover:bg-ink-750 hover:text-fg",
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />
                ) : null}
                <Icon size={19} strokeWidth={2} className={active ? "text-brand" : "text-fg-dim group-hover:text-fg-muted"} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/queue" && pending > 0 ? (
                  <span
                    className="min-w-[22px] rounded-full bg-warn px-1.5 py-[1px] text-center text-[11.5px] font-bold text-white"
                    aria-label={`${pending} records waiting to sync`}
                  >
                    {pending}
                  </span>
                ) : null}
                {item.href === "/verification" && needsVerification ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-danger" title="A record no longer matches what was signed">
                    <TriangleAlert size={14} />
                    <span className="sr-only">Needs attention</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <nav aria-label="Main" className="flex min-h-full flex-col gap-5 px-3.5 pb-5 pt-1">
      <Section title="Main" items={NAV_MAIN} />
      <Section title="System" items={NAV_SYSTEM} />
      <div>
        <Section title="Help" items={NAV_HELP} />
        <button
          type="button"
          onClick={replay}
          className="mt-0.5 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[14.5px] text-fg-muted transition-colors duration-150 hover:bg-ink-750 hover:text-fg"
        >
          <PlayCircle size={19} className="text-fg-dim" />
          Replay Guide
        </button>
      </div>

      <div className="mt-auto space-y-3 pt-2">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: `url(${ASSETS.railwayLight.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center 40%",
            }}
          />
          <div className="relative px-4 py-3.5">
            <div className="tricolour mb-2 h-[3px] w-10 rounded-full" />
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-deep">Indian Railways</p>
            <p className="mt-0.5 text-[13px] font-medium leading-snug text-fg-muted">
              Safer Railways. Stronger India.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-ink-750/60 px-3.5 py-3">
          <div className="label">Operator</div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#173B8F] text-[12px] font-bold text-white">
              {initials(officer?.name ?? session.officer_id)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] font-semibold text-fg">{officer?.name ?? session.officer_id}</span>
              <span className="mono block truncate text-[11.5px] text-fg-dim">
                {session.officer_id}
                {device ? ` · ${device.device_id}` : ""}
              </span>
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            signOut();
            router.push("/login");
          }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[14px] text-fg-muted transition-colors hover:bg-ink-750 hover:text-fg"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- header */

/**
 * The railway masthead. Full height on the dashboard, compact elsewhere. The
 * supplied railway-hero.jpg carries its own tagline on the left, so a light
 * scrim sits over that side and the live title is rendered on top of it;
 * the train and station remain clear on the right.
 */
function GlobalHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();
  const full = pathname === "/dashboard";
  const { storage } = useApp();

  return (
    <header className="relative mb-6 overflow-hidden rounded-[24px] border border-white shadow-hero">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${ASSETS.railwayHero.src})`,
          backgroundSize: "cover",
          backgroundPosition: full ? "right 62%" : "right 58%",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(248,250,254,0.98) 0%, rgba(248,250,254,0.96) 40%, rgba(248,250,254,0.62) 60%, rgba(248,250,254,0.06) 82%)",
        }}
      />

      <div className={cx("relative flex flex-col gap-4 px-4 sm:px-6 lg:px-7", full ? "py-5 lg:py-7" : "py-4")}>
        <div className="flex items-start gap-3">
          <button
            aria-label="Open navigation"
            className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-muted hover:text-fg lg:hidden"
            onClick={onOpenNav}
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0 flex-1">
            {full ? (
              <>
                <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">Evidence Chain</div>
                <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-brand-deep sm:text-[30px] lg:text-[34px]">
                  Railway Evidence Integrity Console
                </h1>
                <p className="mt-1.5 text-[15px] font-medium text-fg-muted sm:text-[16px]">
                  Trusted Evidence. Safer Journeys.
                </p>
              </>
            ) : (
              <>
                <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">Evidence Chain</div>
                <div className="mt-0.5 truncate text-[16px] font-semibold text-brand-deep sm:text-[18px]">
                  Railway Evidence Integrity Console
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <GlobalSearch />
            <Notifications />
            <SystemStatus />
          </div>
        </div>

        {full ? (
          <ul className="flex flex-wrap gap-2" aria-label="What the console does">
            {[
              { icon: <Camera size={16} />, label: "Capture" },
              { icon: <ShieldCheck size={16} />, label: "Secure" },
              { icon: <CheckCircle2 size={16} />, label: "Verify" },
              { icon: <ArrowLeftRight size={16} />, label: "Handoff" },
            ].map((s) => (
              <li
                key={s.label}
                className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-deep"
              >
                <span className="text-brand">{s.icon}</span>
                {s.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Standing honesty strip — never dismissible. */}
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/80 bg-white/80 px-4 py-1.5 text-[11.5px] text-fg-muted sm:px-6 lg:px-7">
        {["Mock Sensor", "Simulated TSA", "Demo Signatures"].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <CircleDashed size={11} className="text-sim" />
            {t}
          </span>
        ))}
        {storage?.backend === "postgres" ? (
          <span className="inline-flex items-center gap-1.5" title={storage.detail}>
            <Database size={11} className="text-ok" />
            Shared Database
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5" title={storage?.detail}>
            <CircleDashed size={11} className="text-sim" />
            Local Prototype Storage
          </span>
        )}
      </div>
    </header>
  );
}

/** Close a popover on outside click or Escape. */
function usePopover() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
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
  return { open, setOpen, ref };
}

function Notifications() {
  const { store } = useApp();
  const pathname = usePathname();
  const { open, setOpen, ref } = usePopover();
  React.useEffect(() => setOpen(false), [pathname, setOpen]);
  if (!store) return null;

  const items: { tone: "danger" | "warn" | "info"; title: string; body: string; href: string }[] = [];
  if (store.tamper.length) {
    items.push({
      tone: "danger",
      title: `${store.tamper.length} record(s) changed after signing`,
      body: "Verification will show exactly which record and why.",
      href: "/verification",
    });
  }
  const awaiting = store.handoffs.filter((h) => h.transfer_record_id && !h.receipt_record_id);
  for (const h of awaiting) {
    items.push({
      tone: "warn",
      title: `${h.case_ref} is waiting for a GRP receipt`,
      body: "The transfer is signed; the receiving officer still has to confirm.",
      href: "/handoff",
    });
  }
  const pending = store.records.filter((r) => r.status === "queued" || r.status === "captured").length;
  if (pending) {
    items.push({
      tone: "warn",
      title: `${pending} record(s) waiting to sync`,
      body: "Saved safely on this device. They upload when you are online.",
      href: "/queue",
    });
  }
  const pushed = store.records.filter((r) => r.status === "pushed").length;
  if (pushed) {
    items.push({
      tone: "info",
      title: `${pushed} record(s) not yet anchored`,
      body: "On the server, waiting for the next trusted-time anchor.",
      href: "/queue",
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={items.length ? `Notifications: ${items.length} need attention` : "Notifications"}
        className="glass relative flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted shadow-chip transition-colors hover:text-fg"
      >
        <Bell size={18} />
        {items.length ? (
          <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-danger px-1 text-[10.5px] font-bold text-white">
            {items.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[340px] max-w-[calc(100vw-2rem)] animate-fade-up rounded-2xl border border-line-strong bg-white p-2 shadow-lift">
          <div className="px-3 pb-1 pt-2 text-[14px] font-semibold text-fg">Needs attention</div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13.5px] text-fg-muted">
              All clear. Nothing is waiting for you.
            </p>
          ) : (
            <ul>
              {items.map((it, i) => (
                <li key={i}>
                  <Link
                    href={it.href}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-750"
                  >
                    <IconContainer size="sm" tone={it.tone}>
                      {it.tone === "danger" ? <TriangleAlert size={15} /> : it.tone === "warn" ? <CloudUpload size={15} /> : <Info size={15} />}
                    </IconContainer>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-fg">{it.title}</span>
                      <span className="block text-[12.5px] leading-snug text-fg-muted">{it.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Operator + system status. Holds the network toggle that used to hide behind
 * the bell: "Simulate offline" is a demo control and is labelled as one.
 */
function SyncRow() {
  const { sync, storage } = useApp();
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const age = sync.lastSyncedAt ? Math.max(0, Math.round((Date.now() - sync.lastSyncedAt) / 1000)) : null;
  const shared = storage?.backend === "postgres";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-fg-muted">{shared ? "Shared database" : "Evidence store"}</span>
      <span
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
          sync.error
            ? "border-warn/30 bg-warn/[0.1] text-[#B45309]"
            : "border-ok/25 bg-ok/[0.08] text-[#15803D]",
        )}
        title={storage?.detail}
      >
        {sync.error ? <CloudOff size={13} /> : <RefreshCw size={13} />}
        {sync.error
          ? "Can't reach server"
          : age === null
            ? "Syncing…"
            : age < 5
              ? "Synced just now"
              : `Synced ${age}s ago`}
      </span>
    </div>
  );
}

function SystemStatus() {
  const { store, officer, session, run } = useApp();
  const pathname = usePathname();
  const { open, setOpen, ref } = usePopover();
  React.useEffect(() => setOpen(false), [pathname, setOpen]);
  if (!store || !session) return null;
  const online = store.connectivity.online;
  const device = store.devices.find((d) => d.assigned_officer_id === session.officer_id) ?? null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Operator ${officer?.name ?? session.officer_id}, ${online ? "online" : "offline"}`}
        className="glass flex h-11 items-center gap-2.5 rounded-xl pl-1.5 pr-2.5 shadow-chip transition-colors hover:bg-white"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#173B8F] text-[11.5px] font-bold text-white">
          {initials(officer?.name ?? session.officer_id)}
          <span
            className={cx(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
              online ? "bg-ok" : "bg-warn",
            )}
          />
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-semibold text-fg">{officer?.name ?? session.officer_id}</span>
          <span className={cx("block text-[11.5px] font-semibold", online ? "text-[#15803D]" : "text-[#B45309]")}>
            {online ? "System online" : "Working offline"}
          </span>
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[320px] max-w-[calc(100vw-2rem)] animate-fade-up rounded-2xl border border-line-strong bg-white p-4 shadow-lift">
          <div className="text-[15px] font-semibold text-fg">{officer?.name ?? session.officer_id}</div>
          <div className="mono mt-0.5 text-[12px] text-fg-dim">
            {session.officer_id}
            {device ? ` · ${device.device_id}` : ""}
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg-muted">Evidence device</span>
              <ConnectionStatus size="sm" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg-muted">Capture network (demo)</span>
              <span
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                  online ? "border-ok/25 bg-ok/[0.08] text-[#15803D]" : "border-warn/30 bg-warn/[0.1] text-[#B45309]",
                )}
              >
                {online ? <Wifi size={13} /> : <WifiOff size={13} />}
                {online ? "Online" : "Offline"}
              </span>
            </div>
            <SyncRow />
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="label mb-2">Demo control</div>
            <Button
              size="md"
              className="w-full"
              icon={online ? <WifiOff size={16} /> : <Wifi size={16} />}
              onClick={() =>
                run(
                  "connectivity.set",
                  { online: !online },
                  {
                    toast: {
                      title: online ? "Working offline" : "Back online",
                      body: online
                        ? "Keep capturing. Records are saved safely on this device until you reconnect."
                        : "Records waiting to sync can now be uploaded.",
                    },
                  },
                )
              }
            >
              {online ? "Simulate going offline" : "Simulate reconnecting"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- mobile nav */

function MobileNav({ pathname, onMore }: { pathname: string; onMore: () => void }) {
  const { store } = useApp();
  const pending = store
    ? store.records.filter((r) => r.status === "queued" || r.status === "captured").length
    : 0;
  const items: NavItem[] = [
    NAV_MAIN[0],
    NAV_MAIN[1],
    NAV_MAIN[2],
    NAV_MAIN[3],
  ];
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11.5px] font-medium transition-colors",
                  active ? "text-brand" : "text-fg-muted",
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.3 : 2} />
                {item.label}
                {item.href === "/queue" && pending ? (
                  <span className="absolute right-3 top-1 min-w-[18px] rounded-full bg-warn px-1 text-center text-[10px] font-bold text-white">
                    {pending}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11.5px] font-medium text-fg-muted"
          >
            <MoreHorizontal size={21} />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* ---------------------------------------------------------------- footer */

function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1480px] px-4 pb-28 lg:px-8 lg:pb-8">
      <div className="flex flex-col gap-2 border-t border-line pt-4 text-[12.5px] text-fg-dim sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="tricolour inline-block h-[3px] w-8 rounded-full" />
          Evidence Chain · SIH 2026 Phase 1 prototype · Indian Railways
        </span>
        <span className="max-w-xl leading-relaxed">
          Integrity verification is not chemical identification. This system records what happened;
          it does not prove what a substance is.
        </span>
      </div>
    </footer>
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
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 lg:bottom-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "pointer-events-auto animate-fade-up rounded-2xl border bg-white px-4 py-3 shadow-lift",
            t.tone === "ok" && "border-ok/30",
            t.tone === "danger" && "border-danger/35",
            t.tone === "warn" && "border-warn/30",
            t.tone === "info" && "border-line-strong",
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
              <div className="text-[14px] font-semibold text-fg">{t.title}</div>
              {t.body ? (
                <div className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{t.body}</div>
              ) : null}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-ink-750 hover:text-fg"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ page header */

/** Per-screen title block. Sits under the global header on every page. */
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
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="label mb-1.5">{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-brand-deep sm:text-[32px] lg:text-[36px]">
            {title}
          </h1>
          {status}
        </div>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-fg-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { Button };
