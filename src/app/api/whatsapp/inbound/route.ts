import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { parseWhatsAppMessage } from "@/lib/whatsapp";
import { makeCtx } from "@/lib/wa/context";
import { sendWhatsApp } from "@/lib/wa/twilio";
import { handleVoiceNote } from "@/lib/wa/voice";
import { handlers } from "@/lib/wa/intents";
import { resolvePendingAsana } from "@/lib/wa/intents/asana";

// Empty TwiML: "got it". Replies go out via the REST API, not the TwiML body.
// A fresh Response per call: a body can only be consumed once.
const twimlOk = () => new NextResponse("<Response></Response>", {
  status: 200,
  headers: { "Content-Type": "text/xml" },
});

const USER_WHATSAPP = process.env.USER_WHATSAPP;

// The exact URL Twilio signed. PUBLIC_BASE_URL wins; otherwise rebuild it from the proxy headers.
function signedUrl(req: NextRequest): string {
  const base = process.env.PUBLIC_BASE_URL
    ?? `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`;
  return `${base.replace(/\/$/, "")}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

function isTwilioMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "api.twilio.com";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // 1. Twilio signature — logged, not enforced (internal tool; the owner + media checks below
  //    are what block misuse). Flip to a 403 here if you ever want it strict.
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw));
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !twilio.validateRequest(authToken, signature, signedUrl(req), params)) {
    console.warn("WhatsApp inbound: Twilio signature did not verify (continuing)", { sid: params.MessageSid ?? "?" });
  }

  const sid      = params.MessageSid ?? "?";
  const from     = params.From ?? "";
  const body     = (params.Body ?? "").trim();
  const mediaUrl = params.MediaUrl0 || null;

  // 2. Owner check — single-user system, only the owner's number may act
  if (!USER_WHATSAPP || from !== USER_WHATSAPP) {
    console.warn("WhatsApp inbound: ignored non-owner sender", { sid });
    return twimlOk();
  }

  // 3. Media allowlist — Twilio credentials are only ever sent to Twilio
  if (mediaUrl && !isTwilioMediaUrl(mediaUrl)) {
    console.warn("WhatsApp inbound: ignored non-Twilio media URL", { sid });
    return twimlOk();
  }

  console.log("WhatsApp inbound:", { sid, chars: body.length, hasMedia: !!mediaUrl });
  if (!body && !mediaUrl) return twimlOk();

  try {
    if (mediaUrl) {
      await handleVoiceNote(from, sid, mediaUrl, params.MediaContentType0 || undefined);
      return twimlOk();
    }

    const ctx = makeCtx(from, sid, body);

    // 4. An open "which project?" question is answered before intent parsing
    if (await resolvePendingAsana(ctx)) return twimlOk();

    // 5. Classify → dispatch
    const parsed = await parseWhatsAppMessage(body);
    console.log("Parsed intent:", parsed.intent, { sid });
    await (handlers[parsed.intent] ?? handlers.unknown)(ctx, parsed);
    return twimlOk();
  } catch (e) {
    console.error("WhatsApp handler error:", e);
    await sendWhatsApp(from, "⚠️ Something went wrong. Try again in a moment.").catch(() => {});
    return twimlOk();
  }
}
