"use client";

import * as React from "react";
import NextImage from "next/image";
import { ASSETS, type AssetKey } from "@/lib/assets";
import { cx } from "@/components/ui/primitives";

/**
 * One of the supplied images, at its own aspect ratio.
 *
 * A plain <img> keeps the browser URL at /assets/<file>. Width is capped at the
 * file's intrinsic width so small artwork is never blown up; lazy by default,
 * eager only for the hero. Assets marked `optimize` go through next/image so
 * the browser receives a copy sized for the slot, not the multi-megabyte file.
 */
export function AssetImage({
  name,
  alt,
  className,
  maxWidth,
  priority = false,
  rounded = true,
  sizes,
  fit = "contain",
  style,
}: {
  name: AssetKey;
  /** Empty string marks the image decorative. */
  alt: string;
  className?: string;
  maxWidth?: number;
  priority?: boolean;
  rounded?: boolean;
  /** For optimised assets: the rendered width, as a CSS sizes value. */
  sizes?: string;
  /** "cover" fills the given box (the caller sets its aspect ratio). */
  fit?: "contain" | "cover";
  style?: React.CSSProperties;
}) {
  const a: { src: string; w: number; h: number; optimize?: boolean } = ASSETS[name];
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    // A missing file must not leave a broken-image glyph on stage.
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        className={cx("w-full bg-ink-750", rounded && "rounded-2xl", className)}
        style={{ aspectRatio: `${a.w} / ${a.h}`, maxWidth: maxWidth ?? a.w }}
      />
    );
  }
  if (a.optimize) {
    return (
      <NextImage
        src={a.src}
        alt={alt}
        width={a.w}
        height={a.h}
        sizes={sizes ?? `${maxWidth ?? 480}px`}
        priority={priority}
        onError={() => setFailed(true)}
        className={cx(
          "block w-full",
          fit === "cover" ? "h-full object-cover" : "h-auto object-contain",
          rounded && "rounded-2xl",
          className,
        )}
        style={{
          ...(fit === "cover" ? { maxWidth: maxWidth ?? a.w } : { maxWidth: maxWidth ?? a.w, aspectRatio: `${a.w} / ${a.h}` }),
          ...style,
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={a.src}
      alt={alt}
      width={a.w}
      height={a.h}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
      className={cx(
        "block w-full",
        fit === "cover" ? "h-full object-cover" : "h-auto object-contain",
        rounded && "rounded-2xl",
        className,
      )}
      style={{
        ...(fit === "cover" ? {} : { maxWidth: maxWidth ?? a.w, aspectRatio: `${a.w} / ${a.h}` }),
        ...style,
      }}
    />
  );
}
