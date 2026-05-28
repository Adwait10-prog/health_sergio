import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay } from "date-fns";
import FinanceLogForm from "@/components/finance/FinanceLogForm";
import NetWorthChart from "@/components/finance/NetWorthChart";
import PageSidebar from "@/components/layout/PageSidebar";

export const dynamic = "force-dynamic";

function runwayColor(months: number) {
  if (months >= 12) return "var(--accent)";
  if (months >= 6)  return "var(--gold)";
  return "var(--warn)";
}

function fmtInr(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

export default async function FinancePage() {
  const userId = getUserId();

  const now = new Date();
  const thisMonth = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const [thisMonthLog, last12Logs] = await Promise.all([
    db.financeLog.findFirst({ where: { userId, date: thisMonth } }),
    db.financeLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      take: 12,
    }),
  ]);

  const latest = last12Logs[last12Logs.length - 1] ?? null;
  const netWorth = latest?.netWorthInr ?? null;
  const runway   = latest?.personalRunwayMonths ?? null;
  const fiPct    = latest?.fiProgressPct ?? null;

  const topStats = [
    { label: "Net Worth",       value: fmtInr(netWorth),                         color: "var(--finance)"  },
    { label: "Liquid Cash",     value: fmtInr(latest?.liquidCashInr ?? null),    color: "var(--text)"     },
    { label: "Monthly Savings", value: fmtInr(latest?.monthlySavingsInr ?? null), color: "var(--accent)"  },
    { label: "FI Progress",     value: fiPct != null ? `${fiPct}%` : "—",        color: "var(--gold)"     },
  ];

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--finance)", margin: 0 }}>Finance</h1>
        <p style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)", margin: "2px 0 0" }}>Monthly wealth snapshot</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Top stats + runway */}
          <div
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {topStats.map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--bg-soft)", borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 12, marginBottom: 2, color: "var(--text-muted)", margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, color, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Runway card */}
            <div
              style={{
                background: "var(--bg-soft)",
                border: `1px solid ${runway != null ? runwayColor(runway) : "var(--border)"}`,
                borderRadius: 8,
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 2px" }}>Personal Runway</p>
                <p style={{ fontSize: 24, fontWeight: 700, marginTop: 2, color: runway != null ? runwayColor(runway) : "var(--text-muted)", margin: 0 }}>
                  {runway != null ? `${runway} months` : "—"}
                </p>
              </div>
              {runway != null && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: 9999,
                    background: runwayColor(runway) + "20",
                    color: runwayColor(runway),
                  }}
                >
                  {runway >= 12 ? "Safe ✓" : runway >= 6 ? "Watch" : "Critical ⚠"}
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <FinanceLogForm existing={(thisMonthLog ?? {}) as Record<string, unknown>} />

          {/* Net worth chart */}
          <div
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
          >
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text)", margin: "0 0 16px" }}>Net Worth — last 12 months</h2>
            <NetWorthChart data={last12Logs} />
          </div>
        </div>

        <PageSidebar section="finance" accentColor="var(--c-finance)" />
      </div>
    </div>
  );
}
