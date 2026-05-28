import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { shouldSendNudge, isSundayIST } from "@/lib/briefData";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const WHATSAPP_FROM = "whatsapp:+14155238886";
const USER_WHATSAPP = process.env.USER_WHATSAPP!;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // No evening nudge on Sundays — brief already covers the day
  if (isSundayIST()) {
    console.log("Evening nudge: skipping Sunday");
    return NextResponse.json({ ok: true, sent: false, reason: "sunday" });
  }

  try {
    const { send, message } = await shouldSendNudge();

    if (!send) {
      console.log("Evening nudge: no nudge needed today");
      return NextResponse.json({ ok: true, sent: false, reason: "already done" });
    }

    await twilioClient.messages.create({
      from: WHATSAPP_FROM,
      to: USER_WHATSAPP,
      body: message,
    });

    console.log("Evening nudge sent:", message.slice(0, 100));
    return NextResponse.json({ ok: true, sent: true, preview: message.slice(0, 100) });
  } catch (e) {
    console.error("Evening nudge error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
