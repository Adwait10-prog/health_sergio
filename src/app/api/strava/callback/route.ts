import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

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

  return NextResponse.redirect(new URL("/fitness?strava=connected", req.url));
}
