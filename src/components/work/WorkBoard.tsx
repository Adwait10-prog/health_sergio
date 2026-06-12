"use client";

import { useState } from "react";

interface AsanaTask {
  id: string;
  asanaGid: string;
  projectGid: string | null;
  name: string;
  notes: string | null;
  assigneeGid: string | null;
  assigneeName: string | null;
  status: string;
  completedAt: string | null;
  dueOn: string | null;
  sectionName: string | null;
  parentGid: string | null;
  permalink: string | null;
  isModifiedByBot: boolean;
  updatedAt: string;
}

interface AsanaProject {
  asanaGid: string;
  name: string;
  color: string | null;
  syncedAt: string | null;
  tasks: AsanaTask[];
}

interface AsanaMember {
  asanaGid: string;
  name: string;
  email: string | null;
  inStandup: boolean;
  syncedAt: string | null;
}

interface WebhookEvent {
  id: string;
  eventType: string;
  resourceGid: string;
  processed: boolean;
  error: string | null;
  receivedAt: string;
}

interface Props {
  projects: AsanaProject[];
  members: AsanaMember[];
  recentEvents: WebhookEvent[];
  stats: { totalIncomplete: number; totalProjects: number; standupCount: number };
}

// Map Asana color names to CSS colors
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function WorkBoard({ projects, members, recentEvents, stats }: Props) {
  const [activeProject, setActiveProject] = useState<string | null>(
    projects.length > 0 ? projects[0].asanaGid : null
  );
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [memberStates, setMemberStates] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map(m => [m.asanaGid, m.inStandup]))
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.asanaGid === activeProject);

  async function toggleStandup(member: AsanaMember) {
    const newVal = !memberStates[member.asanaGid];
    setUpdatingMember(member.asanaGid);
    setMemberStates(prev => ({ ...prev, [member.asanaGid]: newVal }));
    try {
      await fetch("/api/asana/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asanaGid: member.asanaGid, inStandup: newVal }),
      });
    } catch {
      // revert on error
      setMemberStates(prev => ({ ...prev, [member.asanaGid]: !newVal }));
    }
    setUpdatingMember(null);
  }

  async function runSync() {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/asana/sync-trigger", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg(`✓ Synced: ${data.projects} projects · ${data.tasks} tasks · ${data.members} members — refresh to see changes`);
      } else {
        setSyncMsg(`Error: ${data.error}`);
      }
    } catch (e) {
      setSyncMsg(`Error: ${String(e)}`);
    }
    setIsSyncing(false);
  }

  // Group tasks by section
  const tasksBySection = selectedProject
    ? selectedProject.tasks.reduce<Record<string, AsanaTask[]>>((acc, task) => {
        const section = task.sectionName ?? "No Section";
        if (!acc[section]) acc[section] = [];
        acc[section].push(task);
        return acc;
      }, {})
    : {};

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--technical)", margin: 0 }}>Work</h1>
            <a
              href="/work/insights"
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--technical)",
                textDecoration: "none", opacity: 0.75,
                padding: "3px 8px", borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-soft)",
              }}
            >
              Insights →
            </a>
          </div>
          <p style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)", margin: "2px 0 0" }}>
            Asana · {stats.totalProjects} projects · {stats.totalIncomplete} open tasks · {stats.standupCount} in standup
          </p>
        </div>
        <button
          onClick={runSync}
          disabled={isSyncing}
          style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: isSyncing ? "var(--bg-soft)" : "var(--technical)",
            color: isSyncing ? "var(--text-3)" : "#fff",
            border: "none", cursor: isSyncing ? "not-allowed" : "pointer",
          }}
        >
          {isSyncing ? "Syncing..." : "↻ Sync Asana"}
        </button>
      </div>

      {syncMsg && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: syncMsg.startsWith("Error") ? "#FFF5F5" : "#F0FFF4",
          color: syncMsg.startsWith("Error") ? "#C0392B" : "#27AE60",
          border: `1px solid ${syncMsg.startsWith("Error") ? "#FBBCBA" : "#9AE6B4"}`,
        }}>
          {syncMsg}
        </div>
      )}

      {/* 3-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 280px", gap: 20, alignItems: "start" }}>

        {/* Left: Projects list + Standup selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Projects */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Projects ({projects.length})
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {projects.length === 0 ? (
                <p style={{ padding: "14px", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Click Sync Asana to load projects.
                </p>
              ) : (
                projects.map(p => {
                  const active = activeProject === p.asanaGid;
                  const color = getProjectColor(p.color);
                  return (
                    <button
                      key={p.asanaGid}
                      onClick={() => setActiveProject(p.asanaGid)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 14px", background: active ? "var(--bg-soft)" : "transparent",
                        border: "none", cursor: "pointer", textAlign: "left",
                        borderLeft: active ? `3px solid ${color}` : "3px solid transparent",
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: color, flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        color: active ? "var(--text-1)" : "var(--text-2)",
                        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-4)", flexShrink: 0 }}>
                        {p.tasks.length}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Standup selector */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Standup · {members.filter(m => memberStates[m.asanaGid]).length} selected
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {members.length === 0 ? (
                <p style={{ padding: 14, fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Sync to load members
                </p>
              ) : (
                members.map(m => {
                  const active = memberStates[m.asanaGid];
                  return (
                    <button
                      key={m.asanaGid}
                      onClick={() => toggleStandup(m)}
                      disabled={updatingMember === m.asanaGid}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 14px", background: "transparent",
                        border: "none", cursor: "pointer", textAlign: "left",
                        opacity: updatingMember === m.asanaGid ? 0.5 : 1,
                      }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${active ? "var(--technical)" : "var(--border)"}`,
                        background: active ? "var(--technical)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 10, fontWeight: 700, transition: "all 0.15s",
                      }}>
                        {active ? "✓" : ""}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: active ? 600 : 400,
                          color: "var(--text-1)", margin: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {m.name}
                        </p>
                        {m.email && (
                          <p style={{ fontSize: 10, color: "var(--text-4)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.email}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>
                In morning WhatsApp brief
              </p>
            </div>
          </div>
        </div>

        {/* Center: Task board */}
        <div>
          {selectedProject ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Project header */}
              <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: getProjectColor(selectedProject.color), flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
                      {selectedProject.name}
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {selectedProject.tasks.length} open tasks
                      {selectedProject.syncedAt ? ` · synced ${timeAgo(selectedProject.syncedAt)}` : ""}
                    </p>
                  </div>
                  <a
                    href={`https://app.asana.com/0/${selectedProject.asanaGid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "var(--technical)", textDecoration: "none", fontWeight: 600, flexShrink: 0 }}
                  >
                    Open in Asana ↗
                  </a>
                </div>
              </div>

              {/* Sections + tasks */}
              {Object.entries(tasksBySection).length === 0 ? (
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "40px 16px", textAlign: "center",
                }}>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                    No open tasks in this project 🎉
                  </p>
                </div>
              ) : (
                Object.entries(tasksBySection).map(([section, tasks]) => (
                  <div key={section} style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 12, overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "10px 14px", borderBottom: "1px solid var(--border-light)",
                      background: "var(--bg-soft)",
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                        {section} · {tasks.length}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {tasks.map((task, i) => (
                        <TaskRow key={task.asanaGid} task={task} isLast={i === tasks.length - 1} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "40px 16px", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                {projects.length === 0
                  ? "No Asana data — click Sync Asana to load."
                  : "Select a project from the left."}
              </p>
            </div>
          )}
        </div>

        {/* Right: Activity feed + Bot info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Bot activity */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Bot Activity
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentEvents.length === 0 ? (
                <p style={{ padding: 14, fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  No webhook events yet
                </p>
              ) : (
                recentEvents.map(event => (
                  <div key={event.id} style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-light)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: event.error ? "#E74C3C" : event.processed ? "#27AE60" : "#F39C12",
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {event.eventType}
                      </span>
                    </div>
                    {event.error && (
                      <p style={{ fontSize: 11, color: "#E74C3C", margin: "2px 0 0", paddingLeft: 12 }}>
                        {event.error.slice(0, 60)}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: "var(--text-4)", margin: "2px 0 0", paddingLeft: 12 }}>
                      {timeAgo(event.receivedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bot capabilities */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                AI Bot Capabilities
              </p>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              <BotCapability icon="✍️" label="Ticket Writer" desc="Expands thin descriptions on task creation" />
              <BotCapability icon="⚠️" label="Quality Checker" desc="Flags missing fields on Ready for Dev" />
              <BotCapability icon="📊" label="Effort Suggester" desc="S/M/L estimate on every new task" />
              <BotCapability icon="⚡" label="Subtask Generator" desc="Breaks task into subtasks, assigns to team" />
              <BotCapability icon="🧑‍💼" label="Morning Standup" desc="Team tasks in daily WhatsApp brief" />
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{
                padding: "8px 12px", borderRadius: 8, fontSize: 11,
                background: "var(--bg-soft)", color: "var(--text-3)",
              }}>
                <strong>Webhook URL:</strong><br />
                <span style={{ fontFamily: "monospace", fontSize: 10 }}>
                  /api/asana/webhook
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, isLast }: { task: AsanaTask; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [generatingSubtasks, setGeneratingSubtasks] = useState(false);
  const [subtaskResult, setSubtaskResult] = useState<Array<{ title: string; assignee: string }> | null>(null);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);

  const isOverdue = task.dueOn && new Date(task.dueOn) < new Date();

  async function generateSubtasks(e: React.MouseEvent) {
    e.stopPropagation();
    setGeneratingSubtasks(true);
    setSubtaskError(null);
    setSubtaskResult(null);
    try {
      const res = await fetch("/api/asana/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskGid: task.asanaGid }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubtaskResult(data.subtasks);
      } else {
        setSubtaskError(data.error ?? "Unknown error");
      }
    } catch (err) {
      setSubtaskError(String(err));
    }
    setGeneratingSubtasks(false);
  }

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--border-light)" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 14px", background: "transparent",
          border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        {/* Checkbox-style circle */}
        <span style={{
          width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 2,
          border: "2px solid var(--border)", background: "transparent",
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 500, color: "var(--text-1)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap",
          }}>
            {task.name}
            {task.isModifiedByBot && (
              <span style={{ marginLeft: 6, fontSize: 10, color: "var(--technical)", fontWeight: 600 }}>🤖</span>
            )}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            {task.assigneeName && (
              <span style={{ fontSize: 11, color: "var(--text-4)" }}>{task.assigneeName}</span>
            )}
            {task.dueOn && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: isOverdue ? "#E74C3C" : "var(--text-4)",
              }}>
                {isOverdue ? "⚠ " : ""}{task.dueOn}
              </span>
            )}
          </div>
        </div>

        <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0, marginTop: 3 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div style={{
          padding: "0 14px 14px 40px",
          fontSize: 12, color: "var(--text-2)", lineHeight: 1.7,
          background: "var(--bg-soft)",
        }}>
          {task.notes ? (
            <div style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>
              {task.notes.slice(0, 600)}
              {task.notes.length > 600 && "…"}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic", marginBottom: 10 }}>No description</div>
          )}

          {/* Actions row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <a
              href={task.permalink ?? `https://app.asana.com/0/0/${task.asanaGid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--technical)", textDecoration: "none", fontWeight: 600, fontSize: 11 }}
            >
              Open in Asana ↗
            </a>

            <button
              onClick={generateSubtasks}
              disabled={generatingSubtasks}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: generatingSubtasks ? "var(--bg-soft)" : "var(--technical)",
                color: generatingSubtasks ? "var(--text-3)" : "#fff",
                border: "none", cursor: generatingSubtasks ? "not-allowed" : "pointer",
              }}
            >
              {generatingSubtasks ? "Generating…" : "⚡ Generate Subtasks"}
            </button>
          </div>

          {/* Subtask results */}
          {subtaskError && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#FFF5F5", color: "#C0392B", fontSize: 12 }}>
              Error: {subtaskError}
            </div>
          )}

          {subtaskResult && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                {subtaskResult.length} subtasks created in Asana ✓
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {subtaskResult.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", borderRadius: 6,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: "var(--text-1)", flex: 1 }}>{s.title}</span>
                    <span style={{ fontSize: 11, color: "var(--technical)", fontWeight: 600, flexShrink: 0 }}>→ {s.assignee}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BotCapability({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 0" }}>{desc}</p>
      </div>
    </div>
  );
}
