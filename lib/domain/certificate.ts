/**
 * Section 63 Schedule certificate — Implementation Plan, Step 18.
 *
 * Evidence report §6A: the operative text of s.63 BSA never uses the word
 * "hash". The hash requirement lives in the Schedule certificate incorporated
 * by s.63(4)(c), where Part A (person in charge) and Part B (expert) each carry
 * the line "I state that the HASH value/s of the electronic/digital record/s is
 * ______, obtained through the following algorithm:— SHA1 / SHA256 / MD5 /
 * Other". Part A additionally demands device type, make and model, serial
 * number, and IMEI/UIN/UID/MAC/Cloud ID as applicable.
 *
 * Two rules from the report are enforced here:
 *   - SHA-256 always. NIST SP 800-86 bars MD5; the Schedule still offers the
 *     checkbox and we do not tick it.
 *   - Part B is left blank. The system is not the expert and does not sign as
 *     one (report §6C: who may sign Part B is formally open).
 */

import { hashCanonical } from "@/lib/crypto/hash";
import { recordHash, recordsForCase, serverLog } from "./records";
import { leafHash, merkleRoot } from "@/lib/crypto/merkle";
import type { Certificate, StoreShape } from "./types";

export interface CertificateSubject {
  case_ref: string;
  algorithm: "SHA-256";
  record_ids: string[];
  record_hashes: string[];
  tree_head: string;
  anchor_id: string | null;
}

/**
 * The canonical subject a certificate's hash value is taken over: the record
 * hashes of the case, plus the anchored tree head they sit inside.
 */
export async function certificateSubject(
  store: StoreShape,
  caseRef: string,
): Promise<CertificateSubject> {
  const records = recordsForCase(store.records, caseRef).filter(
    (r) => r.status === "pushed" || r.status === "anchored",
  );
  const record_hashes = await Promise.all(records.map((r) => recordHash(r)));
  const anchored = records.filter((r) => r.anchor_id);
  const anchorId = anchored.length ? anchored[anchored.length - 1].anchor_id : null;
  const anchor = store.anchors.find((a) => a.anchor_id === anchorId);
  let tree_head: string;
  if (anchor) {
    tree_head = anchor.tree_head;
  } else {
    const log = serverLog(store.records);
    const leaves = await Promise.all(log.map(async (r) => leafHash(await recordHash(r))));
    tree_head = await merkleRoot(leaves);
  }
  return {
    case_ref: caseRef,
    algorithm: "SHA-256",
    record_ids: records.map((r) => r.record_id),
    record_hashes,
    tree_head,
    anchor_id: anchorId,
  };
}

export async function certificateHash(store: StoreShape, caseRef: string): Promise<string> {
  return hashCanonical(await certificateSubject(store, caseRef));
}

export async function buildCertificate(
  store: StoreShape,
  caseRef: string,
  signatoryOfficerId: string,
  generatedAt: string = new Date().toISOString(),
): Promise<Certificate> {
  const subject = await certificateSubject(store, caseRef);
  const hash = await hashCanonical(subject);
  const seq = store.certificates.length + 1;
  return {
    certificate_id: `CERT-2026-${String(seq).padStart(4, "0")}`,
    case_ref: caseRef,
    hash,
    algorithm: "SHA-256",
    generated_at: generatedAt,
    record_ids: subject.record_ids,
    tree_head: subject.tree_head,
    anchor_id: subject.anchor_id,
    part_a_signatory_officer_id: signatoryOfficerId,
    part_b_expert_name: null,
    verification_status: "unknown",
  };
}

/**
 * Recompute the certificate hash from the records as they stand now and
 * compare. This is what makes "Verify certificate hash" a real check: after a
 * record is altered, the stored certificate hash no longer matches.
 */
export async function verifyCertificateHash(store: StoreShape, certificate: Certificate) {
  const recomputed = await certificateHash(store, certificate.case_ref);
  return {
    matches: recomputed === certificate.hash,
    stored: certificate.hash,
    recomputed,
    algorithm: certificate.algorithm,
  };
}
