import { NextResponse } from "next/server";
import { getRevision, getStoreWithRevision, storageInfo, toClientStore } from "@/lib/store/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/state            → the full client store, its revision and storage info
 * GET /api/state?since=<n>  → { unchanged: true } when nothing changed since n,
 *                             so devices can poll cheaply and pull only on change.
 */
export async function GET(req: Request) {
  try {
    const since = new URL(req.url).searchParams.get("since");
    if (since !== null) {
      const revision = await getRevision();
      if (String(revision) === since) {
        return NextResponse.json({ unchanged: true, revision });
      }
    }
    const { store, revision } = await getStoreWithRevision();
    return NextResponse.json({ store: toClientStore(store), revision, storage: storageInfo() });
  } catch (error) {
    console.error("[api/state]", error);
    return NextResponse.json(
      { error: "The evidence store is not reachable right now." },
      { status: 503 },
    );
  }
}
