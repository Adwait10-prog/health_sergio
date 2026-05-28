import { NextRequest, NextResponse } from "next/server";
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
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let message: string;

    if (isSundayIST()) {
      // Sunday: combined brief + weekly coach review
      const data = await fetchWeekReviewData();
      message = await generateSundayBrief(data);
      console.log("Sunday brief sent:", message.slice(0, 100));
    } else {
      // Mon–Sat: regular morning brief
      const data = await fetchBriefData();
      message = await generateMorningBrief(data);
      console.log("Morning brief sent:", message.slice(0, 100));
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
