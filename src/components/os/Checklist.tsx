"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/lib/osData";

interface Props {
  listKey: string;
  items: ChecklistItem[];
  initialDone: Record<string, boolean>;
  columns?: 1 | 2;
}

export default function Checklist({ listKey, items, initialDone, columns = 1 }: Props) {
  const [done, setDone] = useState<Record<string, boolean>>(initialDone);

  async function toggle(id: string) {
    const next = !done[id];
    setDone(prev => ({ ...prev, [id]: next }));
    try {
      const res = await fetch("/api/os/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listKey, itemId: id, done: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setDone(prev => ({ ...prev, [id]: !next })); // revert
    }
  }

  const doneCount = items.filter(i => done[i.id]).length;

  return (
    <div>
      <div
        className={columns === 2 ? "os-two-col" : undefined}
        style={{ display: "grid", gridTemplateColumns: columns === 2 ? "1fr 1fr" : "1fr", gap: "0 20px" }}
      >
        {items.map(item => {
          const isDone = !!done[item.id];
          return (
            <label key={item.id} style={{
              display: "flex", alignItems: "flex-start", gap: 9, padding: "6px 0",
              borderBottom: "1px dashed var(--border)", fontSize: 13, cursor: "pointer",
              color: isDone ? "var(--text-4)" : "var(--text-1)",
              textDecoration: isDone ? "line-through" : "none",
            }}>
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggle(item.id)}
                style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--c-fitness)" }}
              />
              <span style={{ lineHeight: 1.4 }}>{item.label}</span>
            </label>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 8 }}>
        {doneCount} of {items.length} done
      </div>
    </div>
  );
}
