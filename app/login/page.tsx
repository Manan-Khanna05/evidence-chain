"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleDashed, Fingerprint, Landmark, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button, Callout, IconContainer, Pill } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { EvidenceChainMark } from "@/components/brand/marks";
import { ASSETS } from "@/lib/assets";

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
      setError(`We couldn't find officer ID "${id}". Check it and try again, or use a demo login below.`);
      return;
    }
    setError(null);
    signIn(officer.officer_id);
    router.push("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* Station light, faint: context for the card, never competing with it. */}
      <div
        aria-hidden="true"
        className="fixed inset-0"
        style={{
          backgroundImage: `url(${ASSETS.railwayLight.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0"
        style={{ background: "linear-gradient(180deg, rgba(245,240,229,0.95) 0%, rgba(245,240,229,0.97) 60%, rgba(245,240,229,0.99) 100%)" }}
      />

      <div className="relative w-full max-w-[460px]">
        {/* Brand block, as in the console sidebar. */}
        <div
          className="relative flex items-center gap-3 overflow-hidden rounded-t-[22px] px-6 py-5 text-white"
          style={{ background: "linear-gradient(160deg, #14532D 0%, #0B3B27 100%)" }}
        >
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-gold/80" />
          <EvidenceChainMark size={46} tone="gold" />
          <span className="leading-tight">
            <span className="block text-[20px] font-bold tracking-tight">Evidence Chain</span>
            <span className="block text-[13px] font-medium text-white/80">Railway Evidence Integrity Console</span>
            <span className="mt-0.5 block text-[12px] font-semibold text-gold-soft">V2 • SIH 2026</span>
          </span>
        </div>

        <div className="overflow-hidden rounded-b-[22px] border border-t-0 border-line bg-ink-850 shadow-lift">
          <div className="px-6 py-6">

            <h2 className="text-[24px] font-bold tracking-tight text-brand-deep">Sign in</h2>
            <p className="mt-1.5 text-[14.5px] text-fg-muted">
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
                <Callout tone="danger" title="Could not sign in">
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
                      <span className="block text-[14.5px] font-semibold text-fg">{d.label}</span>
                      <span className="block text-[12.5px] leading-snug text-fg-muted">
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

        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-fg-muted">
          A prototype built for railway evidence handling. Integrity verification is not chemical
          identification.
        </p>
      </div>
    </div>
  );
}
