import { NextRequest, NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import twilio from "twilio";
import {
  fetchBriefData,
  generateMorningBrief,
  fetchWeekReviewData,
  generateSundayBrief,
  isSundayIST,
} from "@/lib/briefData";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const WHATSAPP_FROM = "whatsapp:+14155238886";
const USER_WHATSAPP = process.env.USER_WHATSAPP!;

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (!hasBearer(req, "CRON_SECRET")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let message: string;

    if (isSundayIST()) {
      // Sunday: combined brief + weekly coach review
      const data = await fetchWeekReviewData();
      message = await generateSundayBrief(data);
      console.log("Sunday brief sent:", message.length, "chars");
    } else {
      // Mon–Sat: regular morning brief
      const data = await fetchBriefData();
      message = await generateMorningBrief(data);
      console.log("Morning brief sent:", message.length, "chars");
    }

    await twilioClient.messages.create({
      from: WHATSAPP_FROM,
      to: USER_WHATSAPP,
      body: message,
    });

    return NextResponse.json({ ok: true, sunday: isSundayIST(), preview: message.slice(0, 100) });
  } catch (e) {
    console.error("Brief error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
