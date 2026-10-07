import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { consentUrl } from "@/lib/google";

// GET /api/google/connect — behind the login gate. Sends you to Google's consent screen
// for Gmail (read-only) + Calendar; Google returns to /oauth2callback.
export async function GET() {
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(consentUrl(state));
  res.cookies.set("g_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
