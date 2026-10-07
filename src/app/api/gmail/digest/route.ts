import { NextRequest, NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/wa/twilio";
import { buildDigest, gmailConnected, syncInbox } from "@/lib/gmail";

// GET /api/gmail/digest — hit hourly by the scheduler (Bearer CRON_SECRET).
// Pulls new inbox mail, then WhatsApps a summary of what matters. Silent when nothing does,
// and between 22:00 and 08:00 IST (mail keeps syncing; it's summarised in the morning).
// ?dry=1 returns the message without sending or marking anything.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!hasBearer(req, "CRON_SECRET")) return new NextResponse("Unauthorized", { status: 401 });
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  try {
    if (!(await gmailConnected())) return NextResponse.json({ ok: false, error: "Google isn't connected" }, { status: 503 });
    const { fetched } = await syncInbox();

    const hourIST = new Date(Date.now() + 5.5 * 3600000).getUTCHours();
    if (!dry && (hourIST < 8 || hourIST >= 22)) {
      return NextResponse.json({ ok: true, fetched, sent: false, reason: "quiet hours" });
    }

    const digest = await buildDigest({ commit: !dry });
    const to = process.env.USER_WHATSAPP;
    const send = !dry && !!digest.text && !!to;
    if (send) await sendWhatsApp(to!, digest.text!);

    console.log("gmail digest:", { fetched, total: digest.total, action: digest.action, fyi: digest.fyi, noise: digest.noise, sent: send });
    return NextResponse.json({ ok: true, fetched, sent: send, counts: { total: digest.total, action: digest.action, fyi: digest.fyi, noise: digest.noise }, ...(dry ? { preview: digest.text } : {}) });
  } catch (e) {
    console.error("gmail digest error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid_grant/i.test(msg)) {
      return NextResponse.json({ ok: false, error: "Google sign-in has expired — sign in again at /api/google/connect" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
