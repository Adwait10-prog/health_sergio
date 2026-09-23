"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/lib/osData";

interface Props {
  listKey: string;
  items: ChecklistItem[];
  initialDone: Record<string, boolean>;
  columns?: 1 | 2;
  hideCount?: boolean;
}

export default function Checklist({ listKey, items, initialDone, columns = 1, hideCount = false }: Props) {
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
      <ul
        className={`check${columns === 2 ? " os-two-col" : ""}`}
        style={columns === 2 ? { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 20 } : undefined}
      >
        {items.map(item => (
          <li key={item.id}>
            <label style={{ display: "contents", cursor: "pointer" }}>
              <input type="checkbox" checked={!!done[item.id]} onChange={() => toggle(item.id)} />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      {!hideCount && <div className="meta" style={{ marginTop: 8 }}>{doneCount} of {items.length} done</div>}
    </div>
  );
}
