import { NextResponse } from "next/server";
import { getStore } from "@/lib/store/store";
import { sensorAdapter } from "@/lib/sensor/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reads the active sensor adapter. In this build that is the mock. */
export async function GET() {
  const store = await getStore();
  const reading = sensorAdapter.read(store.sensor_cursor);
  return NextResponse.json({
    reading,
    adapter: { id: sensorAdapter.id, label: sensorAdapter.label, simulated: sensorAdapter.simulated },
  });
}
