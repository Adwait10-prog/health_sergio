import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { format } from "date-fns";
import PageSidebar from "@/components/layout/PageSidebar";
import MeetingNoteCard from "@/components/meetings/MeetingNoteCard";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const userId = getUserId();

  const meetings = await db.meetingNote.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 50,
  });

  // Group by month
  const grouped: Record<string, typeof meetings> = {};
  for (const m of meetings) {
    const key = format(new Date(m.date), "MMMM yyyy");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const accent = "var(--c-founder)";

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", padding: "36px 40px 80px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)", margin: 0, letterSpacing: "-0.03em" }}>
            Meeting Notes
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Captured via WhatsApp voice notes · {meetings.length} total
          </p>
        </div>

        {meetings.length === 0 ? (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "48px 32px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎤</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", margin: "0 0 8px" }}>No meeting notes yet</p>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              Send a WhatsApp voice note describing a meeting and it'll appear here automatically.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, notes]) => (
            <div key={month} style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-4)",
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginBottom: 12,
              }}>
                {month}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {notes.map(note => (
                  <MeetingNoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <PageSidebar section="work" accentColor="var(--c-founder)" />
      </div>
    </div>
  );
}
