"use client";

import * as React from "react";
import Link from "next/link";
import { Info, PenLine } from "lucide-react";
import {
  ArrowLeftRight,
  Check,
  Smartphone,
  TriangleAlert,
} from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  EmptyState,
  Panel,
  PanelHead,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { Field, OptionGroup, Select, TextArea, TextInput } from "@/components/ui/form";
import { HandoffPill } from "@/components/ui/status";
import { SEAL_STATES } from "@/lib/domain/vocab";
import { summariseAll } from "@/lib/domain/status";
import type { EvidenceRecord, SealState } from "@/lib/domain/types";
import { HandoffDocument } from "@/features/handoff/handoff-document";
import { RecordDrawer } from "@/features/records/record-drawer";
import { RailIcon, type RailIconName } from "@/components/ui/rail-icon";
import { AssetImage } from "@/components/ui/asset-image";
import { HelpTip } from "@/components/ui/help-tip";

type DeviceRole = "rpf" | "grp";

export default function HandoffPage() {
  const { store, officer, run } = useApp();
  const [deviceRole, setDeviceRole] = React.useState<DeviceRole>("rpf");
  const [drawerRecord, setDrawerRecord] = React.useState<EvidenceRecord | null>(null);
  const [busy, setBusy] = React.useState(false);

  // transfer form
  const [caseRef, setCaseRef] = React.useState("");
  const [receivingPost, setReceivingPost] = React.useState("GRP Post, Demo Junction");
  const [sampleCount, setSampleCount] = React.useState("3");
  const [sealState, setSealState] = React.useState<SealState>("intact");
  const [sealMarks, setSealMarks] = React.useState("SEAL-DMJ-26-0501 / 0502 / 0503");
  const [article, setArticle] = React.useState("Three sealed packets, synthetic demo article");
  const [weight, setWeight] = React.useState("840");

  // receipt form
  const [selectedHandoff, setSelectedHandoff] = React.useState<string>("");
  const [receiptCount, setReceiptCount] = React.useState("");
  const [receiptSeal, setReceiptSeal] = React.useState<SealState>("intact");
  const [remarks, setRemarks] = React.useState(
    "Received in hand. Sample count and seals compared against the transfer record.",
  );

  React.useEffect(() => {
    if (officer?.force === "GRP") setDeviceRole("grp");
  }, [officer?.force]);

  const pending = React.useMemo(
    () =>
      store
        ? store.handoffs.filter((h) => h.transfer_record_id && !h.receipt_record_id)
        : [],
    [store],
  );

  React.useEffect(() => {
    if (!selectedHandoff && pending.length) {
      setSelectedHandoff(pending[0].handoff_id);
      setReceiptCount(String(pending[0].sample_count ?? ""));
      setReceiptSeal((pending[0].seal_state ?? "intact") as SealState);
    }
  }, [pending, selectedHandoff]);

  if (!store) return null;

  const summaries = summariseAll(store);
  const eligible = summaries.filter(
    (s) => s.handoff_status === "not_started" && s.records.length > 0,
  );
  const activeHandoff = store.handoffs.find((h) => h.handoff_id === selectedHandoff) ?? null;
  const activeTransfer = activeHandoff
    ? store.records.find((r) => r.record_id === activeHandoff.transfer_record_id) ?? null
    : null;

  const rpfDevice =
    store.devices.find((d) => d.assigned_officer_id === (officer?.force === "RPF" ? officer.officer_id : "RPF-104")) ??
    store.devices.find((d) => d.force === "RPF") ??
    null;
  const grpDevice =
    store.devices.find((d) => d.assigned_officer_id === (officer?.force === "GRP" ? officer.officer_id : "GRP-076")) ??
    store.devices.find((d) => d.force === "GRP") ??
    null;
  const rpfOfficer = store.officers.find((o) => o.officer_id === rpfDevice?.assigned_officer_id);
  const grpOfficer = store.officers.find((o) => o.officer_id === grpDevice?.assigned_officer_id);

  const createTransfer = async () => {
    if (!rpfDevice || !rpfOfficer) return;
    setBusy(true);
    const res = await run("handoff.transfer", {
      case_ref: caseRef,
      device_id: rpfDevice.device_id,
      officer_id: rpfOfficer.officer_id,
      receiving_post: receivingPost,
      sample_count: Number(sampleCount),
      seal_state: sealState,
      seal_marks: sealMarks,
      article_description: article,
      gross_weight_g: Number(weight),
    }, {
      toast: {
        title: "Transfer record created",
        body: "Signed on the RPF device. A GRP receipt can now be signed against it.",
      },
    });
    setBusy(false);
    if (res.ok) {
      setCaseRef("");
      setDeviceRole("grp");
    }
  };

  const signReceipt = async () => {
    if (!grpDevice || !grpOfficer || !activeHandoff) return;
    setBusy(true);
    const res = await run<{ mismatch: boolean }>("handoff.receipt", {
      handoff_id: activeHandoff.handoff_id,
      device_id: grpDevice.device_id,
      officer_id: grpOfficer.officer_id,
      sample_count: Number(receiptCount),
      seal_state: receiptSeal,
      remarks,
    });
    setBusy(false);
    if (res.ok) {
      const mismatch = res.result?.mismatch;
      if (mismatch) {
        // handled by the document below, which now shows the mismatch state
      }
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="RPF → GRP"
        title="Handoff"
        subtitle="RPF seizes and forwards; GRP prosecutes. Two officers, two devices, two signatures over one transfer."
        actions={
          <div role="tablist" aria-label="Which device are you using?" className="flex items-center gap-1 rounded-xl border border-line bg-white p-1 shadow-chip">
            <Smartphone size={16} className="ml-2 text-fg-dim" />
            {(
              [
                { key: "rpf" as const, label: "Device A — RPF" },
                { key: "grp" as const, label: "Device B — GRP" },
              ]
            ).map((d) => (
              <button
                key={d.key}
                role="tab"
                aria-selected={deviceRole === d.key}
                onClick={() => setDeviceRole(d.key)}
                className={cx(
                  "min-h-[40px] rounded-lg px-3 text-[13.5px] font-semibold transition-colors duration-150",
                  deviceRole === d.key
                    ? "bg-brand text-white shadow-chip"
                    : "text-fg-muted hover:bg-ink-750 hover:text-fg",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        }
      />

      <Panel className="overflow-hidden">
        <div className="grid items-center gap-6 p-5 md:grid-cols-[auto_minmax(0,1fr)] lg:p-6">
          <div className="mx-auto w-full max-w-[353px] md:w-[320px]">
            <AssetImage name="handoff" alt="An RPF officer handing a sealed evidence box to a GRP officer" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-semibold text-fg">How a handoff works</h2>
              <HelpTip term="handoff" />
            </div>
            <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-fg-muted">
              <Info size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>
                A receipt cannot exist without its transfer. In the field these are two phones; here
                the toggle above switches between Device A (<span className="mono">{rpfDevice?.device_id}</span>)
                and Device B (<span className="mono">{grpDevice?.device_id}</span>). A receipt signed on the
                transfer&apos;s own device is refused.
              </span>
            </p>
          </div>
        </div>
        <div className="border-t border-line bg-ink-850/60 px-5 py-4 lg:px-6">
        {/* The custody path, in order. Two signatures, two devices. */}
        <ol aria-label="Custody path" className="grid gap-3 md:grid-cols-5 md:gap-2.5">
          {(
            [
              { icon: "user", t: "RPF", b: "Seizing officer, Device A", tone: "brand" },
              { icon: "handoff", t: "Transfer", b: "RPF signs: samples, seals, weight", tone: "gold" },
              { icon: "lock", t: "Evidence Package", b: "Sealed packets move together", tone: "gold" },
              { icon: "user", t: "GRP", b: "Receiving officer, Device B", tone: "brand" },
              { icon: "certificates", t: "Receipt", b: "GRP checks and signs", tone: "ok" },
            ] as { icon: RailIconName; t: string; b: string; tone: "brand" | "gold" | "ok" }[]
          ).map((step, i, all) => (
            <li key={step.t} className="relative flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3 md:flex-col md:items-start md:gap-2">
              <span
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  step.tone === "brand" && "bg-brand-soft text-brand-deep",
                  step.tone === "gold" && "bg-gold-soft text-[#9A5F12]",
                  step.tone === "ok" && "bg-ok/[0.1] text-ok",
                )}
              >
                <RailIcon name={step.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold text-fg">{step.t}</span>
                <span className="block text-[12.5px] leading-snug text-fg-muted">{step.b}</span>
              </span>
              {i < all.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[13px] left-[30px] z-[1] text-fg-dim md:-right-[13px] md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2"
                >
                  <RailIcon name="chevron-right" size={16} className="rotate-90 md:rotate-0" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>        </div>
      </Panel>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* ------------------------------------------------------- forms */}
        <div className="min-w-0 space-y-5">
          {deviceRole === "rpf" ? (
            <Panel className="min-w-0">
              <PanelHead
                title="Device A — RPF transfer"
                subtitle="The transferring officer creates and signs the transfer record."
                icon={<ArrowLeftRight size={16} />}
                right={
                  <Pill tone="brand">
                    {rpfOfficer?.officer_id} · {rpfDevice?.device_id}
                  </Pill>
                }
              />
              <div className="space-y-4 p-5">
                <Field label="Case reference" required hint="Only cases without a transfer are listed.">
                  <Select value={caseRef} onChange={(e) => setCaseRef(e.target.value)}>
                    <option value="">Select a case…</option>
                    {eligible.map((s) => (
                      <option key={s.case_ref} value={s.case_ref}>
                        {s.case_ref} — {s.place}
                      </option>
                    ))}
                  </Select>
                </Field>

                {eligible.length === 0 ? (
                  <Callout tone="neutral">
                    Every case in the store already has a transfer record. Capture a new trigger and
                    field test to create another handoff.
                  </Callout>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sample count" required hint="Carried across to the receipt and compared.">
                    <TextInput
                      type="number"
                      min={1}
                      value={sampleCount}
                      onChange={(e) => setSampleCount(e.target.value)}
                    />
                  </Field>
                  <Field label="Seal state" required>
                    <Select
                      value={sealState}
                      onChange={(e) => setSealState(e.target.value as SealState)}
                    >
                      {SEAL_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Seal marks">
                  <TextInput value={sealMarks} onChange={(e) => setSealMarks(e.target.value)} />
                </Field>
                <Field label="Receiving post" required>
                  <TextInput
                    value={receivingPost}
                    onChange={(e) => setReceivingPost(e.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
                  <Field label="Article description">
                    <TextInput value={article} onChange={(e) => setArticle(e.target.value)} />
                  </Field>
                  <Field label="Gross weight (g)">
                    <TextInput
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </Field>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  busy={busy}
                  disabled={!caseRef}
                  onClick={createTransfer}
                  icon={<PenLine size={16} />}
                >
                  Sign transfer record
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel className="min-w-0">
              <PanelHead
                title="Device B — GRP receipt"
                subtitle="The receiving officer signs against an existing transfer record."
                icon={<PenLine size={16} />}
                right={
                  <Pill tone="ok">
                    {grpOfficer?.officer_id} · {grpDevice?.device_id}
                  </Pill>
                }
              />
              <div className="space-y-4 p-5">
                {pending.length === 0 ? (
                  <EmptyState
                    icon={<Check size={22} />}
                    title="No custody transfer currently requires a receipt"
                    body="A receiving receipt can only be created against an existing transfer record. Switch to Device A and create one."
                    action={
                      <Button size="sm" onClick={() => setDeviceRole("rpf")}>
                        Switch to Device A
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <Field label="Pending handoff" required>
                      <Select
                        value={selectedHandoff}
                        onChange={(e) => {
                          const h = pending.find((x) => x.handoff_id === e.target.value);
                          setSelectedHandoff(e.target.value);
                          if (h) {
                            setReceiptCount(String(h.sample_count ?? ""));
                            setReceiptSeal((h.seal_state ?? "intact") as SealState);
                          }
                        }}
                      >
                        {pending.map((h) => (
                          <option key={h.handoff_id} value={h.handoff_id}>
                            {h.handoff_id} — {h.case_ref}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Callout tone="warn" title="Count and seal are verified, not copied">
                      Enter what you actually received. If it disagrees with the transfer record the
                      handoff is marked a transfer mismatch, and it stays that way — a
                      two-versus-three sample discrepancy is the kind of failure that has shattered
                      prosecutions.
                    </Callout>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Sample count received" required>
                        <TextInput
                          type="number"
                          min={1}
                          value={receiptCount}
                          onChange={(e) => setReceiptCount(e.target.value)}
                        />
                      </Field>
                      <Field label="Seal state on receipt" required>
                        <Select
                          value={receiptSeal}
                          onChange={(e) => setReceiptSeal(e.target.value as SealState)}
                        >
                          {SEAL_STATES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <Field label="Remarks">
                      <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </Field>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      busy={busy}
                      disabled={!selectedHandoff || !receiptCount}
                      onClick={signReceipt}
                      icon={<PenLine size={16} />}
                    >
                      Sign receiving receipt
                    </Button>
                  </>
                )}
              </div>
            </Panel>
          )}

          <Panel className="min-w-0">
            <PanelHead title="All handoffs" subtitle="Every transfer in the store and its state." />
            <ul className="divide-y divide-line">
              {store.handoffs.map((h) => (
                <li key={h.handoff_id}>
                  <button
                    onClick={() => setSelectedHandoff(h.handoff_id)}
                    className={cx(
                      "flex w-full flex-wrap items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-ink-750/60",
                      selectedHandoff === h.handoff_id && "bg-ink-750/50",
                    )}
                  >
                    <span className="mono text-[12.5px] font-semibold text-fg">{h.handoff_id}</span>
                    <Link
                      href={`/cases/${h.case_ref}`}
                      className="mono text-[12px] text-fg-muted hover:text-fg hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {h.case_ref}
                    </Link>
                    <span className="text-[11.5px] text-fg-dim">
                      {h.sample_count} sample(s) · seal {h.seal_state?.replace(/_/g, " ")}
                    </span>
                    <span className="ml-auto">
                      <HandoffPill status={h.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* -------------------------------------------------- the document */}
        <div>
          <Panel className="min-w-0">
            <PanelHead
              title="Handoff record"
              subtitle="Transferor → transfer → receiver, with both signatures verified independently."
              icon={<ArrowLeftRight size={16} />}
              right={
                activeHandoff ? (
                  <ButtonLink href={`/cases/${activeHandoff.case_ref}`} size="sm" variant="ghost">
                      Open case
                    </ButtonLink>
                ) : null
              }
            />
            <div className="p-5">
              {activeHandoff && activeTransfer ? (
                <HandoffDocument
                  store={store}
                  handoff={activeHandoff}
                  transfer={activeTransfer}
                  receipt={
                    store.records.find((r) => r.record_id === activeHandoff.receipt_record_id) ?? null
                  }
                  onOpenRecord={setDrawerRecord}
                />
              ) : (
                <EmptyState
                  icon={<TriangleAlert size={22} />}
                  title="Select a handoff"
                  body="Choose one from the list to see the transferor, the transfer and the receiver side by side."
                />
              )}
            </div>
          </Panel>
        </div>
      </div>

      <RecordDrawer record={drawerRecord} store={store} onClose={() => setDrawerRecord(null)} />
    </>
  );
}
