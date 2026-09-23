// Voice notes: transcribe, classify, then journal / meeting note / task / EoD.
import { db } from "../db";
import { createCalendarEvent } from "../googleCalendar";
import { parseVoiceTranscript, transcribeWhatsAppAudio } from "../voiceNote";
import { makeCtx } from "./context";
import { appendVoiceJournal, patchDailyLog } from "./store";
import { sendWhatsApp } from "./twilio";
import { composeAndSaveEod } from "./intents/eod";

// LLM sometimes returns [] instead of null
const toStr = (v: unknown) => (!v || (Array.isArray(v) && v.length === 0) ? null : String(v));

export async function handleVoiceNote(from: string, sid: string, mediaUrl: string, contentType?: string) {
  await sendWhatsApp(from, "🎤 Got your voice note, transcribing...");

  let transcript: string;
  try {
    transcript = await transcribeWhatsAppAudio(mediaUrl, contentType);
    console.log("Transcript chars:", transcript.length, { sid });
  } catch (e) {
    console.error("Transcription error:", e);
    await sendWhatsApp(from, "Sorry, couldn't transcribe that. Try again or just type it out 🙂");
    return;
  }

  const ctx = makeCtx(from, sid, transcript);
  const parsed = await parseVoiceTranscript(transcript);
  console.log("Voice intent:", parsed.intent, { sid });

  if (parsed.intent === "eod") {
    await composeAndSaveEod(ctx, transcript, "voice"); // replies with the draft itself
    return;
  }

  if (parsed.intent === "meeting_note") {
    await db.meetingNote.create({
      data: {
        userId: ctx.userId,
        date: ctx.today,
        title:        toStr(parsed.title) ?? "Untitled meeting",
        attendees:    toStr(parsed.attendees),
        summary:      toStr(parsed.summary),
        decisions:    toStr(parsed.decisions),
        actionItems:  toStr(parsed.actionItems),
        rawTranscript: transcript,
      },
    });
    if (parsed.attendees) await patchDailyLog(ctx, { didNetwork: true });
  } else if (parsed.intent === "journal" && parsed.journalText) {
    await appendVoiceJournal(ctx, parsed.journalText, parsed.moodScore);
  } else if (parsed.intent === "task" && parsed.taskTitle) {
    await db.task.create({
      data: {
        userId: ctx.userId,
        title: parsed.taskTitle,
        priority: parsed.taskPriority ?? "medium",
        section: "work",
        status: "todo",
        isToday: true,
        dueDate: ctx.today,
      },
    });
    if (parsed.taskTime) {
      await createCalendarEvent({ title: parsed.taskTitle, date: ctx.today, timeStr: parsed.taskTime, reminderMinutes: 60 });
    }
  } else if (parsed.journalText) {
    // General — save as a journal entry
    await appendVoiceJournal(ctx, parsed.journalText);
  }

  await ctx.reply(parsed.reply);
}
