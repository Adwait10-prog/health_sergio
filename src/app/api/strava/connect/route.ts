import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { STRAVA_STATE_COOKIE, stravaAuthUrl } from "@/lib/strava";

// Starts Strava OAuth with a one-time state bound to this browser (CSRF protection).
export function GET() {
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(stravaAuthUrl(state));
  res.cookies.set(STRAVA_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/strava",
    maxAge: 600,
  });
  return res;
}
