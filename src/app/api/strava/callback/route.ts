import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { safeEqual } from "@/lib/auth";
import { STRAVA_STATE_COOKIE } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") ?? "";
  const expectedState = req.cookies.get(STRAVA_STATE_COOKIE)?.value ?? "";

  // Reject callbacks this browser didn't start (stops someone swapping in their own Strava account)
  if (!expectedState || !safeEqual(state, expectedState)) {
    return NextResponse.redirect(new URL("/fitness?strava=error", req.url));
  }

  if (error || !code) {
    return NextResponse.redirect(new URL("/fitness?strava=denied", req.url));
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/fitness?strava=error", req.url));
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  const userId = getUserId();
  await db.stravaToken.upsert({
    where:  { userId },
    create: { userId, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at },
    update: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at },
  });

  const done = NextResponse.redirect(new URL("/fitness?strava=connected", req.url));
  done.cookies.delete({ name: STRAVA_STATE_COOKIE, path: "/api/strava" });
  return done;
}
