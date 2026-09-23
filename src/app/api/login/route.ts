import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, isCorrectPassword, safeNextPath, sessionToken } from "@/lib/auth";

// POST /api/login — form post from /login. Sets the session cookie on success.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? "/"));
  const token = sessionToken();

  if (!token || !isCorrectPassword(password)) {
    await new Promise(r => setTimeout(r, 600)); // slow down guessing
    const back = new URL("/login", req.url);
    back.searchParams.set("e", "1");
    back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
