import { NextRequest, NextResponse } from "next/server";
import { saveFromCode } from "@/lib/google";

// GET /oauth2callback — Google returns here after consent (behind the login gate).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = req.cookies.get("g_oauth_state")?.value;
  const page = (title: string, body: string, status = 200) =>
    new NextResponse(`<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui;max-width:520px;margin:80px auto;line-height:1.5"><h2>${title}</h2><p>${body}</p><p><a href="/">Back to Today</a></p>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

  if (searchParams.get("error")) return page("Google sign-in cancelled", "Nothing was changed.", 400);
  if (!code || !state || !expected || state !== expected) return page("Sign-in couldn't be verified", "Start again from /api/google/connect.", 400);

  try {
    const { email } = await saveFromCode(code);
    const res = page("Google connected", `Signed in${email ? ` as ${email}` : ""}. Gmail (read-only) and Calendar are now available to your OS.`);
    res.cookies.delete("g_oauth_state");
    return res;
  } catch (e) {
    console.error("google oauth callback failed:", e);
    return page("Google sign-in failed", e instanceof Error ? e.message : "Unknown error.", 500);
  }
}
