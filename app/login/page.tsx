"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleDashed, Fingerprint, Landmark, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button, Callout, IconContainer, Pill } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { BrandLockup, HeroStrip, IndiaSilhouette } from "@/components/brand/marks";

const DEMO_LOGINS = [
  {
    officer_id: "RPF-104",
    label: "RPF Officer Demo",
    detail: "Capture triggers and field tests, create the custody transfer",
    icon: ShieldCheck,
    tone: "brand" as const,
  },
  {
    officer_id: "GRP-076",
    label: "GRP Officer Demo",
    detail: "Receive custody and sign the receiving receipt",
    icon: Landmark,
    tone: "ok" as const,
  },
  {
    officer_id: "VER-001",
    label: "Verifier Demo",
    detail: "Read-only: re-walk the chain and check the certificate",
    icon: Fingerprint,
    tone: "sim" as const,
  },
];

export default function LoginPage() {
  const { store, loading, signIn, session } = useApp();
  const router = useRouter();
  const [officerId, setOfficerId] = React.useState("RPF-104");
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const submit = (id: string) => {
    const officer = store?.officers.find((o) => o.officer_id === id.trim().toUpperCase());
    if (!officer) {
      setError(`No officer with ID "${id}" exists in this demo dataset.`);
      return;
    }
    setError(null);
    signIn(officer.officer_id);
    router.push("/dashboard");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------------- left panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/70 p-10 lg:flex">
        <HeroStrip className="absolute inset-x-0 top-0" height={300} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(245,243,237,0.35) 0%, rgba(245,243,237,0.9) 42%, rgba(245,243,237,1) 62%)",
          }}
        />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-[340px] w-[340px] text-brand">
          <IndiaSilhouette opacity={0.07} />
        </div>

        <div className="relative">
          <BrandLockup size={44} subtitle="SIH 2026 • Phase 1 Prototype" />
        </div>

        <div className="relative max-w-lg">
          <div className="tricolour mb-5 h-[3px] w-12 rounded-full" />
          <h1 className="text-[38px] font-semibold leading-[1.12] tracking-tight text-brand-deep">
            The seam, not the sensor.
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-fg-muted">
            RPF searches under NDPS s.43. The GRP prosecutes. The case crosses a two-agency seam that
            no existing system spans — and that is where Indian appellate courts actually acquit
            people.
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
            This console records three objects across that seam, signs and chains them on the device,
            and anchors them to a bounded trusted time interval.
          </p>

          <ol className="mt-7 space-y-3">
            {[
              "s.43 trigger record — what caused the stop",
              "Presumptive field-test record — reagent, lot, expiry, colour, reference table",
              "RPF → GRP custody handoff — two officers, two signatures, one transfer",
            ].map((line, i) => (
              <li key={line} className="flex items-start gap-3 text-[13.5px] text-fg">
                <span className="mono mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/[0.08] text-[10.5px] font-bold text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel relative max-w-lg px-5 py-4">
          <div className="label">The limit, said out loud</div>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
            This does not make a field test correct. It makes the test&apos;s reagent, lot, operator
            and epistemic status legible to a court that today receives one sentence in a panchanama.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------ right panel */}
      <div className="relative flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-7 lg:hidden">
            <BrandLockup subtitle="SIH 2026 • Phase 1 Prototype" />
          </div>

          <div className="panel panel-solid px-6 py-7 shadow-lift">
            <h2 className="text-[21px] font-semibold tracking-tight text-brand-deep">Sign in</h2>
            <p className="mt-1.5 text-[13.5px] text-fg-muted">
              Identify the officer operating this device.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(officerId);
              }}
            >
              <Field label="Officer ID" required>
                <TextInput
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="RPF-104"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="Password / PIN"
                hint="Not checked in this prototype. Identity infrastructure is out of Phase-1 scope."
              >
                <TextInput
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  autoComplete="off"
                />
              </Field>

              {error ? (
                <Callout tone="danger" title="Sign-in failed">
                  {error}
                </Callout>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                busy={loading}
                disabled={loading}
                icon={<ArrowRight size={17} />}
              >
                Continue
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="label">Demo logins</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="space-y-2.5">
              {DEMO_LOGINS.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.officer_id}
                    type="button"
                    onClick={() => submit(d.officer_id)}
                    disabled={loading}
                    className="hover-lift flex w-full items-center gap-3 rounded-xl border border-line-strong bg-white/80 px-3.5 py-3 text-left shadow-chip transition-colors hover:border-brand/40 disabled:opacity-50"
                  >
                    <IconContainer tone={d.tone} size="md">
                      <Icon size={18} />
                    </IconContainer>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-fg">{d.label}</span>
                      <span className="block text-[11.5px] leading-snug text-fg-dim">
                        {d.detail}
                      </span>
                    </span>
                    <span className="mono shrink-0 text-[11px] text-fg-dim">{d.officer_id}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Pill tone="sim" icon={<CircleDashed size={11} />}>
                Synthetic identities
              </Pill>
              <Pill tone="neutral" icon={<UserRound size={11} />}>
                No credential is verified
              </Pill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
