"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudOff, FlaskConical, Radio, UploadCloud } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Pill, cx } from "@/components/ui/primitives";

/**
 * The capture sub-navigation, plus the state an officer needs before typing
 * anything: which device is signing, and whether the record will queue.
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
    { href: "/capture/field-test", label: "Field test", icon: FlaskConical },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-ink-850/60 p-2.5 sm:flex-row sm:items-center">
      <div className="flex gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-brand/15 text-fg ring-1 ring-brand/40"
                  : "text-fg-muted hover:bg-ink-750 hover:text-fg",
              )}
            >
              <Icon size={15} />
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:pr-1">
        <Pill tone="neutral">
          Device <span className="mono ml-1">{device?.device_id ?? "none"}</span>
        </Pill>
        <Pill tone="neutral">
          Officer <span className="mono ml-1">{officer?.officer_id ?? "—"}</span>
        </Pill>
        {online ? (
          <Pill tone="ok" icon={<UploadCloud size={11} />}>
            Records push immediately
          </Pill>
        ) : (
          <Pill tone="warn" icon={<CloudOff size={11} />}>
            Records will queue{queued ? ` · ${queued} waiting` : ""}
          </Pill>
        )}
      </div>
    </div>
  );
}
