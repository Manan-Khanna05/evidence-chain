"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Check, X } from "@/components/ui/icons";
import { AssetImage } from "@/components/ui/asset-image";
import { Button, cx } from "@/components/ui/primitives";
import type { AssetKey } from "@/lib/assets";

const KEY = "evidence-chain.onboarding.v1";

const STEPS: { image: AssetKey; alt: string; title: string; body: string }[] = [
  {
    image: "pramaanDevice",
    alt: "The PRAMAAN evidence unit with its load cell, status display and ACQUIRE buttons",
    title: "Connect PRAMAAN",
    body: "Plug PRAMAAN in with its USB cable and press Connect PRAMAAN. Once it identifies itself you will see PRAMAAN ONLINE, with each reading labelled LIVE, SIMULATED or UNAVAILABLE. Capture still works without it.",
  },
  {
    image: "helpCapture",
    alt: "Operator pressing the Acquire button on the device",
    title: "Capture evidence",
    body: "Select the case, press ACQUIRE on the device, check what was recorded, then confirm and save. Nothing is saved until you confirm it.",
  },
  {
    image: "helpSync",
    alt: "Laptop showing records saved offline, then syncing",
    title: "Works offline",
    body: "No network? Keep working. Records are signed and saved on this device, shown under Pending Sync, and upload automatically later.",
  },
  {
    image: "handoff",
    alt: "RPF officer handing a sealed evidence box to a GRP officer",
    title: "Hand over to GRP",
    body: "RPF signs the transfer; GRP signs the receipt against it. A receipt cannot exist without the transfer it answers.",
  },
  {
    image: "helpVerify",
    alt: "Laptop showing evidence verified with four checks passed",
    title: "Verify anytime",
    body: "One button answers: is this evidence chain intact? If anything was changed after capture, verification shows exactly where.",
  },
];

/** True once the guide has been completed or skipped on this browser. */
function seen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "done";
  } catch {
    return true; // storage unavailable: never trap the user in the guide
  }
}

const ReplayCtx = React.createContext<() => void>(() => undefined);

/** Call to reopen the guide from anywhere (sidebar, Help page). */
export function useReplayGuide() {
  return React.useContext(ReplayCtx);
}

/**
 * First-login guide: five steps, each with its supplied illustration.
 * Skippable at every step; replayable from How to Use and the sidebar.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!seen()) setOpen(true);
  }, []);

  const finish = React.useCallback(() => {
    try {
      window.localStorage.setItem(KEY, "done");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setStep(0);
  }, []);

  const replay = React.useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, finish]);

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <ReplayCtx.Provider value={replay}>
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <div className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-fg/35" />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="onboarding-title"
                className="relative w-full max-w-[520px] animate-fade-up overflow-hidden rounded-t-3xl border border-line-strong bg-white shadow-lift sm:rounded-3xl"
              >
                <div className="flex items-center justify-between px-5 pt-4">
                  <span className="text-[12.5px] font-semibold text-fg-dim">
                    Step {step + 1} of {STEPS.length}
                  </span>
                  <button
                    type="button"
                    onClick={finish}
                    className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium text-fg-muted hover:bg-ink-750 hover:text-fg"
                  >
                    Skip Guide <X size={15} />
                  </button>
                </div>

                <div className="flex justify-center px-5 pt-1">
                  <AssetImage key={s.image} name={s.image} alt={s.alt} maxWidth={380} priority className="animate-fade-up" />
                </div>

                <div className="px-6 pb-2 pt-5">
                  <h2 id="onboarding-title" className="text-[22px] font-semibold tracking-tight text-brand-deep">
                    {s.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{s.body}</p>
                </div>

                <div className="flex items-center justify-center gap-2 py-3" aria-hidden="true">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={cx(
                        "h-2 rounded-full transition-all duration-200",
                        i === step ? "w-6 bg-brand" : "w-2 bg-ink-600",
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3 border-t border-line px-5 py-4">
                  <Button
                    variant="ghost"
                    size="lg"
                    icon={<ArrowLeft size={17} />}
                    onClick={() => setStep((x) => Math.max(0, x - 1))}
                    disabled={step === 0}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    className="ml-auto min-w-[150px]"
                    onClick={() => (last ? finish() : setStep((x) => x + 1))}
                    icon={last ? <Check size={17} /> : undefined}
                  >
                    {last ? "Start using" : "Next"}
                    {!last ? <ArrowRight size={17} /> : null}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ReplayCtx.Provider>
  );
}
