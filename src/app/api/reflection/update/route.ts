import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const { id, journalText, gratitudeItems, lessonsLearned, weeklyScore } = await req.json() as {
    id: string;
    journalText?: string | null;
    gratitudeItems?: string | null;
    lessonsLearned?: string | null;
    weeklyScore?: number | null;
  };

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updated = await db.reflection.updateMany({
    where: { id, userId },
    data: {
      ...(journalText    !== undefined && { journalText }),
      ...(gratitudeItems !== undefined && { gratitudeItems }),
      ...(lessonsLearned !== undefined && { lessonsLearned }),
      ...(weeklyScore    !== undefined && { weeklyScore }),
    },
  });

  return NextResponse.json({ updated: updated.count });
}
