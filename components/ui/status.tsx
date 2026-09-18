"use client";

import * as React from "react";
import {
  AlertTriangle,
  Anchor as AnchorIcon,
  ArrowLeftRight,
  CheckCircle2,
  CircleDashed,
  CloudOff,
  FileSignature,
  FlaskConical,
  Radio,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { Pill, type Tone } from "./primitives";
import type { AnchorState } from "@/lib/domain/status";
import type { CaseStage, Handoff, RecordStatus, RecordType } from "@/lib/domain/types";

/* ------------------------------------------------------- record lifecycle */

export const RECORD_STATUS_META: Record<RecordStatus, { label: string; tone: Tone }> = {
  captured: { label: "Captured", tone: "info" },
  queued: { label: "Queued", tone: "warn" },
  pushed: { label: "Pushed", tone: "info" },
  anchored: { label: "Anchored", tone: "ok" },
};

export function RecordStatusPill({ status }: { status: RecordStatus }) {
  const m = RECORD_STATUS_META[status];
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

export const RECORD_TYPE_META: Record<RecordType, { label: string; icon: React.ReactNode; tone: Tone }> = {
  trigger: { label: "s.43 Trigger", icon: <Radio size={13} />, tone: "brand" },
  field_test: { label: "Field Test", icon: <FlaskConical size={13} />, tone: "info" },
  handoff_transfer: { label: "Handoff — Transfer", icon: <ArrowLeftRight size={13} />, tone: "sim" },
  handoff_receipt: { label: "Handoff — Receipt", icon: <FileSignature size={13} />, tone: "sim" },
};

export function RecordTypePill({ type }: { type: RecordType }) {
  const m = RECORD_TYPE_META[type];
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {m.label}
    </Pill>
  );
}

/* ------------------------------------------------------------ case stages */

export const STAGE_META: Record<CaseStage, { label: string; tone: Tone }> = {
  triggered: { label: "Triggered", tone: "brand" },
  field_test_recorded: { label: "Field test recorded", tone: "info" },
  queued_offline: { label: "Queued offline", tone: "warn" },
  pushed: { label: "Server accepted", tone: "info" },
  anchored: { label: "Anchored", tone: "ok" },
  handoff_pending: { label: "Handoff pending", tone: "warn" },
  handoff_verified: { label: "Handoff verified", tone: "ok" },
  certificate_ready: { label: "Certificate ready", tone: "ok" },
};

export function StagePill({ stage }: { stage: CaseStage }) {
  const m = STAGE_META[stage];
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

/* ---------------------------------------------------------------- handoff */

export const HANDOFF_META: Record<Handoff["status"], { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" },
  transfer_created: { label: "Transfer created", tone: "info" },
  awaiting_receipt: { label: "Awaiting GRP receipt", tone: "warn" },
  receipt_signed: { label: "Receipt signed", tone: "info" },
  verified: { label: "Two-party verified", tone: "ok" },
  mismatch: { label: "Transfer mismatch", tone: "danger" },
};

export function HandoffPill({ status }: { status: Handoff["status"] }) {
  const m = HANDOFF_META[status];
  return (
    <Pill tone={m.tone} icon={m.tone === "ok" ? <ShieldCheck size={13} /> : undefined}>
      {m.label}
    </Pill>
  );
}

/* ----------------------------------------------------------------- anchor */

export const ANCHOR_META: Record<AnchorState, { label: string; tone: Tone }> = {
  unanchored: { label: "Unanchored", tone: "warn" },
  single_anchor: { label: "Partially anchored", tone: "warn" },
  dual_anchored: { label: "Dual anchored", tone: "ok" },
};

export function AnchorPill({ state }: { state: AnchorState }) {
  const m = ANCHOR_META[state];
  return (
    <Pill tone={m.tone} icon={<AnchorIcon size={12} />}>
      {m.label}
    </Pill>
  );
}

/* ------------------------------------------------------------ verification */

export function VerificationPill({
  verified,
  degraded,
  compact = false,
}: {
  verified: boolean;
  degraded?: boolean;
  compact?: boolean;
}) {
  if (!verified) {
    return (
      <Pill tone="danger" icon={<XCircle size={13} />}>
        {compact ? "Broken" : "Chain broken"}
      </Pill>
    );
  }
  if (degraded) {
    return (
      <Pill tone="warn" icon={<AlertTriangle size={13} />}>
        Verified — degraded
      </Pill>
    );
  }
  return (
    <Pill tone="ok" icon={<CheckCircle2 size={13} />}>
      Verified
    </Pill>
  );
}

/* ------------------------------------------------------------ connectivity */

export function ConnectivityPill({ online }: { online: boolean }) {
  return online ? (
    <Pill tone="ok" icon={<UploadCloud size={13} />}>
      Online
    </Pill>
  ) : (
    <Pill tone="warn" icon={<CloudOff size={13} />}>
      Offline
    </Pill>
  );
}

export const PRESUMPTIVE_PILL = (
  <Pill tone="warn" icon={<AlertTriangle size={12} />}>
    Presumptive — not a chemical identification
  </Pill>
);

export const MOCK_SENSOR_PILL = (
  <Pill tone="sim" icon={<CircleDashed size={12} />}>
    Mock sensor
  </Pill>
);

export const SIM_TSA_PILL = (
  <Pill tone="sim" icon={<CircleDashed size={12} />}>
    Simulated TSA
  </Pill>
);

export const DEMO_SIGNATURE_PILL = (
  <Pill tone="sim" icon={<CircleDashed size={12} />}>
    Demo signature
  </Pill>
);
