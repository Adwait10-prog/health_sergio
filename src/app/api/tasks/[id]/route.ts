import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId();
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "done") data.doneAt = new Date();
    if (body.status !== "done") data.doneAt = null;
  }
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.isToday !== undefined) data.isToday = body.isToday;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.title !== undefined) data.title = body.title;

  const task = await db.task.update({
    where: { id, userId },
    data,
  });

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId();
  const { id } = await params;

  await db.task.update({
    where: { id, userId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
