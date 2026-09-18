"use client";

import * as React from "react";
import { ASSETS, type AssetKey } from "@/lib/assets";
import { cx } from "@/components/ui/primitives";

/**
 * One of the supplied images, at its own aspect ratio.
 *
 * A plain <img> keeps the browser URL at /assets/<file>. Width is capped at the
 * file's intrinsic width so small artwork is never blown up; lazy by default,
 * eager only for the hero.
 */
export function AssetImage({
  name,
  alt,
  className,
  maxWidth,
  priority = false,
  rounded = true,
}: {
  name: AssetKey;
  /** Empty string marks the image decorative. */
  alt: string;
  className?: string;
  maxWidth?: number;
  priority?: boolean;
  rounded?: boolean;
}) {
  const a = ASSETS[name];
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
      className={cx("block h-auto w-full object-contain", rounded && "rounded-2xl", className)}
      style={{ maxWidth: maxWidth ?? a.w, aspectRatio: `${a.w} / ${a.h}` }}
    />
  );
}
