/**
 * The verifier — Implementation Plan, Steps 5 and 19.
 *
 * Re-walks the chain from stored data and reports the FIRST broken link by
 * record_id. This runs against the live store, not a fixture, and its result
 * genuinely changes when a record is altered.
 */

import { hashCanonical } from "@/lib/crypto/hash";
import {
  recordSigningInput,
  recordSigningInputV2,
  tsaSigningInput,
  verifyMessage,
} from "@/lib/crypto/keys";
import {
  inclusionProof,
  leafHash,
  merkleRoot,
  verifyConsistency,
  verifyInclusion,
} from "@/lib/crypto/merkle";
import type {
  Anchor,
  Device,
  EvidenceRecord,
  HandoffReceiptPayload,
  HandoffTransferPayload,
  StoreShape,
} from "./types";
import { caseChain, deviceChain, recordHash, serverLog } from "./records";

export type CheckStatus = "pass" | "fail" | "degraded" | "not_applicable";

export interface CheckResult {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
  failures: { record_id: string; reason: string }[];
}

export interface VerificationResult {
  scope: "all" | string;
  verified: boolean;
  degraded: boolean;
  checks: CheckResult[];
  broken_record_id: string | null;
  broken_reason: string | null;
  record_count: number;
  anchored_count: number;
  tree_head: string;
  tree_size: number;
  latest_anchor_time: string | null;
  ran_at: string;
}

const short = (h: string, n = 12) => `${h.slice(0, n)}…`;

/**
 * Verify the log.
 *
 * @param scope "all" or a case_ref. Chain linkage is always evaluated over the
 *   full per-device chain, because a break upstream of a case still breaks it.
 */
export async function verifyStore(
  store: StoreShape,
  scope: "all" | string = "all",
): Promise<VerificationResult> {
  const ran_at = new Date().toISOString();
  const inScope = (r: EvidenceRecord) => scope === "all" || r.case_ref === scope;
  const scoped = store.records.filter(inScope);
  const log = serverLog(store.records);
  const leaves = await Promise.all(log.map(async (r) => leafHash(await recordHash(r))));
  const tree_head = await merkleRoot(leaves);
  const devicesById = new Map(store.devices.map((d) => [d.device_id, d]));

  const checks: CheckResult[] = [];

  // 1 — payload hash ------------------------------------------------------
  const payloadFailures: CheckResult["failures"] = [];
  for (const r of scoped) {
    const recomputed = await hashCanonical(r.payload);
    if (recomputed !== r.payload_hash) {
      payloadFailures.push({
        record_id: r.record_id,
        reason: `Payload hash mismatch — stored ${short(r.payload_hash)}, recomputed ${short(recomputed)}`,
      });
    }
  }
  checks.push({
    id: "payload_hash",
    label: "Payload hash",
    description: "SHA-256 recomputed over the canonicalised payload of every record.",
    status: payloadFailures.length ? "fail" : "pass",
    detail: payloadFailures.length
      ? `${payloadFailures.length} record(s) do not hash to their stored payload_hash`
      : `${scoped.length} payload hash(es) recomputed and matched`,
    failures: payloadFailures,
  });

  // 2 — signature ---------------------------------------------------------
  const sigFailures: CheckResult["failures"] = [];
  for (const r of scoped) {
    const device = devicesById.get(r.device_id);
    if (!device) {
      sigFailures.push({ record_id: r.record_id, reason: `Unknown device ${r.device_id}` });
      continue;
    }
    // A record that carries a case position was signed over it (v2); one
    // written before per-case chaining was signed without it (v1).
    const signedInput =
      r.case_seq === null || r.case_seq === undefined
        ? recordSigningInput(r.payload_hash, r.prev_hash, r.seq)
        : recordSigningInputV2(
            r.payload_hash,
            r.prev_hash,
            r.seq,
            r.case_ref,
            r.case_seq,
            r.case_prev_hash ?? null,
          );
    const valid = await verifyMessage(device.publicKeyJwk, signedInput, r.signature);
    if (!valid) {
      sigFailures.push({
        record_id: r.record_id,
        reason:
          r.case_seq === null || r.case_seq === undefined
            ? `Signature does not verify over payload_hash + prev_hash + seq for key ${r.device_id}`
            : `Signature does not verify over payload_hash + prev_hash + seq + case_ref + case_seq + case_prev_hash for key ${r.device_id}`,
      });
    }
  }
  checks.push({
    id: "signature",
    label: "Record signature",
    description:
      "ECDSA P-256 signature over payload_hash + prev_hash + seq, checked against the device key.",
    status: sigFailures.length ? "fail" : "pass",
    detail: sigFailures.length
      ? `${sigFailures.length} signature(s) failed verification`
      : `${scoped.length} signature(s) verified`,
    failures: sigFailures,
  });

  // 3 — hash-chain linkage (per device, full chain) -----------------------
  const linkFailures: CheckResult["failures"] = [];
  let linkChecked = 0;
  for (const device of store.devices) {
    const chain = deviceChain(store.records, device.device_id);
    let expectedPrev: string | null = null;
    let expectedSeq: number | null = null;
    for (const r of chain) {
      linkChecked += 1;
      if (expectedSeq !== null && r.seq !== expectedSeq && inScope(r)) {
        linkFailures.push({
          record_id: r.record_id,
          reason: `Sequence discontinuity on ${device.device_id} — expected seq ${expectedSeq}, found ${r.seq}`,
        });
      }
      if (r.prev_hash !== expectedPrev && inScope(r)) {
        linkFailures.push({
          record_id: r.record_id,
          reason:
            expectedPrev === null
              ? "Expected a genesis record (prev_hash null) at this position on the device chain"
              : `Hash-chain linkage mismatch — prev_hash ${r.prev_hash ? short(r.prev_hash) : "null"} does not match the preceding record's hash ${short(expectedPrev)}`,
        });
      }
      expectedPrev = await recordHash(r);
      expectedSeq = r.seq + 1;
    }
  }
  checks.push({
    id: "chain_linkage",
    label: "Hash-chain linkage",
    description: "Each record's prev_hash re-derived from the preceding record on the same device.",
    status: linkFailures.length ? "fail" : "pass",
    detail: linkFailures.length
      ? `${linkFailures.length} broken link(s) across ${store.devices.length} device chain(s)`
      : `${linkChecked} record(s) link cleanly across ${store.devices.length} device chain(s)`,
    failures: linkFailures,
  });

  // 3b — case chain (per case, isolated) ---------------------------------
  const caseFailures: CheckResult["failures"] = [];
  const casesInScope =
    scope === "all"
      ? store.cases.map((c) => c.case_ref)
      : store.cases.filter((c) => c.case_ref === scope).map((c) => c.case_ref);
  let caseRecordsChecked = 0;
  let legacyCaseRecords = 0;

  for (const caseRef of casesInScope) {
    const chain = caseChain(store.records, caseRef);
    let expectedSeq = 1;
    let expectedPrev: string | null = null;
    const seen = new Set<number>();

    for (const r of chain) {
      caseRecordsChecked += 1;

      if (r.case_ref !== caseRef) {
        caseFailures.push({
          record_id: r.record_id,
          reason: `Record is filed under ${r.case_ref} but appears in the chain of ${caseRef}`,
        });
        continue;
      }

      if (r.case_seq === null || r.case_seq === undefined) {
        // Written before per-case chaining; the device chain still covers it.
        legacyCaseRecords += 1;
        expectedPrev = await recordHash(r);
        continue;
      }

      if (seen.has(r.case_seq)) {
        caseFailures.push({
          record_id: r.record_id,
          reason: `Duplicate position ${r.case_seq} in ${caseRef} — two records claim the same place in the chain`,
        });
      }
      seen.add(r.case_seq);

      if (r.case_seq !== expectedSeq) {
        caseFailures.push({
          record_id: r.record_id,
          reason:
            r.case_seq > expectedSeq
              ? `Missing record in ${caseRef} — expected position ${expectedSeq}, found ${r.case_seq}. Record${r.case_seq - expectedSeq > 1 ? "s" : ""} ${expectedSeq}${r.case_seq - expectedSeq > 1 ? `–${r.case_seq - 1}` : ""} ${r.case_seq - expectedSeq > 1 ? "are" : "is"} not in the log`
              : `Out-of-order record in ${caseRef} — expected position ${expectedSeq}, found ${r.case_seq}`,
        });
      }

      if ((r.case_prev_hash ?? null) !== expectedPrev) {
        caseFailures.push({
          record_id: r.record_id,
          reason:
            expectedPrev === null
              ? `Integrity failure at position ${r.case_seq} of ${caseRef} — this is the first record of the case, so it must not link to a previous one. Expected: none. Found: ${short(r.case_prev_hash as string)}`
              : `Integrity failure at position ${r.case_seq} of ${caseRef} — expected prev_hash ${short(expectedPrev)}, found ${r.case_prev_hash ? short(r.case_prev_hash) : "none"}`,
        });
      }

      expectedPrev = await recordHash(r);
      expectedSeq = r.case_seq + 1;
    }
  }

  checks.push({
    id: "case_chain",
    label: "Case chain",
    description:
      "Each case counted from 1 on its own, with every record linked to the previous record of the SAME case.",
    status: caseFailures.length ? "fail" : "pass",
    detail: caseFailures.length
      ? `${caseFailures.length} problem(s) across ${casesInScope.length} case chain(s)`
      : `${caseRecordsChecked} record(s) link cleanly across ${casesInScope.length} case chain(s)${
          legacyCaseRecords ? ` (${legacyCaseRecords} predate per-case chaining)` : ""
        }`,
    failures: caseFailures,
  });

  // 4 — Merkle inclusion --------------------------------------------------
  const inclusionFailures: CheckResult["failures"] = [];
  const anchoredScoped = scoped.filter((r) => r.status === "anchored" && r.anchor_id);
  const anchorsById = new Map(store.anchors.map((a) => [a.anchor_id, a]));
  for (const r of anchoredScoped) {
    const anchor = anchorsById.get(r.anchor_id as string);
    if (!anchor) {
      inclusionFailures.push({
        record_id: r.record_id,
        reason: "The anchor referenced by this record is missing from the store",
      });
      continue;
    }
    const idx = log.findIndex((x) => x.record_id === r.record_id);
    if (idx < 0 || idx >= anchor.tree_size) {
      inclusionFailures.push({
        record_id: r.record_id,
        reason: "Record is not inside the tree that was anchored",
      });
      continue;
    }
    const proof = await inclusionProof(leaves.slice(0, anchor.tree_size), idx);
    if (!(await verifyInclusion(proof, anchor.tree_head))) {
      inclusionFailures.push({
        record_id: r.record_id,
        reason: `Merkle inclusion proof fails against the anchored tree head ${short(anchor.tree_head)}`,
      });
    }
  }
  checks.push({
    id: "merkle_inclusion",
    label: "Merkle inclusion",
    description: "Every anchored record proves membership of the tree head that was timestamped.",
    status: inclusionFailures.length ? "fail" : anchoredScoped.length ? "pass" : "not_applicable",
    detail: inclusionFailures.length
      ? `${inclusionFailures.length} inclusion proof(s) failed`
      : anchoredScoped.length
        ? `${anchoredScoped.length} inclusion proof(s) verified`
        : "No anchored records in scope",
    failures: inclusionFailures,
  });

  // 5 — Merkle consistency ------------------------------------------------
  const consistencyFailures: CheckResult["failures"] = [];
  // When a single case is in scope, only the anchors that actually cover one of
  // its records are its concern.
  const scopedRecordIds = new Set(scoped.map((r) => r.record_id));
  const relevantAnchors =
    scope === "all"
      ? store.anchors
      : store.anchors.filter((a) => a.record_ids.some((id) => scopedRecordIds.has(id)));
  for (const anchor of relevantAnchors) {
    if (!(await verifyConsistency(leaves, anchor.tree_size, anchor.tree_head))) {
      consistencyFailures.push({
        record_id: anchor.anchor_id,
        reason: `The tree of size ${anchor.tree_size} is no longer a prefix of the current log — anchored head ${short(anchor.tree_head)} cannot be reproduced`,
      });
    }
  }
  checks.push({
    id: "merkle_consistency",
    label: "Merkle consistency",
    description: "Each anchored tree is still an append-only prefix of the current log.",
    status: consistencyFailures.length ? "fail" : relevantAnchors.length ? "pass" : "not_applicable",
    detail: consistencyFailures.length
      ? `${consistencyFailures.length} anchored tree head(s) can no longer be reproduced`
      : relevantAnchors.length
        ? `${relevantAnchors.length} anchored tree head(s) reproduced from the current log`
        : "No anchors in scope yet",
    failures: consistencyFailures,
  });

  // 6 — timestamp authorities ---------------------------------------------
  const tsaFailures: CheckResult["failures"] = [];
  let degradedAnchors = 0;
  for (const anchor of store.anchors) {
    let verifiedCount = 0;
    for (const token of anchor.tsa) {
      if (token.status === "unavailable") continue;
      if (!token.publicKeyJwk || !token.token_signature || !token.anchor_time) {
        tsaFailures.push({
          record_id: anchor.anchor_id,
          reason: `${token.tsa_name} token is incomplete`,
        });
        continue;
      }
      const valid = await verifyMessage(
        token.publicKeyJwk,
        tsaSigningInput(anchor.tree_head, anchor.tree_size, token.anchor_time),
        token.token_signature,
      );
      if (valid) verifiedCount += 1;
      else
        tsaFailures.push({
          record_id: anchor.anchor_id,
          reason: `${token.tsa_name} token signature does not verify over the anchored tree head`,
        });
    }
    if (verifiedCount === 1) degradedAnchors += 1;
    if (verifiedCount === 0)
      tsaFailures.push({
        record_id: anchor.anchor_id,
        reason: "No timestamp authority token verified for this anchor",
      });
  }
  checks.push({
    id: "tsa_anchor",
    label: "Timestamp anchor",
    description:
      "Both simulated RFC 3161 authorities' tokens verified over the anchored tree head.",
    status: tsaFailures.length
      ? "fail"
      : degradedAnchors
        ? "degraded"
        : store.anchors.length
          ? "pass"
          : "not_applicable",
    detail: tsaFailures.length
      ? `${tsaFailures.length} anchor token failure(s)`
      : degradedAnchors
        ? `${degradedAnchors} anchor(s) carry a single authority — degraded, not broken`
        : store.anchors.length
          ? `${store.anchors.length} anchor(s) carry two independent authority tokens`
          : "No anchors yet",
    failures: tsaFailures,
  });

  // 7 — two-party handoff --------------------------------------------------
  const handoffFailures: CheckResult["failures"] = [];
  const scopedHandoffs = store.handoffs.filter((h) => scope === "all" || h.case_ref === scope);
  let handoffChecked = 0;
  for (const h of scopedHandoffs) {
    const transfer = store.records.find((r) => r.record_id === h.transfer_record_id);
    const receipt = store.records.find((r) => r.record_id === h.receipt_record_id);
    if (!transfer) {
      if (h.receipt_record_id)
        handoffFailures.push({
          record_id: h.receipt_record_id,
          reason: "A receipt exists without a transfer record",
        });
      continue;
    }
    if (!receipt) continue; // awaiting a receipt is a state, not a failure
    handoffChecked += 1;
    const tp = transfer.payload as HandoffTransferPayload;
    const rp = receipt.payload as HandoffReceiptPayload;
    if (rp.transfer_record_id !== transfer.record_id)
      handoffFailures.push({
        record_id: receipt.record_id,
        reason: "Receipt does not reference the transfer record",
      });
    if (tp.sample_count !== rp.sample_count)
      handoffFailures.push({
        record_id: receipt.record_id,
        reason: `Transfer mismatch — ${tp.sample_count} sample(s) transferred, ${rp.sample_count} receipted`,
      });
    if (tp.seal_state !== rp.seal_state)
      handoffFailures.push({
        record_id: receipt.record_id,
        reason: `Transfer mismatch — seal state "${tp.seal_state}" transferred, "${rp.seal_state}" receipted`,
      });
    if (transfer.device_id === receipt.device_id)
      handoffFailures.push({
        record_id: receipt.record_id,
        reason: "Both sides signed with the same device key — the two-party property is not satisfied",
      });
  }
  checks.push({
    id: "handoff",
    label: "Handoff signatures",
    description:
      "Transfer and receipt independently signed, with sample count and seal state carried across.",
    status: handoffFailures.length ? "fail" : handoffChecked ? "pass" : "not_applicable",
    detail: handoffFailures.length
      ? `${handoffFailures.length} handoff failure(s)`
      : handoffChecked
        ? `${handoffChecked} two-party handoff(s) verified`
        : "No completed handoff in scope",
    failures: handoffFailures,
  });

  const firstFailure = checks.find((c) => c.status === "fail" && c.failures.length);
  const verified = !checks.some((c) => c.status === "fail");
  const degraded = checks.some((c) => c.status === "degraded");
  const latestAnchor: Anchor | undefined = store.anchors[store.anchors.length - 1];

  return {
    scope,
    verified,
    degraded,
    checks,
    broken_record_id: firstFailure ? firstFailure.failures[0].record_id : null,
    broken_reason: firstFailure ? firstFailure.failures[0].reason : null,
    record_count: scoped.length,
    anchored_count: scoped.filter((r) => r.status === "anchored").length,
    tree_head,
    tree_size: log.length,
    latest_anchor_time: latestAnchor ? latestAnchor.anchor_time : null,
    ran_at,
  };
}

/** Inclusion proof for one record — backs the "Generate inclusion proof" control. */
export async function inclusionProofFor(store: StoreShape, recordId: string) {
  const log = serverLog(store.records);
  const idx = log.findIndex((r) => r.record_id === recordId);
  if (idx < 0) return null;
  const record = log[idx];
  const anchor = store.anchors.find((a) => a.anchor_id === record.anchor_id);
  const leaves = await Promise.all(log.map(async (r) => leafHash(await recordHash(r))));
  const size = anchor ? anchor.tree_size : leaves.length;
  const subset = leaves.slice(0, size);
  const proof = await inclusionProof(subset, idx);
  const root = anchor ? anchor.tree_head : await merkleRoot(subset);
  const verified = await verifyInclusion(proof, root);
  return {
    record_id: recordId,
    proof,
    root,
    verified,
    anchored: Boolean(anchor),
    anchor_id: anchor?.anchor_id ?? null,
  };
}

export function findDevice(devices: Device[], id: string): Device | undefined {
  return devices.find((d) => d.device_id === id);
}
