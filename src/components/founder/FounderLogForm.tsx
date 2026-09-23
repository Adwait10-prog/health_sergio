"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS = [
  { key: "newPeopleMet",         label: "New people met"        },
  { key: "highValueConnections", label: "High-value connections" },
  { key: "followUpsDone",        label: "Follow-ups done"       },
  { key: "linkedinFollowers",    label: "LinkedIn followers"    },
  { key: "linkedinPosts",        label: "LinkedIn posts"        },
  { key: "ideasResearched",      label: "Ideas researched"      },
  { key: "validationCalls",      label: "Validation calls"      },
  { key: "investorOutreach",     label: "Investor outreach"     },
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

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-s)",
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
      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: 16 }}
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
                value={values[key]}
                onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                placeholder="0"
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
            placeholder="Who did you meet? What did you pitch?"
            rows={2}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>
        <button
          type="submit"
          disabled={status === "saving"}
          className="btn primary"
          style={{
            width: "100%",
            justifyContent: "center",
            fontWeight: 600,
            opacity: status === "saving" ? 0.7 : 1,
            ...(status === "saved" ? { background: "var(--ok-soft)", borderColor: "transparent", color: "var(--ok)" } : {}),
          }}
        >
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save founder log"}
        </button>
      </form>
    </div>
  );
}
