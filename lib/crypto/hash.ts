/**
 * Deterministic canonicalisation + SHA-256.
 *
 * Implementation Plan, Step 2 (acceptance):
 *   "Canonicalisation is deterministic -- same payload always produces the same
 *    hash, key order irrelevant."
 *
 * Runs identically under Node (route handlers) and in the browser: both expose
 * `crypto.subtle`.
 */

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/**
 * Canonical JSON: object keys sorted lexicographically at every depth, no
 * insignificant whitespace, arrays keep their order (order is semantic).
 * `undefined` members are dropped so an absent optional field and a field set
 * to undefined canonicalise identically.
 */
export function canonicalise(value: unknown): string {
  return JSON.stringify(normalise(value));
}

function normalise(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(normalise);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, Json> = {};
    for (const key of Object.keys(src).sort()) {
      if (src[key] === undefined) continue;
      out[key] = normalise(src[key]);
    }
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value as Json;
}

const enc = new TextEncoder();

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? enc.encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return toHex(new Uint8Array(digest));
}

/** SHA-256 over the canonical form of an object. */
export async function hashCanonical(value: unknown): Promise<string> {
  return sha256Hex(canonicalise(value));
}

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Display helper: 8f2a…c91e */
export function truncateHash(hex: string | null | undefined, head = 6, tail = 4): string {
  if (!hex) return "—";
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}
