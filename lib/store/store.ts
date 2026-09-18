/**
 * Data access layer.
 *
 * HONESTY NOTE — the Implementation Plan (Step 3) targets a Postgres table with
 * an insert-only trigger. This prototype persists to a JSON file so the whole
 * thing runs with `npm run dev` and nothing else installed. Everything above
 * this file talks to the repository interface below, so swapping in Postgres is
 * a change to this one module. Nothing in the UI claims a production database.
 *
 * The append-only property is enforced here in `appendRecord` (records are only
 * ever pushed, never rewritten) — with one deliberate exception, `applyTamper`,
 * which exists so the stage demo can break a stored row exactly the way an
 * administrator with database access would, and let the verifier catch it.
 */

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ClientStore, EvidenceRecord, StoreShape } from "@/lib/domain/types";
import { buildSeed } from "./seed";

/**
 * Where the store lives.
 *
 * Locally that is `.data/` beside the project, which survives restarts. On a
 * serverless host the project directory is read-only, so the file goes to the
 * instance's temp directory instead. That is per-instance and cleared on a cold
 * start — see SERVERLESS_NOTE — so the in-memory cache below, not the file, is
 * the authority while a process is warm.
 */
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), "evidence-chain")
  : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "evidence-store.json");

export const STORAGE_LABEL = IS_SERVERLESS
  ? "Local prototype storage — JSON file in the instance temp directory"
  : "Local prototype storage — JSON file (.data/evidence-store.json)";
export const STORAGE_TARGET = "Production target: PostgreSQL append-only table with an insert-only trigger";

export const SERVERLESS_NOTE = IS_SERVERLESS
  ? "Running on a serverless host: the evidence store is held in memory and mirrored to a temporary file. It re-seeds on a cold start, and separate instances do not share it. Run locally for a persistent store."
  : null;

let cache: StoreShape | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

async function readFromDisk(): Promise<StoreShape | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    return null;
  }
}

/**
 * Best-effort persistence. A read-only filesystem must not lose a mutation that
 * already succeeded in memory, so a failed write is reported and swallowed
 * rather than thrown.
 */
async function writeToDisk(store: StoreShape): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (error) {
    console.warn(
      `[evidence-store] could not persist to ${DATA_FILE}; continuing from memory.`,
      error instanceof Error ? error.message : error,
    );
  }
}

export async function getStore(): Promise<StoreShape> {
  if (cache) return cache;
  const onDisk = await readFromDisk();
  if (onDisk && onDisk.version === 1) {
    cache = onDisk;
    return cache;
  }
  const seeded = await buildSeed();
  cache = seeded;
  await writeToDisk(seeded);
  return seeded;
}

/** Serialised read-modify-write. Every mutation in the app goes through this. */
export async function mutate<T>(fn: (store: StoreShape) => Promise<T> | T): Promise<T> {
  const run = async (): Promise<T> => {
    const store = await getStore();
    const result = await fn(store);
    // Cache first: the mutation has already happened in memory, and persistence
    // is best-effort. Writing first would discard the change on a failed write.
    cache = store;
    await writeToDisk(store);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function resetStore(): Promise<StoreShape> {
  const seeded = await buildSeed();
  cache = seeded;
  await writeToDisk(seeded);
  return seeded;
}

/** Append-only insert. */
export function appendRecord(store: StoreShape, record: EvidenceRecord): EvidenceRecord {
  if (store.records.some((r) => r.record_id === record.record_id)) {
    throw new Error(`Duplicate record rejected: ${record.record_id} already exists in the log`);
  }
  store.records.push(record);
  return record;
}

/** Strip signing keys before anything crosses the wire to the browser. */
export function toClientStore(store: StoreShape): ClientStore {
  return {
    ...store,
    devices: store.devices.map(({ privateKeyJwk: _omit, ...rest }) => rest),
    tamper: store.tamper.map(({ original: _o, ...rest }) => rest),
    tsa_authorities: store.tsa_authorities.map(({ privateKeyJwk: _k, ...rest }) => rest),
  };
}
