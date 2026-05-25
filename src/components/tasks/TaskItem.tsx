"use client";

import { useState } from "react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  section: string;
  dueDate: string | null;
  doneAt: string | null;
  isToday: boolean;
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   "#EF4444",
  medium: "var(--gold)",
  low:    "var(--text-muted)",
};

const SECTION_COLOR: Record<string, string> = {
  today:      "var(--accent)",
  technical:  "var(--technical)",
  founder:    "var(--founder)",
  finance:    "var(--finance)",
  fitness:    "var(--accent)",
  reflection: "var(--reflection)",
  learning:   "var(--gold)",
};

interface Props {
  task: Task;
  showSection?: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}

export default function TaskItem({ task, showSection = false, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const done = task.status === "done";

  async function toggle() {
    setLoading(true);
    const newStatus = done ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate(task.id, { status: newStatus, doneAt: newStatus === "done" ? new Date().toISOString() : null });
    setLoading(false);
  }

  async function cyclePriority() {
    const order = ["high", "medium", "low"];
    const next = order[(order.indexOf(task.priority) + 1) % order.length];
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: next }),
    });
    onUpdate(task.id, { priority: next });
  }

  return (
    <div
      className="flex items-center gap-2.5 py-2 px-1 rounded-lg group transition-colors hover:bg-[var(--bg-soft)]"
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {/* Checkbox */}
      <button
        onClick={toggle}
        className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
        style={{
          borderColor: done ? "var(--accent)" : "var(--border)",
          background: done ? "var(--accent)" : "transparent",
        }}
      >
        {done && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Priority dot */}
      <button
        onClick={cyclePriority}
        className="w-2 h-2 rounded-full shrink-0 transition-opacity opacity-70 hover:opacity-100"
        style={{ background: PRIORITY_COLOR[task.priority] ?? "var(--text-muted)" }}
        title={`Priority: ${task.priority} (click to change)`}
      />

      {/* Title */}
      <span
        className="flex-1 text-sm leading-snug"
        style={{
          color: done ? "var(--text-muted)" : "var(--text)",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>

      {/* Section tag */}
      {showSection && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            background: "var(--bg-soft)",
            color: SECTION_COLOR[task.section] ?? "var(--text-muted)",
          }}
        >
          {task.section}
        </span>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
          {format(new Date(task.dueDate), "d MMM")}
        </span>
      )}
    </div>
  );
}
