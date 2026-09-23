// Single-user auth helpers. Every check fails closed when its env var is missing.
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "os_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Cookie value is an HMAC, never the secret itself. Rotating SESSION_SECRET logs every device out.
export function sessionToken(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("os_session_v1").digest("hex");
}

export function isValidSession(value: string | undefined): boolean {
  const expected = sessionToken();
  return !!expected && !!value && safeEqual(value, expected);
}

export function isCorrectLogin(username: string, password: string): boolean {
  const expectedUser = process.env.LOGIN_USERNAME;
  const expectedPass = process.env.LOGIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  // evaluate both so timing doesn't reveal which one was wrong
  const userOk = safeEqual(username.trim().toLowerCase(), expectedUser.toLowerCase());
  const passOk = safeEqual(password, expectedPass);
  return userOk && passOk;
}

// Shared-secret check for machine endpoints (cron, health sync).
export function hasSecret(provided: string | null | undefined, envName: string): boolean {
  const expected = process.env[envName];
  return !!expected && !!provided && safeEqual(provided, expected);
}

export function hasBearer(req: Request, envName: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") && hasSecret(header.slice(7), envName);
}

// Only allow same-site relative redirects after login.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
