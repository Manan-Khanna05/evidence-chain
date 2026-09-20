/**
 * Signing keys for the prototype.
 *
 * HONESTY NOTE — this is a browser/Node prototype, not the Android handheld.
 * The Implementation Plan (Step 7) specifies an Android Keystore / StrongBox
 * key with an attestation certificate chain. A web prototype cannot produce
 * that. What is implemented here is REAL asymmetric cryptography (ECDSA
 * P-256 / SHA-256 via Web Crypto) using a SOFTWARE key, and every surface that
 * shows a signature labels it "DEMO SIGNATURE".
 *
 * The interface below is the one a hardware-backed signer would implement, so
 * the adapter can be swapped without touching the domain layer.
 */

import { fromHex, toHex } from "./hash";

export interface Signer {
  /** Opaque key handle identity, echoed into records. */
  keyId: string;
  sign(message: string): Promise<string>;
}

const ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_ALG = { name: "ECDSA", hash: "SHA-256" } as const;
const enc = new TextEncoder();

export interface ExportedKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export async function generateKeyPair(): Promise<ExportedKeyPair> {
  const pair = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.publicKey),
    crypto.subtle.exportKey("jwk", pair.privateKey),
  ]);
  return { publicKeyJwk, privateKeyJwk };
}

async function importPrivate(jwk: JsonWebKey) {
  return crypto.subtle.importKey("jwk", jwk, ALG, false, ["sign"]);
}

async function importPublic(jwk: JsonWebKey) {
  const pub: JsonWebKey = { ...jwk };
  delete (pub as Record<string, unknown>).d;
  pub.key_ops = ["verify"];
  return crypto.subtle.importKey("jwk", pub, ALG, false, ["verify"]);
}

/** Sign a UTF-8 message; returns lowercase hex of the raw (r‖s) signature. */
export async function signMessage(privateKeyJwk: JsonWebKey, message: string): Promise<string> {
  const key = await importPrivate(privateKeyJwk);
  const sig = await crypto.subtle.sign(SIGN_ALG, key, enc.encode(message) as unknown as BufferSource);
  return toHex(new Uint8Array(sig));
}

export async function verifyMessage(
  publicKeyJwk: JsonWebKey,
  message: string,
  signatureHex: string,
): Promise<boolean> {
  if (!/^[0-9a-f]+$/i.test(signatureHex) || signatureHex.length % 2 !== 0) return false;
  try {
    const key = await importPublic(publicKeyJwk);
    return await crypto.subtle.verify(
      SIGN_ALG,
      key,
      fromHex(signatureHex) as unknown as BufferSource,
      enc.encode(message) as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}

/**
 * The exact bytes a record signature covers.
 *
 * Implementation Plan, Step 2: signature is "over payload_hash + prev_hash +
 * seq, by the hardware-backed key".
 */
export function recordSigningInput(payloadHash: string, prevHash: string | null, seq: number): string {
  return `v1|${payloadHash}|${prevHash ?? "GENESIS"}|${seq}`;
}

/**
 * The bytes a record signature covers once a record also carries its position
 * in its own case chain.
 *
 * v1 covered the device chain only (payload_hash + prev_hash + seq). v2 adds
 * the case reference and the case-chain position, so a record cannot be moved
 * to another case, renumbered inside its case, or re-pointed at a different
 * predecessor without breaking its signature. Records written before this
 * existed keep verifying under v1 — the verifier picks by what the record
 * carries, never by guesswork.
 */
export function recordSigningInputV2(
  payloadHash: string,
  prevHash: string | null,
  seq: number,
  caseRef: string,
  caseSeq: number,
  casePrevHash: string | null,
): string {
  return `v2|${payloadHash}|${prevHash ?? "GENESIS"}|${seq}|${caseRef}|${caseSeq}|${casePrevHash ?? "CASE_GENESIS"}`;
}

/** The bytes a simulated timestamp-authority token covers. */
export function tsaSigningInput(treeHead: string, treeSize: number, anchorTime: string): string {
  return `rfc3161-sim|v1|${treeHead}|${treeSize}|${anchorTime}`;
}
