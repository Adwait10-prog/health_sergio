"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SECTIONS = [
  {
    title: "Net Worth",
    fields: [
      { key: "netWorthInr",         label: "Net worth (₹)"           },
      { key: "liquidCashInr",       label: "Liquid cash (₹)"         },
      { key: "monthlySavingsInr",   label: "Monthly savings (₹)"     },
      { key: "emergencyFundMonths", label: "Emergency fund (months)"  },
    ],
  },
  {
    title: "Income",
    fields: [
      { key: "salaryInr",      label: "Salary (₹)"        },
      { key: "freelanceInr",   label: "Freelance (₹)"     },
      { key: "sideProjectInr", label: "Side projects (₹)" },
    ],
  },
  {
    title: "Investments",
    fields: [
      { key: "equityPortfolioInr",  label: "Equity portfolio (₹)"  },
      { key: "mutualFundsInr",      label: "Mutual funds (₹)"      },
      { key: "sipContributionsInr", label: "SIP contributions (₹)" },
      { key: "goldInr",             label: "Gold (₹)"              },
    ],
  },
  {
    title: "Runway",
    fields: [
      { key: "burnRateInr",          label: "Monthly burn (₹)"    },
      { key: "personalRunwayMonths", label: "Runway (months)"     },
      { key: "startupCapitalInr",    label: "Startup capital (₹)" },
      { key: "fiProgressPct",        label: "FI progress (%)"     },
    ],
  },
];

interface Props {
  existing: Record<string, unknown>;
}

export default function FinanceLogForm({ existing }: Props) {
  const router = useRouter();
  const allKeys = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(allKeys.map((key) => {
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
    allKeys.forEach((key) => {
      if (values[key] === "") return;
      const n = parseFloat(values[key]);
      if (!isNaN(n)) body[key] = n;
    });
    if (notes) body.notes = notes;
    await fetch("/api/log/finance", {
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
      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text)", margin: "0 0 16px" }}>Monthly Snapshot</h2>
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {SECTIONS.map(({ title, fields }) => (
          <div key={title}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 8px" }}>
              {title}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              {fields.map(({ key, label }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={values[key]}
                    onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any financial notes this month…"
            rows={2}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          style={{
            background: status === "saved" ? "var(--accent-soft)" : "var(--finance)",
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
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save monthly snapshot"}
        </button>
      </form>
    </div>
  );
}
