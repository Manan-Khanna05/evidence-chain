import { NextResponse } from "next/server";
import { getStore, getStoreWithRevision, mutate, resetStore, toClientStore } from "@/lib/store/store";
import {
  WorkflowError,
  anchorTree,
  applyTamper,
  captureFieldTest,
  captureTrigger,
  captureScreeningFlag,
  createCase,
  createTransfer,
  generateCertificate,
  pushQueue,
  restoreTamper,
  signReceipt,
} from "@/lib/server/actions";
import { verifyCertificateHash } from "@/lib/domain/certificate";
import { sensorAdapter } from "@/lib/sensor/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { action: string; payload?: Record<string, unknown> };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }
  const p = (body.payload ?? {}) as Record<string, never>;

  try {
    let result: unknown = null;

    switch (body.action) {
      /* ------------------------------------------------------ connectivity */
      case "connectivity.set": {
        const online = Boolean((p as Record<string, unknown>).online);
        result = await mutate((store) => {
          store.connectivity = {
            online,
            changed_at: new Date().toISOString(),
            label: online ? "Connected" : "Aeroplane mode — capture continues locally",
          };
          return store.connectivity;
        });
        break;
      }

      /* -------------------------------------------------------------- case */
      case "case.create": {
        result = await mutate((store) =>
          createCase(store, {
            officer_id: (p as Record<string, string>).officer_id,
            device_id: (p as Record<string, string>).device_id,
            place: (p as Record<string, string>).place,
            place_kind: (p as Record<string, string | undefined>).place_kind,
            purpose: (p as Record<string, string | undefined>).purpose,
            notes: (p as Record<string, string | undefined>).notes,
          }),
        );
        break;
      }

      /* --------------------------------------------------------- screening */
      case "screening.flag": {
        result = await mutate((store) =>
          captureScreeningFlag(store, {
            operator_id: (p as Record<string, string>).operator_id,
            device_id: (p as Record<string, string>).device_id,
            screening_node_id: (p as Record<string, string>).screening_node_id,
            train_id: (p as Record<string, string>).train_id,
            coach: (p as Record<string, string>).coach,
            seat: (p as Record<string, string>).seat,
            cue_type: (p as Record<string, never>).cue_type,
            cue_note: (p as Record<string, string>).cue_note ?? "",
            access_class: (p as Record<string, never>).access_class,
            case_ref: (p as Record<string, string | null>).case_ref ?? null,
          }),
        );
        break;
      }

      /* ----------------------------------------------------------- capture */
      case "capture.trigger": {
        result = await mutate(async (store) => {
          const reading = sensorAdapter.read(store.sensor_cursor);
          const record = await captureTrigger(store, {
            case_ref: (p as Record<string, string | null>).case_ref ?? null,
            device_id: (p as Record<string, string>).device_id,
            officer_id: (p as Record<string, string>).officer_id,
            place: (p as Record<string, string>).place,
            place_kind: (p as Record<string, string>).place_kind,
            train_or_location_ref: (p as Record<string, string>).train_or_location_ref ?? "",
            officer_action: (p as Record<string, "searched" | "not_searched">).officer_action,
            search_outcome: (p as Record<string, "material_recovered" | "nothing_recovered" | "not_applicable">)
              .search_outcome,
            grounds_note: (p as Record<string, string>).grounds_note ?? "",
            sensor: ((p as Record<string, unknown>).sensor as typeof reading) ?? reading,
          });
          return record;
        });
        break;
      }

      case "capture.field_test": {
        result = await mutate((store) =>
          captureFieldTest(store, {
            case_ref: (p as Record<string, string>).case_ref,
            device_id: (p as Record<string, string>).device_id,
            officer_id: (p as Record<string, string>).officer_id,
            kit_type: (p as Record<string, string>).kit_type,
            manufacturer: (p as Record<string, string>).manufacturer,
            lot_number: (p as Record<string, string>).lot_number,
            expiry_date: (p as Record<string, string>).expiry_date,
            observed_colour: (p as Record<string, string>).observed_colour,
            reference_table: (p as Record<string, string>).reference_table,
            ambient_temperature_c:
              (p as Record<string, number | null>).ambient_temperature_c ?? null,
            result_status: (p as Record<string, "presumptive_positive" | "presumptive_negative" | "inconclusive">)
              .result_status,
            hardware: (p as Record<string, unknown>).hardware as never,
          }),
        );
        break;
      }

      /* ----------------------------------------------------------- handoff */
      case "handoff.transfer": {
        result = await mutate((store) =>
          createTransfer(store, {
            case_ref: (p as Record<string, string>).case_ref,
            device_id: (p as Record<string, string>).device_id,
            officer_id: (p as Record<string, string>).officer_id,
            receiving_post: (p as Record<string, string>).receiving_post,
            sample_count: Number((p as Record<string, number>).sample_count),
            seal_state: (p as Record<string, "intact" | "resealed_documented" | "broken">).seal_state,
            seal_marks: (p as Record<string, string>).seal_marks ?? "",
            article_description: (p as Record<string, string>).article_description ?? "",
            gross_weight_g: Number((p as Record<string, number>).gross_weight_g ?? 0),
          }),
        );
        break;
      }

      case "handoff.receipt": {
        result = await mutate((store) =>
          signReceipt(store, {
            handoff_id: (p as Record<string, string>).handoff_id,
            device_id: (p as Record<string, string>).device_id,
            officer_id: (p as Record<string, string>).officer_id,
            sample_count: Number((p as Record<string, number>).sample_count),
            seal_state: (p as Record<string, "intact" | "resealed_documented" | "broken">).seal_state,
            remarks: (p as Record<string, string>).remarks ?? "",
          }),
        );
        break;
      }

      /* ------------------------------------------------------ sync, anchor */
      case "sync.push":
        result = await mutate((store) => pushQueue(store));
        break;

      case "anchor.create":
        result = await mutate((store) => anchorTree(store));
        break;

      case "tsa.availability":
        result = await mutate((store) => {
          const id = (p as Record<string, string>).tsa_id;
          const available = Boolean((p as Record<string, boolean>).available);
          const authority = store.tsa_authorities.find((t) => t.tsa_id === id);
          if (!authority) throw new WorkflowError(`Unknown timestamp authority ${id}`);
          authority.available = available;
          return { tsa_id: id, available };
        });
        break;

      /* ------------------------------------------------------- certificate */
      case "certificate.generate":
        result = await mutate((store) =>
          generateCertificate(
            store,
            (p as Record<string, string>).case_ref,
            (p as Record<string, string>).officer_id,
          ),
        );
        break;

      case "certificate.verify_hash": {
        const store = await getStore();
        const cert = store.certificates.find(
          (c) => c.case_ref === (p as Record<string, string>).case_ref,
        );
        if (!cert) throw new WorkflowError("No certificate has been generated for this case");
        result = await verifyCertificateHash(store, cert);
        break;
      }

      /* -------------------------------------------------------------- demo */
      case "demo.reset":
        await resetStore();
        result = { reset: true };
        break;

      case "demo.tamper":
        result = await mutate((store) =>
          applyTamper(store, (p as Record<string, string | undefined>).record_id),
        );
        break;

      case "demo.restore":
        result = await mutate((store) =>
          restoreTamper(store, Boolean((p as Record<string, boolean>).all)),
        );
        break;

      case "demo.device_role":
        result = await mutate((store) => {
          store.demo_device_role = (p as Record<string, "rpf" | "grp" | "verifier">).role;
          return store.demo_device_role;
        });
        break;

      default:
        return NextResponse.json({ error: `Unknown action "${body.action}"` }, { status: 400 });
    }

    const { store, revision } = await getStoreWithRevision();
    return NextResponse.json({ ok: true, result, store: toClientStore(store), revision });
  } catch (error) {
    const message =
      error instanceof WorkflowError || error instanceof Error
        ? error.message
        : "Unexpected error";
    const current = await getStoreWithRevision().catch(() => null);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        ...(current ? { store: toClientStore(current.store), revision: current.revision } : {}),
      },
      { status: error instanceof WorkflowError ? 409 : 500 },
    );
  }
}
