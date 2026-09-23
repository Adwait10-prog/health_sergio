// Per-message context handed to every WhatsApp intent handler.
import { getUserId } from "../user";
import { sendWhatsApp } from "./twilio";

export interface Ctx {
  userId: string;
  today: Date;     // midnight IST, stored as UTC (the app's day-row convention)
  from: string;    // sender, e.g. "whatsapp:+91…"
  sid: string;     // Twilio MessageSid, for log correlation
  text: string;    // the message body (or transcript for voice)
  reply: (msg: string) => Promise<void>;
}

// Returns midnight IST as UTC (how the app stores all dates)
export function todayIST(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

export function makeCtx(from: string, sid: string, text: string): Ctx {
  return {
    userId: getUserId(),
    today: todayIST(),
    from,
    sid,
    text,
    reply: (msg: string) => sendWhatsApp(from, msg),
  };
}
