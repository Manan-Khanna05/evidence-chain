import { NextResponse } from "next/server";
import { getStore, toClientStore } from "@/lib/store/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return NextResponse.json({ store: toClientStore(store) });
}
