import { NextResponse } from "next/server";

// POST /api/asana/sync-trigger — UI-callable sync trigger
// Calls the internal sync route using the server-side CRON_SECRET
// No auth needed from client — server-to-server only
export async function POST() {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/asana/sync`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${cronSecret}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
