// The one Twilio client for outbound WhatsApp (inbound replies, morning brief, evening nudge).
import twilio from "twilio";

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

let client: ReturnType<typeof twilio> | null = null;
function getClient() {
  return (client ??= twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!));
}

// WHATSAPP_DRY_RUN=1 (local only) logs the message instead of sending it.
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (process.env.WHATSAPP_DRY_RUN === "1") {
    console.log(`[whatsapp dry-run] to …${to.slice(-4)}\n${body}\n[/dry-run]`);
    return;
  }
  await getClient().messages.create({ from: WHATSAPP_FROM, to, body });
}
