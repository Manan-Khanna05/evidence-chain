"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleDashed,
  Fingerprint,
  Landmark,
  Languages,
} from "lucide-react";
import { ShieldCheck, UserRound } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { Button, Callout, IconContainer, Pill } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { AssetImage } from "@/components/ui/asset-image";
import { ASSETS } from "@/lib/assets";
import { useT } from "@/components/providers/prefs-provider";
import { LanguageGrid } from "@/components/layout/language-picker";
import type { StringKey } from "@/lib/i18n/strings";

const DEMO_LOGINS: { officer_id: string; label: StringKey; detail: StringKey; icon: React.ComponentType<{ size?: number }>; tone: "brand" | "ok" | "sim" }[] = [
  { officer_id: "RPF-104", label: "login.rpfDemo", detail: "login.rpfDetail", icon: ShieldCheck, tone: "brand" },
  { officer_id: "GRP-076", label: "login.grpDemo", detail: "login.grpDetail", icon: Landmark, tone: "ok" },
  { officer_id: "VER-001", label: "login.verDemo", detail: "login.verDetail", icon: Fingerprint, tone: "sim" },
];

export default function LoginPage() {
  const { store, loading, signIn, session } = useApp();
  const router = useRouter();
  const [officerId, setOfficerId] = React.useState("RPF-104");
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const t = useT();

  React.useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const submit = (id: string) => {
    const officer = store?.officers.find((o) => o.officer_id === id.trim().toUpperCase());
    if (!officer) {
      setError(`${t("login.notFound")} (${id})`);
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
          backgroundColor: "#F7F8FA",
          filter: "blur(4px)",
          transform: "scale(1.04)",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0"
        style={{ background: "linear-gradient(180deg, rgba(238,244,255,0.9) 0%, rgba(247,248,250,0.96) 50%, rgba(247,248,250,0.99) 100%)" }}
      />

      <div className="relative w-full max-w-[460px]">
        {/* Brand block, as in the console sidebar: the production-safe crest
            and the product name, with a forest-green and brass rule beneath. */}
        <div className="relative flex items-center gap-4 overflow-hidden rounded-t-[16px] border border-b-0 border-line bg-white px-6 pb-5 pt-7">
          <span className="w-[52px] shrink-0">
            <AssetImage name="crest" alt="" rounded={false} sizes="52px" priority />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[26px] font-bold leading-none tracking-tight text-brand-deep">
              Evidence Chain
            </span>
            <span className="mt-1.5 block text-[13.5px] font-medium text-fg-muted">{t("brand.subtitle")}</span>
            <span className="mt-0.5 block text-[12px] font-semibold text-brand">V2 • SIH 2026</span>
          </span>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-[4px]">
            <span className="w-2/3 bg-brand" />
            <span className="flex-1 bg-accent" />
          </span>
        </div>

        <div className="overflow-hidden rounded-b-[16px] border border-t-0 border-line bg-white shadow-lift">
          {/* Language first: everything below follows the choice. */}
          <section aria-labelledby="lang-title" className="border-b border-line bg-brand-soft/60 px-6 py-5">
            <h2 id="lang-title" className="flex items-center gap-2 text-[15px] font-semibold text-brand-deep">
              <Languages size={17} aria-hidden="true" />
              {t("login.chooseLanguage")}
              {/* Always legible, whatever language is on screen. */}
              <span className="text-[12.5px] font-normal text-fg-muted">· Choose your language</span>
            </h2>
            <div className="mt-3">
              <LanguageGrid columns={3} compact />
            </div>
            <p className="mt-2.5 text-[12.5px] text-fg-muted">{t("login.languageHint")}</p>
          </section>

          <div className="px-6 py-6">
            <h2 className="text-[24px] font-bold tracking-tight text-brand-deep">{t("login.signIn")}</h2>
            <p className="mt-1.5 text-[14.5px] text-fg-muted">{t("login.identify")}</p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(officerId);
              }}
            >
              <Field label={t("login.officerId")} required>
                <TextInput
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder="RPF-104"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field
                label={t("login.password")}
                hint={t("login.passwordHint")}
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
                <Callout tone="danger" title={t("login.couldNotSignIn")}>
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
                {t("login.continue")}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="label">{t("login.demoLogins")}</span>
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
                      <span className="block text-[14.5px] font-semibold text-brand-deep">{t(d.label)}</span>
                      <span className="block text-[12.5px] leading-snug text-fg-muted">
                        {t(d.detail)}
                      </span>
                    </span>
                    <span className="mono shrink-0 text-[11px] text-fg-dim">{d.officer_id}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Pill tone="sim" icon={<CircleDashed size={11} />}>
                {t("login.synthetic")}
              </Pill>
              <Pill tone="neutral" icon={<UserRound size={11} />}>
                {t("login.noCredential")}
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
                style={{ background: "linear-gradient(90deg, rgba(238,244,255,0.97) 0%, rgba(238,244,255,0.75) 45%, rgba(238,244,255,0) 75%)" }}
              />
              <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-6">
                <span className="text-[14.5px] font-semibold text-brand-deep">{t("footer.railwayHandling")}</span>
                <span className="text-[12px] text-fg-muted">{t("footer.values")}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-fg-muted">
          {t("login.footer")}
        </p>
      </div>
    </div>
  );
}
