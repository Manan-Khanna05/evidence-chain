"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Code2, X } from "lucide-react";
import { Button, cx } from "@/components/ui/primitives";

/**
 * Technical details live one click away, never on the main path.
 *
 * A right-hand drawer rather than an inline expander so the page keeps its
 * single scroll; the drawer body is the only other scroll region and it only
 * exists while open. Escape and the backdrop close it; focus returns to the
 * trigger.
 */
export function TechnicalDetailsDrawer({
  title = "Technical Details",
  subtitle,
  label = "View Technical Details",
  children,
  buttonSize = "sm",
  buttonVariant = "ghost",
  className,
}: {
  title?: string;
  subtitle?: string;
  label?: string;
  children: React.ReactNode;
  buttonSize?: "sm" | "md" | "lg";
  buttonVariant?: "ghost" | "secondary";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      trigger.current?.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        size={buttonSize}
        variant={buttonVariant}
        icon={<Code2 size={15} />}
        onClick={() => setOpen(true)}
        className={className}
        aria-haspopup="dialog"
      >
        {label}
      </Button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[75]">
              <div
                className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-[#252525]/30"
                onClick={() => setOpen(false)}
              />
              <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cx(
                  "absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-line-strong bg-white shadow-lift outline-none",
                  "animate-[drawer-in_.22s_cubic-bezier(.22,.61,.36,1)]",
                )}
              >
                <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <div className="label">For examiners</div>
                    <h2 className="mt-1 text-[18px] font-semibold text-fg">{title}</h2>
                    {subtitle ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{subtitle}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Close technical details"
                    onClick={() => setOpen(false)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-ink-750 hover:text-fg"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
