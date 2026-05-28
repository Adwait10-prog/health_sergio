import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { fetchBriefData, generateMorningBrief } from "@/lib/briefData";

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
    const data = await fetchBriefData();
    const brief = await generateMorningBrief(data);

    await twilioClient.messages.create({
      from: WHATSAPP_FROM,
      to: USER_WHATSAPP,
      body: brief,
    });

    console.log("Morning brief sent:", brief.slice(0, 100));
    return NextResponse.json({ ok: true, preview: brief.slice(0, 100) });
  } catch (e) {
    console.error("Morning brief error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
