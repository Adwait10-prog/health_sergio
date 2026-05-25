"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS = [
  { key: "newPeopleMet",         label: "New people met"       },
  { key: "highValueConnections", label: "High-value connections" },
  { key: "followUpsDone",        label: "Follow-ups done"      },
  { key: "linkedinFollowers",    label: "LinkedIn followers"   },
  { key: "linkedinPosts",        label: "LinkedIn posts"       },
  { key: "ideasResearched",      label: "Ideas researched"     },
  { key: "validationCalls",      label: "Validation calls"     },
  { key: "investorOutreach",     label: "Investor outreach"    },
];

interface Props {
  existing: Record<string, unknown>;
}

export default function FounderLogForm({ existing }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map(({ key }) => {
      const v = existing[key] as number | null | undefined;
      return [key, v != null ? String(v) : ""];
    }))
  );
  const [notes, setNotes]   = useState((existing.notes as string) ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const body: Record<string, unknown> = {};
    FIELDS.forEach(({ key }) => {
      if (values[key] === "") return;
      const n = parseInt(values[key], 10);
      if (!isNaN(n)) body[key] = n;
    });
    if (notes) body.notes = notes;
    await fetch("/api/log/founder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Today's Log</h2>
      <form onSubmit={save} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input
                type="number" min={0}
                value={values[key]}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-lg text-sm border"
                style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Who did you meet? What did you pitch?"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
            style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
          />
        </div>
        <button
          type="submit" disabled={status === "saving"}
          className="py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: status === "saved" ? "var(--accent-soft)" : "var(--founder)",
            color: status === "saved" ? "var(--accent-strong)" : "#fff",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save founder log"}
        </button>
      </form>
    </div>
  );
}
