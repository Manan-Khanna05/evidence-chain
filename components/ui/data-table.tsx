"use client";

import * as React from "react";
import { cx } from "@/components/ui/primitives";

/**
 * The console's table: white body, navy header band, thin dividers, compact
 * rows. Wide tables scroll inside their own frame, never the page.
 */
export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Right-align numbers. */
  align?: "left" | "right" | "center";
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  minWidth = 760,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Screen-reader caption. */
  caption: string;
  empty?: React.ReactNode;
  /** Below this width the table scrolls inside its frame. */
  minWidth?: number;
}) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto rounded-[12px] border border-line">
      <table className="w-full border-collapse text-left text-[13.5px]" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-brand-soft">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cx(
                  "whitespace-nowrap border-b border-line px-4 py-2.5 text-[12.5px] font-semibold text-brand-deep",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-line/70 last:border-b-0 hover:bg-brand-soft/50">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx(
                    "px-4 py-2.5 align-middle text-fg",
                    c.align === "right" && "text-right tabular-nums",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
