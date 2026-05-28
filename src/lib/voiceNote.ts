import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Fetch audio from Twilio URL (requires basic auth) and transcribe via Whisper
export async function transcribeWhatsAppAudio(
  mediaUrl: string,
  contentType?: string
): Promise<string> {
  // Twilio media URLs require Basic auth
  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const audioRes = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!audioRes.ok) {
    throw new Error(`Failed to fetch audio: ${audioRes.status}`);
  }

  const audioBuffer = await audioRes.arrayBuffer();
  const mimeType = contentType || audioRes.headers.get("content-type") || "audio/ogg";

  // Map MIME type to file extension Whisper accepts
  const extMap: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/amr": "amr",
  };
  const ext = extMap[mimeType.split(";")[0].trim()] ?? "ogg";

  // Whisper needs a File object
  const file = new File([audioBuffer], `voice.${ext}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    // No language lock — handles Hinglish (Hindi+English mix) better with auto-detect
  });

  return transcription.text.trim();
}

export interface ParsedVoiceNote {
  intent: "journal" | "meeting_note" | "task" | "general";
  // For journal
  journalText?: string;
  moodScore?: number | null;
  // For meeting_note
  title?: string;
  attendees?: string;
  summary?: string;
  decisions?: string;
  actionItems?: string;
  // For task
  taskTitle?: string;
  taskPriority?: string;
  // Reply to send back
  reply: string;
}

// Use Claude Haiku to parse transcript into structured data
export async function parseVoiceTranscript(transcript: string): Promise<ParsedVoiceNote> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 800,
    system: `You are Adwait's personal assistant. He sent a voice note on WhatsApp. You have the transcript. Figure out what it is and extract structured data.

Respond ONLY with valid JSON:
{
  "intent": "journal" | "meeting_note" | "task" | "general",

  // If journal:
  "journalText": "his exact words, preserved",
  "moodScore": 1-10 or null,

  // If meeting_note:
  "title": "short title e.g. 'Call with DG Futurtech'",
  "attendees": "comma-separated names mentioned",
  "summary": "2-3 line summary of what was discussed",
  "decisions": "key decisions made, one per line",
  "actionItems": "action items with owner if mentioned, one per line",

  // If task:
  "taskTitle": "clean actionable task title",
  "taskPriority": "high" | "medium" | "low",

  "reply": "warm 1-2 line reply confirming what you captured. Be specific — mention the meeting name or key point. No markdown."
}

Rules:
- meeting_note: mentions a call, meeting, conversation with someone, discussed X with Y
- task: "remind me to X", "need to do X", "add task X"
- journal: personal reflection, how the day went, feelings, gratitude
- general: anything else (use journalText to capture it)`,
    messages: [{ role: "user", content: `Transcript: "${transcript}"` }],
  });

  const raw = (response.content[0] as { text: string }).text.trim();
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
  return JSON.parse(jsonMatch[1] ?? raw) as ParsedVoiceNote;
}
