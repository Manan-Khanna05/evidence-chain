"use client";

import * as React from "react";
import { ChevronDown } from "@/components/ui/icons";
import { cx } from "./primitives";

export function Field({
  label,
  hint,
  required,
  error,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="label flex items-center gap-1.5">
        {label}
        {required ? <span className="text-danger">*</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <span className="mt-1.5 block text-[12px] font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11.5px] leading-snug text-fg-dim">{hint}</span>
      ) : null}
    </label>
  );
}

const control =
  "w-full rounded-xl border border-line-strong bg-white/85 px-3.5 text-[14px] text-fg shadow-chip " +
  "placeholder:text-fg-dim transition-all duration-150 hover:border-brand/40 " +
  "focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 disabled:opacity-55 disabled:bg-ink-750";

export function TextInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, "h-[44px]", className)} {...rest} />;
}

export function TextArea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cx(control, "min-h-[88px] py-2.5 leading-relaxed", className)} {...rest} />
  );
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(control, "h-[44px] appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-dim"
      />
    </div>
  );
}

/** Large touch targets for the capture screens (mobile-first officer flow). */
export function OptionGroup<T extends string>({
  value,
  onChange,
  options,
  columns = 2,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cx(
        "grid gap-2.5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-3",
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cx(
              "flex min-h-[56px] flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-all duration-150",
              active
                ? "border-brand bg-brand/[0.09] text-fg shadow-[0_0_0_1px_rgba(20,83,45,0.35)_inset]"
                : "border-line-strong bg-white/80 text-fg-muted shadow-chip hover:border-brand/40 hover:bg-white hover:text-fg",
            )}
          >
            <span className="text-[13.5px] font-semibold">{o.label}</span>
            {o.hint ? <span className="mt-0.5 text-[11.5px] text-fg-dim">{o.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
