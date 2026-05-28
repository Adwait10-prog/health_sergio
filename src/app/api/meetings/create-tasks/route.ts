import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";

function todayIST(): Date {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const dateStr = new Date(istMs).toISOString().split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const { actionItems } = await req.json() as { meetingNoteId: string; actionItems: string[] };

  const today = todayIST();

  const tasks = await Promise.all(
    actionItems.map(item =>
      db.task.create({
        data: {
          userId,
          title: item.replace(/^[-•→*]\s*/, "").trim(),
          priority: "medium",
          section: "work",
          status: "todo",
          isToday: true,
          dueDate: today,
        },
      })
    )
  );

  return NextResponse.json({ created: tasks.length });
}
