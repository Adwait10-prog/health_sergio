import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";

export async function GET(req: NextRequest) {
  const userId = getUserId();
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? undefined;
  const isToday = searchParams.get("isToday");
  const status = searchParams.get("status") ?? undefined;

  const tasks = await db.task.findMany({
    where: {
      userId,
      ...(section ? { section } : {}),
      ...(isToday === "true" ? { isToday: true } : {}),
      ...(status ? { status } : { status: { not: "cancelled" } }),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const userId = getUserId();
  const body = await req.json();

  const task = await db.task.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? null,
      section: body.section ?? "today",
      priority: body.priority ?? "medium",
      isToday: body.isToday ?? false,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
