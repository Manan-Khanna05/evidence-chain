"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudOff, Radio, ScanLine } from "lucide-react";
import { Check, FlaskConical, UploadCloud } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { Pill, cx } from "@/components/ui/primitives";
import { AssetImage } from "@/components/ui/asset-image";

const STEPS = [
  "Select Case",
  "Trigger or Field Test",
  "Capture",
  "Review",
  "Officer Confirmation",
  "Save",
  "Sync",
] as const;

/**
 * The guided capture path. On the form, steps 1–5 happen on this screen;
 * Save happens on confirmation and Sync when online. After a save, the real
 * record status decides whether Sync is done — nothing here is assumed.
 */
export function CaptureSteps({
  saved = false,
  synced = false,
}: {
  saved?: boolean;
  synced?: boolean;
}) {
  const stateOf = (i: number): "done" | "current" | "next" => {
    if (saved) {
      if (i < 6) return "done";
      return synced ? "done" : "current";
    }
    return i < 5 ? "current" : "next";
  };
  return (
    <ol aria-label="Capture steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {STEPS.map((label, i) => {
        const st = stateOf(i);
        return (
          <li
            key={label}
            aria-current={st === "current" ? "step" : undefined}
            className={cx(
              "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[13px] font-medium",
              st === "done" && "border-ok/25 bg-ok/[0.07] text-[#1F6A43]",
              st === "current" && "border-brand/30 bg-brand/[0.07] text-brand-deep",
              st === "next" && "border-line bg-white text-fg-dim",
            )}
          >
            <span
              className={cx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                st === "done" && "bg-ok text-white",
                st === "current" && "bg-brand text-white",
                st === "next" && "bg-ink-700 text-fg-muted",
              )}
            >
              {st === "done" ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span className="leading-tight">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The capture sub-navigation, the step guide, and the state an officer needs
 * before typing anything: which device is signing, and whether it will sync.
 */
export function CaptureTargetBar() {
  const { store, officer } = useApp();
  const pathname = usePathname();
  if (!store) return null;

  const device = store.devices.find((d) => d.assigned_officer_id === officer?.officer_id) ?? null;
  const online = store.connectivity.online;
  const queued = store.records.filter((r) => r.status === "queued" || r.status === "captured").length;

  const tabs = [
    { href: "/capture/trigger", label: "s.43 Trigger", icon: Radio },
    { href: "/capture/field-test", label: "Field Test", icon: FlaskConical },
    { href: "/operator", label: "Use Evidence Device", icon: ScanLine },
  ];

  return (
    <div className="space-y-4">
      <CaptureSteps />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-2 shadow-chip sm:flex-row sm:items-center">
        <nav aria-label="Capture type" className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-[14px] font-semibold transition-colors duration-150",
                  active ? "bg-brand text-white shadow-chip" : "text-fg-muted hover:bg-ink-750 hover:text-fg",
                )}
              >
                <Icon size={16} />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2 px-1 sm:ml-auto">
          <Pill tone="neutral">
            Signing on <span className="mono ml-1">{device?.device_id ?? "no device"}</span>
          </Pill>
          {online ? (
            <Pill tone="ok" icon={<UploadCloud size={11} />}>
              Online — saves and syncs
            </Pill>
          ) : (
            <Pill tone="warn" icon={<CloudOff size={11} />}>
              Offline — saved on device{queued ? ` · ${queued} waiting` : ""}
            </Pill>
          )}
        </div>
      </div>
    </div>
  );
}

/** A compact pointer to the physical workflow, with its illustration. */
export function CaptureDeviceHint() {
  return (
    <div className="panel grid items-center gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[220px] sm:w-[170px]">
        <AssetImage name="helpCapture" alt="Step 3, capture evidence: select the case, press Acquire, wait, review, save" />
      </div>
      <div>
        <div className="text-[16px] font-semibold text-fg">Have the evidence device?</div>
        <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">
          Select the case, press ACQUIRE on the device, wait for the reading, review it, then confirm
          to save. A reading is never saved without your confirmation.
        </p>
        <Link
          href="/operator"
          className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline"
        >
          <ScanLine size={16} /> Open Operator Mode
        </Link>
      </div>
    </div>
  );
}
