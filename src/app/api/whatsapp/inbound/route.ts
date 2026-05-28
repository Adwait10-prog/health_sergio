import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { parseWhatsAppMessage } from "@/lib/whatsapp";
import { startOfDay } from "date-fns";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const WHATSAPP_FROM = "whatsapp:+14155238886"; // Twilio sandbox number

async function sendReply(to: string, body: string) {
  await twilioClient.messages.create({
    from: WHATSAPP_FROM,
    to,
    body,
  });
}

function todayIST(): Date {
  const now = new Date();
  const istMidnight = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const dateStr = istMidnight.toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  // Twilio sends form-encoded data
  const formData = await req.formData();
  const from = formData.get("From") as string;   // e.g. "whatsapp:+919876543210"
  const body = (formData.get("Body") as string ?? "").trim();
  const mediaUrl = formData.get("MediaUrl0") as string | null;

  console.log("WhatsApp inbound:", { from, body, mediaUrl });

  if (!body && !mediaUrl) {
    return new NextResponse("OK", { status: 200 });
  }

  const userId = getUserId();
  const today = todayIST();

  try {
    // Voice message / media — acknowledge for now
    if (mediaUrl) {
      await sendReply(from, "🎤 Voice messages coming soon! For now, type your log. E.g. 'ran 5km in 30min' or 'journaled and meditated'");
      return new NextResponse("OK", { status: 200 });
    }

    const parsed = await parseWhatsAppMessage(body);
    console.log("Parsed:", parsed);

    switch (parsed.intent) {

      case "log_run": {
        const d = parsed.data;
        // Create/update Strava-style activity record
        await db.stravaActivity.create({
          data: {
            userId,
            stravaId: `manual_${Date.now()}`,
            date: today,
            name: d.notes as string ?? "Manual Run",
            type: "Run",
            distanceM: d.distanceKm ? (d.distanceKm as number) * 1000 : null,
            movingTimeSec: d.durationMin ? (d.durationMin as number) * 60 : null,
            avgHeartRate: d.avgHr as number ?? null,
            rawJson: JSON.stringify(d),
          },
        });
        // Also tick didWorkout in DailyLog
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, didWorkout: true },
          update: { didWorkout: true },
        });
        break;
      }

      case "log_gym": {
        const d = parsed.data;
        await db.stravaActivity.create({
          data: {
            userId,
            stravaId: `manual_${Date.now()}`,
            date: today,
            name: `${d.sessionType ?? "Gym"} session`,
            type: "WeightTraining",
            movingTimeSec: d.durationMin ? (d.durationMin as number) * 60 : null,
            rawJson: JSON.stringify(d),
          },
        });
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, didWorkout: true },
          update: { didWorkout: true },
        });
        break;
      }

      case "log_habits": {
        const habits = (parsed.data.habits as string[]) ?? [];
        const update: Record<string, boolean> = {};
        if (habits.includes("workout"))  update.didWorkout  = true;
        if (habits.includes("read"))     update.didRead     = true;
        if (habits.includes("journal"))  update.didJournal  = true;
        if (habits.includes("meditate")) update.didMeditate = true;
        if (habits.includes("code"))     update.didCode     = true;
        if (habits.includes("learn"))    update.didLearn    = true;
        if (habits.includes("network"))  update.didNetwork  = true;
        if (Object.keys(update).length > 0) {
          await db.dailyLog.upsert({
            where: { userId_date: { userId, date: today } },
            create: { userId, date: today, ...update },
            update,
          });
        }
        break;
      }

      case "log_journal": {
        const d = parsed.data;
        await db.reflection.upsert({
          where: { userId_date_type: { userId, date: today, type: "daily" } },
          create: {
            userId,
            date: today,
            type: "daily",
            journalText: d.journalText as string ?? null,
            gratitudeItems: d.gratitude as string ?? null,
            lessonsLearned: d.lessons as string ?? null,
          },
          update: {
            journalText: d.journalText as string ?? undefined,
            gratitudeItems: d.gratitude as string ?? undefined,
            lessonsLearned: d.lessons as string ?? undefined,
          },
        });
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, didJournal: true },
          update: { didJournal: true },
        });
        break;
      }

      case "log_water": {
        const waterL = parsed.data.waterL as number;
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, waterL },
          update: { waterL },
        });
        break;
      }

      case "log_mood": {
        const d = parsed.data;
        await db.dailyLog.upsert({
          where: { userId_date: { userId, date: today } },
          create: {
            userId, date: today,
            moodScore:    d.moodScore    as number ?? null,
            stressLevel:  d.stressLevel  as number ?? null,
            energyLevel:  d.energyLevel  as number ?? null,
          },
          update: {
            ...(d.moodScore   != null && { moodScore:   d.moodScore   as number }),
            ...(d.stressLevel != null && { stressLevel: d.stressLevel as number }),
            ...(d.energyLevel != null && { energyLevel: d.energyLevel as number }),
          },
        });
        break;
      }

      case "query_today": {
        // Fetch today's log and reply with summary
        const log = await db.dailyLog.findFirst({ where: { userId, date: today } });
        const habits = log ? [
          log.didWorkout  && "💪 Workout",
          log.didRead     && "📖 Read",
          log.didCode     && "💻 Code",
          log.didJournal  && "✍️ Journal",
          log.didMeditate && "🧘 Meditate",
          log.didNetwork  && "🤝 Network",
          log.didLearn    && "🎓 Learn",
        ].filter(Boolean) : [];
        const reply = habits.length > 0
          ? `Today so far:\n${habits.join(" · ")}\nMood: ${log?.moodScore ?? "—"}/10 · Water: ${log?.waterL ?? "—"}L`
          : "Nothing logged yet today. Send me what you've done!";
        await sendReply(from, reply);
        return new NextResponse("OK", { status: 200 });
      }

      case "query_stats": {
        const last7 = await db.dailyLog.findMany({
          where: { userId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          orderBy: { date: "desc" },
        });
        const workoutDays = last7.filter(l => l.didWorkout).length;
        const journalDays = last7.filter(l => l.didJournal).length;
        const avgMood = last7.filter(l => l.moodScore).length > 0
          ? (last7.reduce((s, l) => s + (l.moodScore ?? 0), 0) / last7.filter(l => l.moodScore).length).toFixed(1)
          : "—";
        const reply = `Last 7 days 📊\n💪 Workouts: ${workoutDays}/7 · ✍️ Journal: ${journalDays}/7\n😊 Avg mood: ${avgMood}/10`;
        await sendReply(from, reply);
        return new NextResponse("OK", { status: 200 });
      }

      default:
        await sendReply(from, parsed.reply || "I didn't catch that. Try: 'ran 5km', 'journaled and meditated', 'mood 7/10', or 'how am I doing this week?'");
        return new NextResponse("OK", { status: 200 });
    }

    // Send confirmation reply
    await sendReply(from, parsed.reply);
    return new NextResponse("OK", { status: 200 });

  } catch (e) {
    console.error("WhatsApp handler error:", e);
    await sendReply(from, "⚠️ Something went wrong saving that. Try again in a moment.").catch(() => {});
    return new NextResponse("OK", { status: 200 });
  }
}
