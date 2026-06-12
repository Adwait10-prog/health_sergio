import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processAsanaEvent } from "@/lib/asanaHandlers";
import crypto from "crypto";

// Asana sends X-Hook-Secret on first handshake — echo it back
// After that, verifies X-Hook-Signature (HMAC-SHA256) on every event
const WEBHOOK_SECRET = process.env.ASANA_WEBHOOK_SECRET!;

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true; // skip in dev if not set
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return `sha256=${expected}` === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ── Handshake (first-time webhook registration) ──────────────────────────
  const hookSecret = req.headers.get("x-hook-secret");
  if (hookSecret) {
    console.log("Asana webhook handshake received");
    return new NextResponse(null, {
      status: 200,
      headers: { "X-Hook-Secret": hookSecret },
    });
  }

  // ── Verify signature ──────────────────────────────────────────────────────
  const signature = req.headers.get("x-hook-signature") ?? "";
  if (!verifySignature(rawBody, signature)) {
    console.error("Asana webhook signature mismatch");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ── Parse events ──────────────────────────────────────────────────────────
  let payload: { events: Array<{
    action: string;
    resource: { gid: string; resource_type: string };
    parent?: { gid: string; resource_type: string } | null;
    project?: { gid: string } | null;
  }> };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // Respond immediately — Asana requires < 5s response
  // Process events in background (non-blocking)
  const events = payload.events ?? [];
  console.log(`Asana webhook: ${events.length} event(s)`);

  // Fire and forget — process async
  void (async () => {
    for (const event of events) {
      try {
        // Log the raw event
        await db.asanaWebhookEvent.create({
          data: {
            eventType: `${event.resource.resource_type}.${event.action}`,
            resourceGid: event.resource.gid,
            projectGid: event.project?.gid ?? null,
            rawPayload: JSON.stringify(event),
            processed: false,
          },
        });

        // Process it
        await processAsanaEvent(event);

        // Mark processed
        await db.asanaWebhookEvent.updateMany({
          where: { resourceGid: event.resource.gid, processed: false },
          data: { processed: true },
        });
      } catch (e) {
        console.error("Asana event processing error:", e);
        await db.asanaWebhookEvent.updateMany({
          where: { resourceGid: event.resource.gid, processed: false },
          data: { error: String(e) },
        }).catch(() => {});
      }
    }
  })();

  return new NextResponse(null, { status: 200 });
}
