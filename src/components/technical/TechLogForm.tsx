"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Field { key: string; label: string; max?: number }

const FIELDS: Field[] = [
  { key: "hoursCodedMin",      label: "Hours coded",        max: 960 },
  { key: "featuresShipped",    label: "Features shipped",   max: 20  },
  { key: "bugsFixed",          label: "Bugs fixed",         max: 50  },
  { key: "aiAgentsBuilt",      label: "AI agents built",    max: 20  },
  { key: "promptsEngineered",  label: "Prompts engineered", max: 50  },
  { key: "systemDesignsDone",  label: "System designs",     max: 10  },
  { key: "prsMerged",          label: "PRs merged",         max: 20  },
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

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-soft)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "var(--text)",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <div
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text)", margin: "0 0 12px" }}>Today's Log</h2>
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="number"
                min={0}
                step={key === "hoursCodedMin" ? "0.5" : "1"}
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={key === "hoursCodedMin" ? "0.0 hrs" : "0"}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you build today?"
            rows={2}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          style={{
            background: status === "saved" ? "var(--accent-soft)" : "var(--accent)",
            color: status === "saved" ? "var(--accent-strong)" : "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 700,
            width: "100%",
            cursor: "pointer",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save technical log"}
        </button>
      </form>
    </div>
  );
}
