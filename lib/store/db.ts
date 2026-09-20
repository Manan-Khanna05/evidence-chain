/**
 * Shared Postgres backend for the evidence store.
 *
 * Used whenever DATABASE_URL (or POSTGRES_URL) is set — on Vercel that comes
 * from the Neon integration. Every server instance, and so every phone and
 * laptop, then reads and writes the same store.
 *
 * Two tables:
 *   ec_state         one row holding the whole store document plus a revision
 *                    number. Writes use optimistic concurrency: a write only
 *                    lands if nobody else wrote since it read.
 *   evidence_ledger  the first version of every record the server ever saw.
 *                    A trigger rejects UPDATE, DELETE and TRUNCATE, so it is
 *                    append-only at the database level — the Implementation
 *                    Plan's "insert-only trigger" target. The tamper demo edits
 *                    the store document, never this table, so the original
 *                    signed values always survive here.
 */

import postgres from "postgres";
import type { StoreShape } from "@/lib/domain/types";

export const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

type Sql = ReturnType<typeof postgres>;

let client: Sql | null = null;
let schemaReady: Promise<void> | null = null;

function sql(): Sql {
  if (!client) {
    client = postgres(DATABASE_URL, {
      // Serverless: one connection per instance, closed quickly when idle.
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      // Pooled endpoints (Neon "-pooler", Supabase :6543) cannot use prepared statements.
      prepare: false,
      onnotice: () => undefined,
    });
  }
  return client;
}

const SCHEMA = `
create table if not exists ec_state (
  id smallint primary key default 1 check (id = 1),
  revision integer not null default 0,
  data jsonb,
  updated_at timestamptz not null default now()
);
insert into ec_state (id, revision, data) values (1, 0, null) on conflict (id) do nothing;

create table if not exists evidence_ledger (
  record_id text primary key,
  device_id text not null,
  case_ref text not null,
  record_type text not null,
  seq integer not null,
  prev_hash text,
  payload_hash text not null,
  signature text not null,
  first_seen_at timestamptz not null default now()
);

create or replace function ec_ledger_insert_only() returns trigger language plpgsql as $$
begin
  raise exception 'evidence_ledger is append-only: % is not permitted', tg_op;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'evidence_ledger_no_update') then
    create trigger evidence_ledger_no_update before update or delete on evidence_ledger
      for each row execute function ec_ledger_insert_only();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'evidence_ledger_no_truncate') then
    create trigger evidence_ledger_no_truncate before truncate on evidence_ledger
      for each statement execute function ec_ledger_insert_only();
  end if;
end $$;
`;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql()
      .unsafe(SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null; // retry on the next request
        throw error;
      });
  }
  return schemaReady;
}

export interface Loaded {
  revision: number;
  data: StoreShape | null;
}

export async function dbLoad(): Promise<Loaded> {
  await ensureSchema();
  const rows = await sql()<{ revision: number; data: StoreShape | null }[]>`
    select revision, data from ec_state where id = 1`;
  return rows[0] ?? { revision: 0, data: null };
}

export async function dbRevision(): Promise<number> {
  await ensureSchema();
  const rows = await sql()<{ revision: number }[]>`select revision from ec_state where id = 1`;
  return rows[0]?.revision ?? 0;
}

/**
 * Write the store if the revision is still `expected`. Returns the new
 * revision, or null if another writer got there first. The ledger insert runs
 * in the same statement, so it only happens when the write does.
 */
export async function dbSave(expected: number, data: StoreShape): Promise<number | null> {
  await ensureSchema();
  const json = sql().json(data as unknown as Parameters<Sql["json"]>[0]);
  const rows = await sql()<{ revision: number }[]>`
    with upd as (
      update ec_state
         set data = ${json}, revision = revision + 1, updated_at = now()
       where id = 1 and revision = ${expected}
      returning revision
    ),
    ins as (
      insert into evidence_ledger
        (record_id, device_id, case_ref, record_type, seq, prev_hash, payload_hash, signature)
      select r->>'record_id', r->>'device_id', r->>'case_ref', r->>'type', (r->>'seq')::int,
             r->>'prev_hash', r->>'payload_hash', r->>'signature'
        from jsonb_array_elements(coalesce(${json}::jsonb -> 'records', '[]'::jsonb)) r
       where exists (select 1 from upd)
      on conflict (record_id) do nothing
    )
    select revision from upd`;
  return rows[0]?.revision ?? null;
}

export async function dbLedgerCount(): Promise<number> {
  await ensureSchema();
  const rows = await sql()<{ n: number }[]>`select count(*)::int as n from evidence_ledger`;
  return rows[0]?.n ?? 0;
}
