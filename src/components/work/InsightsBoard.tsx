"use client";

import type { InsightsData, ProjectRow, AssigneeRow } from "@/app/work/insights/page";

// ── Asana color map (reused from WorkBoard) ────────────────────────────────
const ASANA_COLORS: Record<string, string> = {
  "dark-pink": "#E8385A",
  "dark-green": "#28B463",
  "dark-blue": "#2E75FF",
  "dark-purple": "#9A5ADB",
  "dark-orange": "#E04E17",
  "dark-teal": "#11A9A1",
  "dark-red": "#CE2442",
  "dark-brown": "#7C5229",
  "dark-warm-gray": "#8C8C8C",
  "light-pink": "#EF9EA6",
  "light-green": "#6FE1A0",
  "light-blue": "#91C7FF",
  "light-purple": "#C49EE7",
  "light-orange": "#F9B56E",
  "light-teal": "#62C7C3",
  "light-red": "#F6A3B2",
  "light-warm-gray": "#C7C7C7",
  "light-yellow": "#F8E07C",
};

function getProjectColor(color: string | null): string {
  if (!color) return "var(--text-3)";
  return ASANA_COLORS[color] ?? "var(--text-3)";
}

// ── Shared card style ──────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "14px 16px",
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 14,
};

// ── Inline bar ─────────────────────────────────────────────────────────────
function InlineBar({ fill, color }: { fill: number; color: string }) {
  const pct = Math.max(0, Math.min(1, fill));
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: "var(--border)",
        overflow: "hidden",
        minWidth: 60,
        flex: 1,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.round(pct * 100)}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

// ── Project card ───────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: ProjectRow }) {
  const color = getProjectColor(project.color);
  const denominator = project.openCount + project.completedLast7Days;
  const fillRatio = denominator > 0 ? project.openCount / denominator : 0;

  return (
    <div
      style={{
        ...CARD,
        minWidth: 200,
        flex: "1 1 200px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Project name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.name}
        </span>
      </div>

      {/* Big open count */}
      <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>
        {project.openCount}
        <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", marginLeft: 4 }}>
          open
        </span>
      </div>

      {/* Overdue + completed */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {project.overdueCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#E74C3C" }}>
            {project.overdueCount} overdue
          </span>
        )}
        {project.completedLast7Days > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            +{project.completedLast7Days} done (7d)
          </span>
        )}
        {project.overdueCount === 0 && project.completedLast7Days === 0 && (
          <span style={{ fontSize: 12, color: "var(--text-4)" }}>no recent activity</span>
        )}
      </div>

      {/* Progress bar: open / (open + completed7d) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <InlineBar fill={fillRatio} color={color} />
        {denominator > 0 && (
          <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0 }}>
            {Math.round(fillRatio * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Assignee table row ─────────────────────────────────────────────────────
function AssigneeRow({
  row,
  isLast,
  isUnassigned,
}: {
  row: AssigneeRow;
  isLast: boolean;
  isUnassigned?: boolean;
}) {
  const ageColor =
    row.avgAgeDays > 14
      ? "#E74C3C"
      : row.avgAgeDays > 7
      ? "var(--warn)"
      : "var(--text-2)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 80px 80px",
        gap: 8,
        padding: "10px 0",
        borderBottom: isLast ? "none" : "1px solid var(--border-light)",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: isUnassigned ? 400 : 500,
          color: isUnassigned ? "var(--text-3)" : "var(--text-1)",
          fontStyle: isUnassigned ? "italic" : "normal",
        }}
      >
        {row.name}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-1)",
          textAlign: "right",
        }}
      >
        {row.openCount}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: row.overdueCount > 0 ? 600 : 400,
          color: row.overdueCount > 0 ? "#E74C3C" : "var(--text-4)",
          textAlign: "right",
        }}
      >
        {row.overdueCount > 0 ? row.overdueCount : "—"}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: row.avgAgeDays > 7 ? 600 : 400,
          color: ageColor,
          textAlign: "right",
        }}
      >
        {row.openCount > 0 ? `${row.avgAgeDays}d` : "—"}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function InsightsBoard({ data }: { data: InsightsData }) {
  const { assignees, projects, botStats, unassignedCount } = data;

  const unassignedRow: AssigneeRow = {
    name: "Unassigned",
    asanaGid: null,
    openCount: unassignedCount,
    overdueCount: 0,
    avgAgeDays: 0,
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <a
            href="/work"
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Work
          </a>
          <span style={{ fontSize: 13, color: "var(--text-4)" }}>›</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--technical)", margin: 0 }}>
            Insights
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          {projects.length} projects · {assignees.length} assignees ·{" "}
          {assignees.reduce((s, a) => s + a.openCount, 0) + unassignedCount} open tasks
        </p>
      </div>

      {/* ── Section 1: Project Health ────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <p style={SECTION_LABEL}>Project Health</p>
        {projects.length === 0 ? (
          <div style={{ ...CARD, color: "var(--text-muted)", fontSize: 13 }}>
            No project data — sync Asana first.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              overflowX: "auto",
            }}
          >
            {projects.map(p => (
              <ProjectCard key={p.asanaGid} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: By Assignee ───────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <p style={SECTION_LABEL}>By Assignee</p>
        <div style={CARD}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 80px",
              gap: 8,
              paddingBottom: 8,
              borderBottom: "1px solid var(--border)",
              marginBottom: 2,
            }}
          >
            {["Name", "Open", "Overdue", "Avg age"].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: i > 0 ? "right" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {assignees.length === 0 && unassignedCount === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>
              No open tasks.
            </p>
          ) : (
            <>
              {assignees.map((row, i) => (
                <AssigneeRow
                  key={row.asanaGid ?? row.name}
                  row={row}
                  isLast={i === assignees.length - 1 && unassignedCount === 0}
                />
              ))}
              {unassignedCount > 0 && (
                <AssigneeRow row={unassignedRow} isLast isUnassigned />
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Section 3: Bot Stats ─────────────────────────────────────── */}
      <section>
        <p style={SECTION_LABEL}>Bot Stats</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatChip
            label="Tickets auto-expanded"
            value={botStats.ticketsExpanded}
            valueColor="var(--technical)"
          />
          <StatChip
            label="Events processed"
            value={botStats.eventsProcessed}
            valueColor="var(--accent)"
          />
          <StatChip
            label="Errors"
            value={botStats.eventsErrored}
            valueColor={botStats.eventsErrored > 0 ? "#E74C3C" : "var(--text-3)"}
          />
        </div>
      </section>
    </div>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
  valueColor: string;
}) {
  return (
    <div
      style={{
        ...CARD,
        flex: "1 1 160px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 140,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 800, color: valueColor, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}
