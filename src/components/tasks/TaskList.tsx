"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import TaskItem from "./TaskItem";

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

interface Props {
  initialTasks: Task[];
  section?: string;    // filter to this section if set
  isToday?: boolean;   // filter to isToday=true if set
  showSection?: boolean;
  defaultSection?: string; // section to assign to new tasks
}

export default function TaskList({
  initialTasks,
  section,
  isToday,
  showSection = false,
  defaultSection = "today",
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when server re-renders with fresh initialTasks (e.g. after router.refresh())
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  // Keyboard shortcut: press 't' anywhere to focus the input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleUpdate = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        section: section ?? defaultSection,
        isToday: isToday ?? false,
      }),
    });
    const task = await res.json();
    setTasks((prev) => [...prev, task]);
    setNewTitle("");
    setAdding(false);
  }

  const visible = tasks.filter((t) => t.status !== "cancelled");
  const active = visible.filter((t) => t.status !== "done");
  const done = visible.filter((t) => t.status === "done");
  // Show only last 5 done tasks, rest hidden behind scroll
  const DONE_VISIBLE = 5;
  const doneVisible = done.slice(-DONE_VISIBLE);
  const doneHidden = done.length - doneVisible.length;

  return (
    <div className="flex flex-col gap-1">
      {/* Active tasks */}
      {active.length === 0 && (
        <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>
          No tasks yet — add one below
        </p>
      )}
      {active.map((t) => (
        <TaskItem key={t.id} task={t} showSection={showSection} onUpdate={handleUpdate} />
      ))}

      {/* Done tasks — last 5 visible, rest scrollable */}
      {done.length > 0 && (
        <div className="mt-1 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          {doneHidden > 0 && (
            <p className="text-xs py-1 px-1" style={{ color: "var(--text-muted)" }}>
              +{doneHidden} more completed
            </p>
          )}
          {doneVisible.map((t) => (
            <TaskItem key={t.id} task={t} showSection={showSection} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* Add task input */}
      <form onSubmit={addTask} className="flex items-center gap-2 mt-2">
        <Plus size={14} className="shrink-0" style={{ color: "var(--text-muted)" }} />
        <input
          ref={inputRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add task… (press T)"
          disabled={adding}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--text-muted)]"
          style={{ color: "var(--text)" }}
        />
        {newTitle.trim() && (
          <button
            type="submit"
            disabled={adding}
            className="text-xs px-2 py-0.5 rounded-md font-medium"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          >
            Add
          </button>
        )}
      </form>
    </div>
  );
}
