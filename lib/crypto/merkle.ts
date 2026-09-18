/**
 * Merkle history tree over the append-only log.
 *
 * Implementation Plan, Step 4: inclusion proofs ("this record is in the log")
 * and consistency proofs ("this log is an append-only extension of an earlier
 * version"). Domain-separated leaf/node hashing follows RFC 6962 so a leaf
 * hash can never be replayed as an interior node.
 */

import { sha256Hex } from "./hash";

export const LEAF_PREFIX = "00";
export const NODE_PREFIX = "01";

export async function leafHash(data: string): Promise<string> {
  return sha256Hex(`${LEAF_PREFIX}:${data}`);
}

export async function nodeHash(left: string, right: string): Promise<string> {
  return sha256Hex(`${NODE_PREFIX}:${left}:${right}`);
}

/** Root of a tree over the given leaf hashes. Empty tree -> SHA-256(""). */
export async function merkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return sha256Hex("");
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) next.push(await nodeHash(level[i], level[i + 1]));
      else next.push(level[i]); // odd node is promoted, RFC 6962 style
    }
    level = next;
  }
  return level[0];
}

export interface InclusionProof {
  index: number;
  treeSize: number;
  leafHash: string;
  /** Sibling hashes bottom-up, with the side they sit on. */
  path: { hash: string; side: "left" | "right" }[];
}

export async function inclusionProof(leaves: string[], index: number): Promise<InclusionProof> {
  const path: { hash: string; side: "left" | "right" }[] = [];
  let level = [...leaves];
  let idx = index;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        if (i === idx) path.push({ hash: level[i + 1], side: "right" });
        else if (i + 1 === idx) path.push({ hash: level[i], side: "left" });
        next.push(await nodeHash(level[i], level[i + 1]));
      } else {
        next.push(level[i]);
      }
    }
    idx = Math.floor(idx / 2);
    level = next;
  }
  return { index, treeSize: leaves.length, leafHash: leaves[index], path };
}

export async function verifyInclusion(proof: InclusionProof, root: string): Promise<boolean> {
  let acc = proof.leafHash;
  for (const step of proof.path) {
    acc = step.side === "right" ? await nodeHash(acc, step.hash) : await nodeHash(step.hash, acc);
  }
  return acc === root;
}

/**
 * Consistency between an older tree of size `oldSize` and the current leaves.
 *
 * At this prototype's scale the honest and inspectable construction is to
 * recompute the old root from the first `oldSize` leaves and compare it with
 * the root recorded at that time. That is exactly the property a consistency
 * proof asserts — the old tree is a prefix of the new one — computed directly
 * rather than compressed.
 */
export async function verifyConsistency(
  leaves: string[],
  oldSize: number,
  oldRoot: string,
): Promise<boolean> {
  if (oldSize === 0) return true;
  if (oldSize > leaves.length) return false;
  const recomputed = await merkleRoot(leaves.slice(0, oldSize));
  return recomputed === oldRoot;
}
