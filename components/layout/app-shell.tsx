"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  CloudOff,
  Database,
  Info,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { CloudUpload, TriangleAlert, X } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { Button, IconContainer, cx } from "@/components/ui/primitives";
import { ConnectionStatus } from "@/features/hardware/connection-status";
import { GlobalSearch } from "@/components/layout/global-search";
import { OnboardingProvider, useReplayGuide } from "@/components/onboarding/onboarding";
import { ASSETS } from "@/lib/assets";
import { AssetImage } from "@/components/ui/asset-image";
import { RailIcon, type RailIconName } from "@/components/ui/rail-icon";

type NavItem = {
  href: string;
  label: string;
  /** One of the supplied V2 icons (public/assets/icons). */
  icon: RailIconName;
  /** Extra path prefixes that should light this item. */
  match?: string[];
  /** Paths that must NOT light this item even though they share a prefix. */
  except?: string[];
};

const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/cases", label: "Cases", icon: "cases" },
  { href: "/capture/trigger", label: "Capture", icon: "capture", match: ["/operator"] },
  { href: "/capture/field-test", label: "Field Test", icon: "field-test" },
  { href: "/queue", label: "Pending Sync", icon: "pending-sync" },
  { href: "/handoff", label: "Handoff", icon: "handoff" },
  { href: "/verification", label: "Verification", icon: "verification" },
  { href: "/certificate", label: "Certificates", icon: "certificates" },
];

const NAV_SYSTEM: NavItem[] = [
  { href: "/hardware", label: "PRAMAAN", icon: "pramaan" },
  { href: "/settings/device", label: "Device Status", icon: "device-status" },
  { href: "/tte", label: "TTE Screening", icon: "tte" },
  { href: "/demo", label: "Demo Mode", icon: "demo-mode" },
];

const NAV_HELP: NavItem[] = [
  { href: "/help", label: "How to Use", icon: "guide" },
  { href: "/whats-new", label: "What's New", icon: "whats-new" },
  { href: "/system-guide", label: "System Guide", icon: "system-guide" },
];

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
    // Skeleton in the shape of the console, so nothing jumps when data lands.
    return (
      <div className="flex min-h-screen" aria-busy="true" aria-label="Loading the evidence store">
        <div className="hidden w-[268px] shrink-0 flex-col border-r border-line bg-ink-850 lg:flex">
          <div className="h-[84px] border-b border-line" />
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-xl bg-ink-750" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="h-[64px] border-b border-line bg-ink-900 lg:h-[84px]" />
          <div className="mx-auto max-w-[1480px] space-y-5 px-4 py-6 lg:px-8">
            <div className="h-[280px] animate-pulse rounded-[22px] bg-ink-750" />
            <div className="h-9 w-72 animate-pulse rounded-lg bg-ink-750" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[96px] animate-pulse rounded-[18px] bg-ink-750" />
              ))}
            </div>
            <span className="sr-only">Loading the evidence store…</span>
          </div>
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
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r border-line bg-ink-850 lg:flex">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto">
          <SidebarBody pathname={pathname} />
        </div>
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-[#252525]/35"
            onClick={() => setNavOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute left-0 top-0 flex h-full w-[288px] max-w-[86vw] animate-[drawer-in_.22s_ease-out] flex-col border-r border-line bg-ink-850 shadow-lift"
          >
            <div className="relative">
              <SidebarBrand />
              <button
                aria-label="Close navigation"
                className="absolute right-2 top-3.5 flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted hover:bg-ink-750 hover:text-fg"
                onClick={() => setNavOpen(false)}
              >
                <RailIcon name="close" size={19} />
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
        <UtilityHeader onOpenNav={() => setNavOpen(true)} />
        <HonestyStrip />
        <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-6 pt-5 lg:px-8 lg:pb-8 lg:pt-6">
          {pathname === "/dashboard" ? <RailwayHero /> : null}
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

/**
 * The console's identity: the supplied production-safe crest (a generated
 * railway-evidence device, not an official emblem) and the product name set
 * in the display serif, on the same ivory as the page.
 */
function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      aria-label="Evidence Chain — Railway Evidence Console, V2, SIH 2026. Go to dashboard."
      className="relative flex h-[84px] shrink-0 items-center gap-3 border-b border-line px-5"
    >
      <span className="w-[42px] shrink-0">
        <AssetImage name="crest" alt="" rounded={false} sizes="42px" priority />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-display text-[22px] font-bold leading-none tracking-tight text-brand-deep">
          Evidence Chain
        </span>
        <span className="mt-1 block text-[12.5px] font-medium text-fg-muted">Railway Evidence Console</span>
        <span className="mt-0.5 block text-[11.5px] font-semibold text-[#8A5F16]">V2 • SIH 2026</span>
      </span>
      {/* Brass rule: the one ornament, as on a platform nameboard. */}
      <span aria-hidden="true" className="absolute inset-x-5 bottom-[-1px] h-[2px] rounded-full bg-gold/70" />
    </Link>
  );
}

function isActive(pathname: string, item: NavItem) {
  if ((item.except ?? []).some((e) => pathname === e || pathname.startsWith(e + "/"))) return false;
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return (item.match ?? []).some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function SidebarBody({ pathname }: { pathname: string }) {
  const { store, session } = useApp();
  const replay = useReplayGuide();
  if (!store || !session) return null;

  const pending = store.records.filter((r) => r.status === "queued" || r.status === "captured").length;
  const needsVerification = store.tamper.length > 0;

  const Section = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div>
      <div className="label px-3 pb-1.5">{title}</div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors duration-150",
                  active
                    ? "bg-brand-soft font-semibold text-brand-deep"
                    : "text-fg-muted hover:bg-ink-750 hover:text-fg",
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />
                ) : null}
                <RailIcon
                  name={item.icon}
                  size={20}
                  className={active ? "text-brand" : "text-fg-dim group-hover:text-fg-muted"}
                />
                <span className="flex-1">{item.label}</span>
                {item.href === "/queue" && pending > 0 ? (
                  <span
                    className="min-w-[22px] rounded-full bg-gold-soft px-1.5 py-[1px] text-center text-[11.5px] font-bold text-[#855A14] ring-1 ring-gold/40"
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
    <nav aria-label="Main" className="flex min-h-full flex-col gap-5 px-3.5 pb-5 pt-4">
      <Section title="Main" items={NAV_MAIN} />
      <Section title="System" items={NAV_SYSTEM} />
      <div>
        <Section title="Help" items={NAV_HELP} />
        <button
          type="button"
          onClick={replay}
          className="mt-0.5 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[14.5px] text-fg-muted transition-colors duration-150 hover:bg-ink-750 hover:text-fg"
        >
          <RailIcon name="replay" size={20} className="text-fg-dim" />
          Replay Guide
        </button>
      </div>

      <div className="mt-auto pt-2">
        {/* Railway context: the supplied footer illustration, cropped to the
            drawing itself (the file also carries a button and a caption). */}
        <div className="overflow-hidden rounded-2xl border border-line bg-[#F8F2E6]">
          <div className="relative aspect-[250/104]">
            <AssetImage
              name="railwayFooter"
              alt=""
              rounded={false}
              fit="cover"
              className="absolute inset-0 h-full object-cover"
              style={{ objectPosition: "50% 44%" }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-8"
              style={{ background: "linear-gradient(180deg, #F8F2E6 0%, rgba(248,242,230,0) 100%)" }}
            />
          </div>
          <div className="px-4 pb-3 pt-1">
            <p className="font-display text-[14px] font-semibold leading-snug text-brand-deep">Railway evidence handling</p>
            <p className="text-[12px] leading-snug text-fg-muted">People • Safety • Integrity</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- header */

/**
 * The utility bar every page shares: search, notifications, operator and
 * system state. Kept compact and quiet so the page below does the talking.
 */
function UtilityHeader({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <header className="sticky top-0 z-[50] border-b border-line bg-ink-900/92 backdrop-blur-md">
      <div className="mx-auto flex h-[64px] w-full max-w-[1480px] items-center gap-3 px-4 lg:h-[84px] lg:px-8">
        <button
          aria-label="Open navigation"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-fg-muted hover:text-fg lg:hidden"
          onClick={onOpenNav}
        >
          <RailIcon name="menu" size={20} />
        </button>
        {/* On phones and tablets the sidebar is hidden, so the crest rides here. */}
        <Link href="/dashboard" aria-label="Evidence Chain dashboard" className="hidden w-[30px] shrink-0 sm:block lg:hidden">
          <AssetImage name="crest" alt="" rounded={false} sizes="30px" />
        </Link>
        <RailwayContext />
        <GlobalSearch className="min-w-0 flex-1 lg:max-w-[460px]" />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Notifications />
          <SystemStatus />
        </div>
      </div>
    </header>
  );
}

/**
 * The railway line under the brand, as in the reference masthead. Words only:
 * no emblem, no claim to be an official Indian Railways system.
 */
function RailwayContext() {
  return (
    <div className="hidden shrink-0 items-center gap-3 text-[12.5px] font-medium text-fg-muted xl:flex">
      <span aria-hidden="true" className="tricolour h-[3px] w-7 rounded-full" />
      <span>Safer Railways</span>
      <span aria-hidden="true" className="h-3.5 w-px bg-line-strong" />
      <span>Stronger India</span>
      <span aria-hidden="true" className="h-3.5 w-px bg-line-strong" />
      <span>Trusted Evidence</span>
    </div>
  );
}

/**
 * What in this build is simulated — stated on every page, never dismissible.
 */
function HonestyStrip() {
  const { storage } = useApp();
  return (
    <div className="border-b border-line bg-ink-850/80">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[12px] text-fg-muted lg:px-8">
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
    </div>
  );
}

/**
 * The dashboard masthead, after the reference: title on the left over a cream
 * wash, the station in the middle, and a bilingual slogan panel on the right.
 *
 * railway-hero.jpg is used as delivered. A sepia filter and amber multiply
 * bring its cool morning light toward the reference's warm platform, and the
 * slogan panel sits over the artwork's own top-right badge and signboard so
 * the console never displays an official railway mark. On phones the image
 * is positioned to keep the train and leave that corner out of frame.
 */
function RailwayHero() {
  const tiles: { href: string; icon: RailIconName; title: string; sub: string; tint: string }[] = [
    { href: "/capture/trigger", icon: "capture", title: "Capture", sub: "Collect evidence", tint: "bg-gold-soft text-[#9A5F12]" },
    { href: "/capture/field-test", icon: "field-test", title: "Field Test", sub: "Record result", tint: "bg-terracotta-soft text-sim" },
    { href: "/handoff", icon: "handoff", title: "Handoff", sub: "RPF to GRP", tint: "bg-gold-soft text-[#9A5F12]" },
    { href: "/verification", icon: "verification", title: "Verify", sub: "Check integrity", tint: "bg-brand-soft text-brand-deep" },
  ];
  return (
    <section
      aria-labelledby="hero-title"
      className="relative mb-6 overflow-hidden rounded-[22px] border border-line shadow-hero"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[length:auto_100%] bg-[position:77%_70%] bg-no-repeat md:bg-cover md:bg-[position:right_60%]"
        style={{
          backgroundImage: `url(${ASSETS.railwayHero.src})`,
          filter: "sepia(0.32) saturate(0.95) brightness(1.02)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 mix-blend-multiply"
        style={{ background: "linear-gradient(90deg, rgba(0,0,0,0) 35%, rgba(236,190,128,0.42) 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(250,245,234,0.98) 0%, rgba(250,245,234,0.95) 36%, rgba(250,245,234,0.55) 56%, rgba(250,245,234,0) 74%)",
        }}
      />

      <div className="relative flex min-h-[250px] items-stretch lg:min-h-[280px]">
        <div className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:py-8">
          <div className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-brand">Evidence Chain</div>
          <h1
            id="hero-title"
            className="mt-2 max-w-[520px] font-display text-[30px] font-bold leading-[1.06] tracking-tight text-brand-deep sm:text-[38px] lg:text-[44px]"
          >
            Railway Evidence Integrity Console
          </h1>
          <p className="mt-2.5 font-display text-[17px] font-semibold text-fg sm:text-[19px]">
            Trusted Evidence. Safer Journeys.
          </p>
          <ul className="mt-5 grid max-w-[700px] grid-cols-2 gap-2.5 md:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.title}>
                <Link
                  href={t.href}
                  className="hover-lift flex h-full items-center gap-2.5 rounded-2xl border border-white/70 bg-white/90 px-2.5 py-2.5 shadow-chip backdrop-blur-sm hover:shadow-lift"
                >
                  <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.tint)}>
                    <RailIcon name={t.icon} size={19} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-[14px] font-semibold text-fg">{t.title}</span>
                    <span className="block text-[12px] leading-snug text-fg-muted">{t.sub}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <aside
          aria-label="Slogan"
          className="relative hidden w-[240px] shrink-0 flex-col justify-center px-6 text-center md:flex lg:w-[270px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(250,244,232,0) 0%, rgba(250,244,232,0.9) 22%, rgba(250,244,232,0.97) 45%)",
          }}
        >
          <p lang="hi" className="font-deva text-[25px] font-bold leading-[1.35] text-[#7A3B17] lg:text-[28px]">
            सुरक्षित यात्रा
            <br />
            विश्वसनीय प्रमाण
          </p>
          <div aria-hidden="true" className="mx-auto mt-3 flex h-[3px] w-28 overflow-hidden rounded-full">
            <span className="flex-1 bg-[#E07B24]" />
            <span className="flex-1 bg-[#2E7D52]" />
          </div>
          <p className="mt-3 text-[13px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-fg">
            Safer Railways
            <br />
            Stronger India
          </p>
          <p className="sr-only">Hindi: Safe journeys, trustworthy evidence.</p>
        </aside>
      </div>
    </section>
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
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-fg-muted shadow-chip transition-colors hover:text-fg"
      >
        <RailIcon name="notifications" size={20} />
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
            ? "border-warn/30 bg-warn/[0.1] text-[#855A14]"
            : "border-ok/25 bg-ok/[0.08] text-[#1F6A43]",
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
  const { store, officer, session, run, signOut } = useApp();
  const router = useRouter();
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
        className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white pl-1.5 pr-2.5 shadow-chip transition-colors hover:border-line-strong"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2E6A45] to-[#0B3B27] text-[11.5px] font-bold text-white">
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
          <span className={cx("block text-[11.5px] font-semibold", online ? "text-[#1F6A43]" : "text-[#855A14]")}>
            {officer?.force ?? "Officer"} • {online ? "System Online" : "Working Offline"}
          </span>
        </span>
        <RailIcon name="chevron-down" size={15} className="hidden text-fg-dim md:block" />
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
                  online ? "border-ok/25 bg-ok/[0.08] text-[#1F6A43]" : "border-warn/30 bg-warn/[0.1] text-[#855A14]",
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

          <div className="mt-3 border-t border-line pt-3">
            <Button
              size="md"
              variant="ghost"
              className="w-full"
              icon={<LogOut size={16} />}
              onClick={() => {
                signOut();
                router.push("/login");
              }}
            >
              Sign Out
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
  const items: NavItem[] = [NAV_MAIN[0], NAV_MAIN[1], NAV_MAIN[2], NAV_MAIN[4]];
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-ink-850/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
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
                <RailIcon name={item.icon} size={21} strokeWidth={active ? 2.2 : 1.8} />
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
            <RailIcon name="menu" size={21} />
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
          Evidence Chain V2 · SIH 2026 prototype · built for railway evidence handling
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
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-brand-deep sm:text-[32px] lg:text-[36px]">
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
