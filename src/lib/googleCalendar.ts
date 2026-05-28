import { google } from "googleapis";

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    "http://localhost:3001/oauth2callback"
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
  });
  return oauth2Client;
}

export interface CalendarEventParams {
  title: string;
  date: Date;         // the day (IST midnight as UTC — same as how we store dates)
  timeStr: string;    // e.g. "3pm", "15:00", "3:30 PM"
  reminderMinutes?: number; // default 60
}

// Parse "3pm" / "3:30pm" / "15:00" / "3:30 PM" into { hours, minutes }
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const s = timeStr.trim().toLowerCase().replace(/\s/g, "");

  // 24h: "15:00" or "15:30"
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return { hours: parseInt(h24[1]), minutes: parseInt(h24[2]) };

  // 12h with minutes: "3:30pm"
  const h12m = s.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (h12m) {
    let h = parseInt(h12m[1]);
    const m = parseInt(h12m[2]);
    if (h12m[3] === "pm" && h !== 12) h += 12;
    if (h12m[3] === "am" && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  // 12h without minutes: "3pm"
  const h12 = s.match(/^(\d{1,2})(am|pm)$/);
  if (h12) {
    let h = parseInt(h12[1]);
    if (h12[2] === "pm" && h !== 12) h += 12;
    if (h12[2] === "am" && h === 12) h = 0;
    return { hours: h, minutes: 0 };
  }

  return null;
}

export async function createCalendarEvent(params: CalendarEventParams): Promise<string | null> {
  const { title, date, timeStr, reminderMinutes = 60 } = params;

  const parsed = parseTime(timeStr);
  if (!parsed) {
    console.error("Could not parse time:", timeStr);
    return null;
  }

  // Build IST datetime: date is midnight IST (stored as UTC-5.5h)
  // Add 5.5h to get back to IST midnight, then add parsed hours/minutes
  const istMidnightMs = date.getTime() + 5.5 * 60 * 60 * 1000;
  const startMs = istMidnightMs + (parsed.hours * 60 + parsed.minutes) * 60 * 1000;
  const endMs   = startMs + 60 * 60 * 1000; // 1hr duration default

  const startTime = new Date(startMs);
  const endTime   = new Date(endMs);

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
        end:   { dateTime: endTime.toISOString(),   timeZone: "Asia/Kolkata" },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: reminderMinutes },
          ],
        },
      },
    });
    return event.data.htmlLink ?? null;
  } catch (e) {
    console.error("Google Calendar event creation failed:", e);
    return null;
  }
}
