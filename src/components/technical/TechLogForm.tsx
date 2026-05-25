"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Field { key: string; label: string; max?: number }

const FIELDS: Field[] = [
  { key: "hoursCodedMin", label: "Hours coded",          max: 960 }, // stored as minutes
  { key: "featuresShipped",   label: "Features shipped",     max: 20  },
  { key: "bugsFixed",         label: "Bugs fixed",           max: 50  },
  { key: "aiAgentsBuilt",     label: "AI agents built",      max: 20  },
  { key: "promptsEngineered", label: "Prompts engineered",   max: 50  },
  { key: "systemDesignsDone", label: "System designs",       max: 10  },
  { key: "prsMerged",         label: "PRs merged",           max: 20  },
];

interface Props {
  existing: Record<string, unknown>;
}

export default function TechLogForm({ existing }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    FIELDS.forEach(({ key }) => {
      const v = existing[key] as number | null | undefined;
      if (key === "hoursCodedMin") {
        init[key] = v != null ? String(Math.round(v / 60 * 10) / 10) : "";
      } else {
        init[key] = v != null ? String(v) : "";
      }
    });
    return init;
  });
  const [notes, setNotes] = useState(existing.notes as string ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  function set(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const body: Record<string, number | string | undefined> = {};
    FIELDS.forEach(({ key }) => {
      if (values[key] === "") return;
      const n = parseFloat(values[key]);
      if (isNaN(n)) return;
      // convert hours back to minutes for storage
      body[key] = key === "hoursCodedMin" ? Math.round(n * 60) : Math.round(n);
    });
    if (notes) body.notes = notes;

    await fetch("/api/log/technical", {
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                {label}
              </label>
              <input
                type="number"
                min={0}
                step={key === "hoursCodedMin" ? "0.5" : "1"}
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={key === "hoursCodedMin" ? "0.0 hrs" : "0"}
                className="w-full px-2.5 py-1.5 rounded-lg text-sm border"
                style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you build today?"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
            style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: status === "saved" ? "var(--accent-soft)" : "var(--accent)",
            color: status === "saved" ? "var(--accent-strong)" : "#fff",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save technical log"}
        </button>
      </form>
    </div>
  );
}
