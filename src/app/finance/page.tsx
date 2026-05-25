import { db } from "@/lib/db";
import { getUserId } from "@/lib/user";
import { startOfDay } from "date-fns";
import FinanceLogForm from "@/components/finance/FinanceLogForm";
import NetWorthChart from "@/components/finance/NetWorthChart";
import TaskList from "@/components/tasks/TaskList";

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

  // First of this month for upsert lookup
  const now = new Date();
  const thisMonth = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const [thisMonthLog, last12Logs, tasks] = await Promise.all([
    db.financeLog.findFirst({ where: { userId, date: thisMonth } }),
    db.financeLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      take: 12,
    }),
    db.task.findMany({
      where: { userId, section: "finance", status: { not: "cancelled" } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const latest = last12Logs[last12Logs.length - 1] ?? null;
  const netWorth = latest?.netWorthInr ?? null;
  const runway   = latest?.personalRunwayMonths ?? null;
  const fiPct    = latest?.fiProgressPct ?? null;

  const topStats = [
    { label: "Net Worth",       value: fmtInr(netWorth),                    color: "var(--finance)"  },
    { label: "Liquid Cash",     value: fmtInr(latest?.liquidCashInr ?? null), color: "var(--text)"   },
    { label: "Monthly Savings", value: fmtInr(latest?.monthlySavingsInr ?? null), color: "var(--accent)" },
    { label: "FI Progress",     value: fiPct != null ? `${fiPct}%` : "—",   color: "var(--gold)"     },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--finance)" }}>Finance</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Monthly wealth snapshot</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="flex flex-col gap-4">

          {/* Top stats + runway */}
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {topStats.map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg-soft)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-lg font-bold leading-tight" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Runway card */}
            <div
              className="rounded-lg p-3 flex items-center justify-between"
              style={{ background: "var(--bg-soft)", border: `1px solid ${runway != null ? runwayColor(runway) : "var(--border)"}20` }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Personal Runway</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: runway != null ? runwayColor(runway) : "var(--text-muted)" }}>
                  {runway != null ? `${runway} months` : "—"}
                </p>
              </div>
              {runway != null && (
                <div
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
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
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Net Worth — last 12 months</h2>
            <NetWorthChart data={last12Logs} />
          </div>
        </div>

        {/* Right column — tasks */}
        <div
          className="rounded-xl p-4 h-fit lg:sticky lg:top-6"
          style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Finance Tasks</h2>
          <TaskList
            initialTasks={tasks as any}
            section="finance"
            defaultSection="finance"
          />
        </div>
      </div>
    </div>
  );
}
