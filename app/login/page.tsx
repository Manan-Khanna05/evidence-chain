"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleDashed,
  Fingerprint,
  Landmark,
} from "lucide-react";
import { ShieldCheck, UserRound } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { Button, Callout, IconContainer, Pill } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { AssetImage } from "@/components/ui/asset-image";
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
          // Scaled so only the train side of the platform is in frame: the
          // station signboard on the left of the photo never shows, and a soft
          // blur keeps the picture as atmosphere rather than a claim.
          backgroundSize: "auto 180vh",
          backgroundPosition: "right 55%",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#F5F0E5",
          filter: "blur(4px)",
          transform: "scale(1.04)",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0"
        style={{ background: "linear-gradient(180deg, rgba(245,240,229,0.84) 0%, rgba(245,240,229,0.93) 55%, rgba(245,240,229,0.98) 100%)" }}
      />

      <div className="relative w-full max-w-[460px]">
        {/* Brand block, as in the console sidebar: the production-safe crest
            and the product name, with a forest-green and brass rule beneath. */}
        <div className="relative flex items-center gap-4 overflow-hidden rounded-t-[22px] border border-b-0 border-line bg-[#FFFDF8] px-6 pb-5 pt-6">
          <span className="w-[52px] shrink-0">
            <AssetImage name="crest" alt="" rounded={false} sizes="52px" priority />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[26px] font-bold leading-none tracking-tight text-brand-deep">
              Evidence Chain
            </span>
            <span className="mt-1.5 block text-[13.5px] font-medium text-fg-muted">Railway Evidence Integrity Console</span>
            <span className="mt-0.5 block text-[12px] font-semibold text-[#8A5F16]">V2 • SIH 2026</span>
          </span>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-[4px]">
            <span className="w-2/3 bg-brand" />
            <span className="flex-1 bg-gold" />
          </span>
        </div>

        <div className="overflow-hidden rounded-b-[22px] border border-t-0 border-line bg-ink-850 shadow-lift">
          <div className="px-6 py-6">

            <h2 className="font-display text-[26px] font-bold tracking-tight text-brand-deep">Sign in</h2>
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

          {/* Railway context at the foot of the card: the supplied footer
              illustration, cropped to the drawing. */}
          <div className="relative border-t border-line">
            <div className="relative aspect-[250/70] w-full overflow-hidden">
              <AssetImage
                name="railwayFooter"
                alt=""
                rounded={false}
                fit="cover"
                className="absolute inset-0 h-full object-cover"
                style={{ objectPosition: "50% 58%" }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, rgba(248,242,230,0.96) 0%, rgba(248,242,230,0.7) 45%, rgba(248,242,230,0) 75%)" }}
              />
              <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-6">
                <span className="font-display text-[15px] font-semibold text-brand-deep">Railway evidence handling</span>
                <span className="text-[12px] text-fg-muted">People • Safety • Integrity</span>
              </div>
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
