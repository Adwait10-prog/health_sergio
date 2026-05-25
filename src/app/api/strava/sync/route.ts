import { NextResponse } from "next/server";
import { fetchAndSyncActivities } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const count = await fetchAndSyncActivities(30);
    return NextResponse.json({ synced: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
