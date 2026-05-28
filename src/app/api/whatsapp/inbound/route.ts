import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { parseWhatsAppMessage, generateWeekSummary } from "@/lib/whatsapp";
import twilio from "twilio";
import { subDays } from "date-fns";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const WHATSAPP_FROM = "whatsapp:+14155238886";

async function sendReply(to: string, body: string) {
  await twilioClient.messages.create({ from: WHATSAPP_FROM, to, body });
}

// Returns midnight IST as UTC (how the app stores all dates)
function todayIST(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from    = formData.get("From") as string;
  const body    = (formData.get("Body") as string ?? "").trim();
  const mediaUrl = formData.get("MediaUrl0") as string | null;

  console.log("WhatsApp inbound:", { from, body: body.slice(0, 100), mediaUrl });

  if (!body && !mediaUrl) return new NextResponse("OK", { status: 200 });

  const userId = getUserId();
  const today  = todayIST();

  try {
    // Voice note — transcription coming soon
    if (mediaUrl) {
      await sendReply(from,
        "🎤 Voice notes coming soon! For now just type — write freely like you're talking to a friend."
      );
      return new NextResponse("OK", { status: 200 });
    }

    const parsed = await parseWhatsAppMessage(body);
    console.log("Parsed intent:", parsed.intent, JSON.stringify(parsed.data).slice(0, 200));

    switch (parsed.intent) {

      // ── Journal entry ──────────────────────────────────────────────
      case "journal": {
        const d = parsed.data;
        const journalText      = d.journalText      as string | null;
        const gratitudeItems   = d.extractedGratitude as string | null;
        const lessonsLearned   = d.extractedLessons   as string | null;
        const moodScore        = d.moodScore    as number | null;
        const stressLevel      = d.stressLevel  as number | null;
        const energyLevel      = d.energyLevel  as number | null;
        const dayScore         = d.dayScore     as number | null;

        // Save to Reflection
        await db.reflection.upsert({
          where: { userId_date_type: { userId, date: today, type: "daily" } },
          create: {
            userId, date: today, type: "daily",
            journalText,
            gratitudeItems,
            lessonsLearned,
            weeklyScore: dayScore,
          },
          update: {
            // Append to existing journal text if already has entry today
            journalText: journalText ?? undefined,
            ...(gratitudeItems  && { gratitudeItems }),
            ...(lessonsLearned  && { lessonsLearned }),
            ...(dayScore != null && { weeklyScore: dayScore }),
          },
        });

        // Update DailyLog
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: {
            userId, date: today,
            didJournal: true,
            ...(moodScore   != null && { moodScore }),
            ...(stressLevel != null && { stressLevel }),
            ...(energyLevel != null && { energyLevel }),
          },
          update: {
            didJournal: true,
            ...(moodScore   != null && { moodScore }),
            ...(stressLevel != null && { stressLevel }),
            ...(energyLevel != null && { energyLevel }),
          },
        });

        await sendReply(from, parsed.reply);
        break;
      }

      // ── Gratitude only ─────────────────────────────────────────────
      case "gratitude": {
        const items = parsed.data.items as string;
        await db.reflection.upsert({
          where: { userId_date_type: { userId, date: today, type: "daily" } },
          create: { userId, date: today, type: "daily", gratitudeItems: items, didJournal: true } as any,
          update: { gratitudeItems: items },
        });
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, didJournal: true },
          update: { didJournal: true },
        });
        await sendReply(from, parsed.reply);
        break;
      }

      // ── Lessons learned ────────────────────────────────────────────
      case "lessons": {
        const text = parsed.data.text as string;
        await db.reflection.upsert({
          where: { userId_date_type: { userId, date: today, type: "daily" } },
          create: { userId, date: today, type: "daily", lessonsLearned: text },
          update: { lessonsLearned: text },
        });
        await sendReply(from, parsed.reply);
        break;
      }

      // ── Mood / energy / stress ─────────────────────────────────────
      case "mood": {
        const d = parsed.data;
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: {
            userId, date: today,
            ...(d.moodScore   != null && { moodScore:   d.moodScore   as number }),
            ...(d.stressLevel != null && { stressLevel: d.stressLevel as number }),
            ...(d.energyLevel != null && { energyLevel: d.energyLevel as number }),
          },
          update: {
            ...(d.moodScore   != null && { moodScore:   d.moodScore   as number }),
            ...(d.stressLevel != null && { stressLevel: d.stressLevel as number }),
            ...(d.energyLevel != null && { energyLevel: d.energyLevel as number }),
          },
        });
        await sendReply(from, parsed.reply);
        break;
      }

      // ── Water ──────────────────────────────────────────────────────
      case "water": {
        const waterL = parsed.data.waterL as number;
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, waterL },
          update: { waterL },
        });
        await sendReply(from, parsed.reply);
        break;
      }

      // ── Habits ─────────────────────────────────────────────────────
      case "habits": {
        const done = (parsed.data.done as string[]) ?? [];
        const update: Record<string, boolean> = {};
        if (done.includes("read"))     update.didRead     = true;
        if (done.includes("meditate")) update.didMeditate = true;
        if (done.includes("code"))     update.didCode     = true;
        if (done.includes("learn"))    update.didLearn    = true;
        if (done.includes("network"))  update.didNetwork  = true;
        if (done.includes("journal"))  update.didJournal  = true;
        if (Object.keys(update).length > 0) {
          await db.dailyLog.upsert({
            where: { userId_date: { userId, date: today } },
            create: { userId, date: today, ...update },
            update,
          });
        }
        await sendReply(from, parsed.reply);
        break;
      }

      // ── Query: today ───────────────────────────────────────────────
      case "query_today": {
        const [log, reflection] = await Promise.all([
          db.dailyLog.findFirst({ where: { userId, date: today } }),
          db.reflection.findFirst({ where: { userId, date: today, type: "daily" } }),
        ]);

        const habits = [
          log?.didWorkout  && "💪 Workout",
          log?.didRead     && "📖 Read",
          log?.didCode     && "💻 Code",
          log?.didJournal  && "✍️ Journal",
          log?.didMeditate && "🧘 Meditate",
          log?.didNetwork  && "🤝 Network",
          log?.didLearn    && "🎓 Learn",
        ].filter(Boolean);

        let reply = habits.length > 0
          ? `Today so far ✨\n${habits.join(" · ")}`
          : "Nothing logged yet today, Adwait.";

        if (log?.moodScore) reply += `\n😊 Mood: ${log.moodScore}/10`;
        if (log?.waterL)    reply += ` · 💧 Water: ${log.waterL}L`;
        if (reflection?.journalText) {
          const preview = (reflection.journalText as string).slice(0, 80);
          reply += `\n✍️ "${preview}${(reflection.journalText as string).length > 80 ? "…" : ""}"`;
        }

        await sendReply(from, reply);
        break;
      }

      // ── Query: week ────────────────────────────────────────────────
      case "query_week": {
        const weekStart = subDays(today, 7);
        const [reflections, dailyLogs] = await Promise.all([
          db.reflection.findMany({
            where: { userId, type: "daily", date: { gte: weekStart } },
            orderBy: { date: "desc" },
          }),
          db.dailyLog.findMany({
            where: { userId, date: { gte: weekStart } },
            orderBy: { date: "desc" },
          }),
        ]);

        const summary = await generateWeekSummary(
          reflections.map(r => ({ date: r.date, journalText: r.journalText, weeklyScore: r.weeklyScore })),
          dailyLogs.map(l => ({ date: l.date, moodScore: l.moodScore, didWorkout: l.didWorkout, didJournal: l.didJournal }))
        );
        await sendReply(from, summary);
        break;
      }

      // ── Unknown ────────────────────────────────────────────────────
      default: {
        await sendReply(from,
          parsed.reply ||
          "Just write freely — your day, how you're feeling, what you're grateful for. I'll figure out the rest 🙂"
        );
        break;
      }
    }

    return new NextResponse("OK", { status: 200 });

  } catch (e) {
    console.error("WhatsApp handler error:", e);
    await sendReply(from, "⚠️ Something went wrong. Try again in a moment.").catch(() => {});
    return new NextResponse("OK", { status: 200 });
  }
}
