// Google sign-in shared by Gmail (read-only) and Calendar. The refresh token lives in the
// database (GoogleToken) so local and production use the same sign-in; the old
// GOOGLE_REFRESH_TOKEN env var is only a fallback.
import { google } from "googleapis";
import { db } from "./db";

// Must match an "Authorized redirect URI" on the OAuth client in Google Cloud.
// Sign-in is done once on the local app; the token is then used everywhere.
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3001/oauth2callback";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export function oauthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, GOOGLE_REDIRECT_URI);
}

export function consentUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    scope: GOOGLE_SCOPES,
    state,
  });
}

// Finish sign-in: swap the code for tokens and remember the refresh token.
export async function saveFromCode(code: string): Promise<{ email: string | null }> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("Google didn't return a refresh token — remove the app's access in your Google account and try again.");
  client.setCredentials(tokens);
  let email: string | null = null;
  try {
    email = (await google.gmail({ version: "v1", auth: client }).users.getProfile({ userId: "me" })).data.emailAddress ?? null;
  } catch { /* Gmail API not enabled yet — the token is still worth saving */ }
  const row = { refreshToken: tokens.refresh_token, scope: tokens.scope ?? null, email };
  await db.googleToken.upsert({ where: { id: "default" }, create: { id: "default", ...row }, update: row });
  return { email };
}

// An authorised client, or null if nobody has signed in.
export async function googleAuth() {
  const saved = await db.googleToken.findUnique({ where: { id: "default" } });
  const refresh_token = saved?.refreshToken ?? process.env.GOOGLE_REFRESH_TOKEN;
  if (!refresh_token) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token });
  return client;
}
