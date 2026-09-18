import { NextResponse } from "next/server";
import { getStore } from "@/lib/store/store";
import { verifyStore } from "@/lib/domain/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface CaseVerdict {
  case_ref: string;
  verified: boolean;
  degraded: boolean;
  broken_record_id: string | null;
  broken_reason: string | null;
  failed_checks: string[];
}

/**
 * GET /api/verify?scope=all|CASE-REF
 *
 * `?cases=1` additionally returns a per-case verdict for each case, which is
 * what the dashboard shows: one altered record makes the whole log fail, and
 * the dashboard needs to name which case it belongs to.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const scope = params.get("scope") ?? "all";
  const wantCases = params.get("cases") === "1";

  const store = await getStore();
  const result = await verifyStore(store, scope);

  let cases: CaseVerdict[] | undefined;
  if (wantCases) {
    cases = [];
    for (const c of store.cases) {
      const r = await verifyStore(store, c.case_ref);
      cases.push({
        case_ref: c.case_ref,
        verified: r.verified,
        degraded: r.degraded,
        broken_record_id: r.broken_record_id,
        broken_reason: r.broken_reason,
        failed_checks: r.checks.filter((x) => x.status === "fail").map((x) => x.label),
      });
    }
  }

  return NextResponse.json({ result, cases });
}
