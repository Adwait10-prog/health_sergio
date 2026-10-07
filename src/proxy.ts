import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Machine endpoints authenticate themselves: Twilio signature, Asana HMAC,
// health-sync token, cron bearer, agent tool key. Everything else requires the session cookie.
const PUBLIC = [
  /^\/login$/,
  /^\/api\/login$/,
  /^\/api\/whatsapp\/inbound$/,
  /^\/api\/whatsapp\/(brief|nudge)$/,
  /^\/api\/asana\/webhook$/,
  /^\/api\/asana\/sync$/,
  /^\/api\/health-sync$/,
  /^\/api\/agent\/tool\/[a-z_]+$/, // ElevenAgents webhook tools (x-agent-key)
  /^\/api\/gmail\/digest$/, // hourly scheduler (cron bearer)
];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some(r => r.test(pathname))) return NextResponse.next();
  if (isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip framework internals (static chunks, images, dev HMR socket) and public assets.
  matcher: ["/((?!_next/|__nextjs|favicon\\.ico|.*\\.svg$).*)"],
};
