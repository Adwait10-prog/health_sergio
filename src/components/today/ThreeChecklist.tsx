"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TodaysThree from "@/components/os/TodaysThree";

// Today's three as ticks. Lines come from the "three" note; ticks are per day (listKey three:YYYY-MM-DD).
export default function ThreeChecklist({ lines, initialDone, listKey, written, text }: {
  lines: string[];
  initialDone: Record<string, boolean>;
  listKey: string;
  written: string | null;
  text: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [editing, setEditing] = useState(lines.length === 0);

  async function toggle(id: string) {
    const next = !done[id];
    setDone(p => ({ ...p, [id]: next }));
    const res = await fetch("/api/os/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listKey, itemId: id, done: next }),
    }).catch(() => null);
    if (!res?.ok) setDone(p => ({ ...p, [id]: !next }));
  }

  const count = lines.filter((_, i) => done[String(i)]).length;

  return (
    <section className="card">
      <div className="card-h">
        <span className="eyebrow">Today&rsquo;s three</span>
        <span style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
          {lines.length > 0 && <span className="meta">{written ? `${written} · ` : ""}{count}/{lines.length}</span>}
          <button className="btn sm ghost" onClick={() => { if (editing) router.refresh(); setEditing(e => !e); }}>
            {editing ? "Done" : "Edit"}
          </button>
        </span>
      </div>
      {editing ? (
        <TodaysThree initialText={text} compact />
      ) : (
        <ul className="check">
          {lines.map((l, i) => {
            const [what, ...who] = l.split(/\s+[—·]\s+/);
            return (
              <li key={i}>
                <label style={{ display: "contents", cursor: "pointer" }}>
                <input type="checkbox" checked={!!done[String(i)]} onChange={() => toggle(String(i))} />
                <span>
                  <b style={{ fontWeight: 500 }}>{what}</b>
                  {who.length > 0 && <span className="meta" style={{ display: "block" }}>{who.join(" · ")}</span>}
                </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
