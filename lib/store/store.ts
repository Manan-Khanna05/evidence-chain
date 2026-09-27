/**
 * Data access layer.
 *
 * With DATABASE_URL set, the store lives in a shared Postgres database (see
 * db.ts) and every device syncs through it; each record is also copied into an
 * append-only ledger table guarded by an insert-only trigger. Without it, the
 * store is a local JSON file so `npm run dev` needs nothing else installed.
 * The UI states which of the two is in use.
 *
 * The append-only property is enforced here in `appendRecord` (records are only
 * ever pushed, never rewritten) — with one deliberate exception, `applyTamper`,
 * which exists so the stage demo can break a stored row exactly the way an
 * administrator with database access would, and let the verifier catch it.
 */

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AuditEvent, ClientStore, EvidenceRecord, StoreShape } from "@/lib/domain/types";
import { buildSeed } from "./seed";
import { DATABASE_URL, dbLoad, dbRevision, dbSave } from "./db";

/**
 * Where the store lives, in order of preference:
 *
 *   postgres  DATABASE_URL / POSTGRES_URL is set (Neon on Vercel). Shared by
 *             every server instance and every device — the synced mode.
 *   file      local development: `.data/evidence-store.json`, survives restarts.
 *   memory    a serverless host with no database: per-instance and reset on a
 *             cold start. Labelled as such rather than pretending to persist.
 */
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
export const BACKEND: "postgres" | "file" | "memory" = DATABASE_URL
  ? "postgres"
  : IS_SERVERLESS
    ? "memory"
    : "file";

const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), "evidence-chain")
  : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "evidence-store.json");

export const STORAGE_LABEL =
  BACKEND === "postgres"
    ? "Shared Postgres database (Neon) — every device sees the same store"
    : BACKEND === "memory"
      ? "Local prototype storage — in memory on this server instance"
      : "Local prototype storage — JSON file (.data/evidence-store.json)";
export const STORAGE_TARGET = "Production target: PostgreSQL append-only table with an insert-only trigger";

export const SERVERLESS_NOTE =
  BACKEND === "memory"
    ? "Running on a serverless host without a database: the evidence store is held in memory. It re-seeds on a cold start, and separate instances do not share it. Set DATABASE_URL to share it."
    : null;

/** What the browser is told about storage, so the honesty strip is accurate. */
export function storageInfo() {
  return {
    backend: BACKEND,
    label: BACKEND === "postgres" ? "Shared Database" : "Local Prototype Storage",
    detail: STORAGE_LABEL,
  };
}

/* ------------------------------------------------------ file / memory */

let cache: StoreShape | null = null;
/** Local revision counter, so clients can poll for changes in every mode. */
let localRevision = 1;
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

async function localGet(): Promise<StoreShape> {
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

/* ----------------------------------------------------------- postgres */

/** Load the shared store, seeding it once if the database is empty. */
async function remoteGet(): Promise<{ store: StoreShape; revision: number }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { revision, data } = await dbLoad();
    if (data && data.version === 1) return { store: data, revision };
    const seeded = await buildSeed();
    const next = await dbSave(revision, seeded);
    if (next !== null) return { store: seeded, revision: next };
    // Another instance seeded first — read theirs.
  }
  throw new Error("The shared evidence store could not be initialised");
}

const MAX_ATTEMPTS = 8;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------- public */

export async function getStore(): Promise<StoreShape> {
  if (BACKEND === "postgres") return (await remoteGet()).store;
  return localGet();
}

/** The store plus its revision, for change polling. */
export async function getStoreWithRevision(): Promise<{ store: StoreShape; revision: number }> {
  if (BACKEND === "postgres") return remoteGet();
  return { store: await localGet(), revision: localRevision };
}

export async function getRevision(): Promise<number> {
  if (BACKEND === "postgres") return dbRevision();
  await localGet();
  return localRevision;
}

/**
 * Serialised read-modify-write. Every mutation in the app goes through this.
 *
 * Against Postgres, `fn` runs on a fresh copy and the write only lands if no
 * other device wrote in between; otherwise it re-reads and runs again. `fn`
 * must therefore depend only on the store it is given — which every action does.
 */
export async function mutate<T>(fn: (store: StoreShape) => Promise<T> | T): Promise<T> {
  const run = async (): Promise<T> => {
    if (BACKEND === "postgres") {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const { store, revision } = await remoteGet();
        const result = await fn(store);
        const next = await dbSave(revision, store);
        if (next !== null) return result;
        await pause(40 + Math.random() * 120 * (attempt + 1));
      }
      throw new Error("The evidence store is busy. Please try again in a moment.");
    }
    const store = await localGet();
    const result = await fn(store);
    // Cache first: the mutation has already happened in memory, and persistence
    // is best-effort. Writing first would discard the change on a failed write.
    cache = store;
    localRevision += 1;
    await writeToDisk(store);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function resetStore(): Promise<StoreShape> {
  const seeded = await buildSeed();
  if (BACKEND === "postgres") {
    await mutate((store) => {
      // Replace the whole document in place so mutate's write carries it.
      for (const k of Object.keys(store)) delete (store as unknown as Record<string, unknown>)[k];
      Object.assign(store, seeded);
    });
    return seeded;
  }
  cache = seeded;
  localRevision += 1;
  await writeToDisk(seeded);
  return seeded;
}

/** Raised when a write would corrupt a chain. Never repaired silently. */
export class ChainSafetyError extends Error {}

/**
 * Append-only insert, with the checks that make the chains trustworthy.
 *
 * Nothing in the application updates or deletes a record; this is the single
 * door through which a record enters the log, and it refuses anything that
 * would duplicate an identifier, reuse a position in a case or on a device, or
 * attach a record to a case that does not exist.
 */
export function appendRecord(store: StoreShape, record: EvidenceRecord): EvidenceRecord {
  if (store.records.some((r) => r.record_id === record.record_id)) {
    throw new ChainSafetyError(
      `CHAIN SAFETY CHECK FAILED — record ${record.record_id} already exists in the log.`,
    );
  }
  if (!store.cases.some((c) => c.case_ref === record.case_ref)) {
    throw new ChainSafetyError(
      `CHAIN SAFETY CHECK FAILED — no case ${record.case_ref} exists.`,
    );
  }
  if (record.case_seq != null) {
    const clash = store.records.find(
      (r) => r.case_ref === record.case_ref && r.case_seq === record.case_seq,
    );
    if (clash) {
      throw new ChainSafetyError(
        `CHAIN SAFETY CHECK FAILED — sequence conflict: ${record.case_ref} already has a record at position ${record.case_seq} (${clash.record_id}).`,
      );
    }
  }
  const deviceClash = store.records.find(
    (r) => r.device_id === record.device_id && r.seq === record.seq,
  );
  if (deviceClash) {
    throw new ChainSafetyError(
      `CHAIN SAFETY CHECK FAILED — device ${record.device_id} already has a record at sequence ${record.seq} (${deviceClash.record_id}).`,
    );
  }
  store.records.push(record);
  return record;
}

/** How many audit events are kept. Old ones fall off the end. */
const AUDIT_LIMIT = 200;

/**
 * Record that the application did something.
 *
 * Deliberately separate from `appendRecord`: an audit event is not evidence,
 * carries no signature, and can never enter a case chain.
 */
export function appendAudit(
  store: StoreShape,
  event: Omit<AuditEvent, "audit_id" | "at">,
): AuditEvent {
  const entry: AuditEvent = {
    ...event,
    audit_id: `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
  };
  const log = store.audit ?? [];
  log.push(entry);
  store.audit = log.slice(-AUDIT_LIMIT);
  return entry;
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
