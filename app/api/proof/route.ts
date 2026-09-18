import { NextResponse } from "next/server";
import { getStore } from "@/lib/store/store";
import { inclusionProofFor } from "@/lib/domain/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const recordId = new URL(request.url).searchParams.get("record_id");
  if (!recordId) {
    return NextResponse.json({ error: "record_id is required" }, { status: 400 });
  }
  const store = await getStore();
  const proof = await inclusionProofFor(store, recordId);
  if (!proof) {
    return NextResponse.json(
      { error: "That record has not reached the server log, so it is not in any tree yet" },
      { status: 404 },
    );
  }
  return NextResponse.json({ proof });
}
