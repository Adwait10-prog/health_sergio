"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SECTIONS = [
  {
    title: "Net Worth",
    fields: [
      { key: "netWorthInr",       label: "Net worth (₹)"        },
      { key: "liquidCashInr",     label: "Liquid cash (₹)"      },
      { key: "monthlySavingsInr", label: "Monthly savings (₹)"  },
      { key: "emergencyFundMonths", label: "Emergency fund (months)" },
    ],
  },
  {
    title: "Income",
    fields: [
      { key: "salaryInr",      label: "Salary (₹)"         },
      { key: "freelanceInr",   label: "Freelance (₹)"      },
      { key: "sideProjectInr", label: "Side projects (₹)"  },
    ],
  },
  {
    title: "Investments",
    fields: [
      { key: "equityPortfolioInr",  label: "Equity portfolio (₹)" },
      { key: "mutualFundsInr",      label: "Mutual funds (₹)"     },
      { key: "sipContributionsInr", label: "SIP contributions (₹)"},
      { key: "goldInr",             label: "Gold (₹)"             },
    ],
  },
  {
    title: "Runway",
    fields: [
      { key: "burnRateInr",          label: "Monthly burn (₹)"     },
      { key: "personalRunwayMonths", label: "Runway (months)"      },
      { key: "startupCapitalInr",    label: "Startup capital (₹)"  },
      { key: "fiProgressPct",        label: "FI progress (%)"      },
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

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Monthly Snapshot</h2>
      <form onSubmit={save} className="flex flex-col gap-5">
        {SECTIONS.map(({ title, fields }) => (
          <div key={title}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>{title}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
                  <input
                    type="number" min={0} step="any"
                    value={values[key]}
                    onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg text-sm border"
                    style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any financial notes this month…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
            style={{ borderColor: "var(--border)", background: "var(--bg-soft)", color: "var(--text)" }}
          />
        </div>

        <button
          type="submit" disabled={status === "saving"}
          className="py-2 rounded-lg text-sm font-semibold"
          style={{
            background: status === "saved" ? "var(--accent-soft)" : "var(--finance)",
            color: status === "saved" ? "var(--accent-strong)" : "#fff",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save monthly snapshot"}
        </button>
      </form>
    </div>
  );
}
