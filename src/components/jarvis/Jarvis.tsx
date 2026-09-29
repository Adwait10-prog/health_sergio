"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

type Line = { role: "user" | "agent"; text: string };
type Mode = "morning" | "evening" | "open";

const PAGES: Record<string, string> = {
  today: "/", os: "/os", fitness: "/fitness", technical: "/technical", work: "/work",
  founder: "/founder", finance: "/finance", reflection: "/reflection", meetings: "/meetings",
};

// Jarvis — voice conversation with the OS (ElevenAgents). Mounted once in the layout;
// opened by the launcher, the J key, or any `os:jarvis` event.
export default function Jarvis() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <ConversationProvider>
      <JarvisPanel />
    </ConversationProvider>
  );
}

const pageName = (path: string) =>
  Object.entries(PAGES).find(([, href]) => href === path)?.[0] ?? path.replace(/^\//, "").replace(/\//g, " ");

// Visible text of the page (the Jarvis panel lives outside .app-main, so it isn't included)
function screenText(): string {
  const main = document.querySelector(".app-main") as HTMLElement | null;
  const text = (main?.innerText ?? "").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  return text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
}

function JarvisPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const convId = useRef<string | null>(null);
  const linesRef = useRef<Line[]>([]);
  const orb = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the transcript on the server as the conversation goes (and once more at the end)
  const save = useCallback((ended = false) => {
    if (!convId.current || linesRef.current.length === 0) return;
    const body = JSON.stringify({ conversationId: convId.current, messages: linesRef.current, ended });
    // keepalive lets the final save finish even if the tab navigates or closes
    fetch("/api/agent/transcript", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: ended }).catch(() => {});
  }, []);

  const conversation = useConversation({
    clientTools: {
      navigate: ({ page }: { page: string }) => {
        const href = PAGES[page];
        if (href) router.push(href);
        return href ? `Opened ${page}.` : `No page called ${page}.`;
      },
      refresh_view: () => { router.refresh(); return "Refreshed."; },
      read_screen: () => `Page: ${pageName(window.location.pathname)}\n${screenText() || "(empty)"}`,
    },
    onConnect: ({ conversationId }) => {
      convId.current = conversationId;
      setError(null);
      try { conversation.sendContextualUpdate(`He has the ${pageName(window.location.pathname)} page open.`); } catch { /* not ready */ }
    },
    onMessage: ({ message, role }) => {
      if (!message?.trim()) return;
      const next = [...linesRef.current, { role, text: message }];
      linesRef.current = next;
      setLines(next);
      if (role === "agent") save();
    },
    onDisconnect: () => { save(true); router.refresh(); },
    onError: (message) => setError(typeof message === "string" ? message : "Something went wrong."),
  });
  const { status, isSpeaking, isMuted, setMuted } = conversation;
  const live = status === "connected";

  // Tell Jarvis when he switches pages mid-conversation (no reply triggered)
  const lastPage = useRef(pathname);
  useEffect(() => {
    if (!live || lastPage.current === pathname) return;
    lastPage.current = pathname;
    try { conversation.sendContextualUpdate(`He switched to the ${pageName(pathname)} page.`); } catch { /* disconnected */ }
  }, [pathname, live, conversation]);

  const start = useCallback(async (mode: Mode = "open") => {
    setError(null);
    linesRef.current = [];
    setLines([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access is blocked — allow it in the browser to talk.");
      return;
    }
    const res = await fetch(`/api/agent/session?mode=${mode}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Couldn't start Jarvis."); return; }
    try {
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
        dynamicVariables: data.dynamicVariables,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect.");
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    save(true); // don't rely on the disconnect callback firing before the tab moves on
    try { conversation.endSession(); } catch { /* already closed */ }
  }, [conversation, save]);

  const toggle = useCallback(() => {
    if (!open) {
      setOpen(true);
      if (status === "disconnected") void start();
    } else {
      setOpen(false);
      if (status !== "disconnected") void stop();
    }
  }, [open, status, start, stop]);

  // J key / os:jarvis event
  useEffect(() => {
    const onEvt = (e: Event) => {
      const mode = (e as CustomEvent<{ mode?: Mode }>).detail?.mode;
      if (!mode) return toggle();
      setOpen(true);
      if (status === "disconnected") void start(mode);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.key === "j" || e.key === "J") { e.preventDefault(); toggle(); }
      if (e.key === "Escape" && open) toggle();
    };
    window.addEventListener("os:jarvis", onEvt);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("os:jarvis", onEvt); window.removeEventListener("keydown", onKey); };
  }, [toggle, open, status, start]);

  // Orb follows whoever is talking (read per frame, no re-renders)
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      let v = 0;
      try { v = isSpeaking ? conversation.getOutputVolume() : conversation.getInputVolume(); } catch { /* not connected */ }
      if (orb.current) orb.current.style.transform = `scale(${1 + Math.min(1, v * 1.8) * 0.35})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, isSpeaking, conversation]);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [lines]);

  const send = () => {
    const text = draft.trim();
    if (!text || !live) return;
    conversation.sendUserMessage(text);
    const next = [...linesRef.current, { role: "user" as const, text }];
    linesRef.current = next;
    setLines(next);
    setDraft("");
  };

  const state = error ? "error" : status === "connecting" ? "connecting" : !live ? "idle" : isSpeaking ? "speaking" : "listening";
  const label = { error: "Error", connecting: "Connecting…", idle: "Idle", speaking: "Speaking", listening: "Listening" }[state];

  if (!open) {
    return (
      <button className="jarvis-launch" onClick={toggle} aria-label="Talk to Jarvis (J)">
        <span className="jarvis-dot" /> Jarvis <span className="kbd">J</span>
      </button>
    );
  }

  return (
    <section className="jarvis" aria-label="Jarvis">
      <div className="card-h" style={{ marginBottom: 0 }}>
        <span className="eyebrow">Jarvis</span>
        <span className={`pill ${state === "speaking" ? "accent" : state === "error" ? "act" : ""}`}>
          {state === "listening" && <i className="dot" style={{ color: "var(--ok)" }} />}{label}
        </span>
      </div>

      <div className="jarvis-stage">
        <div ref={orb} className={`jarvis-orb ${state}`} />
      </div>

      <div className="jarvis-lines" ref={scroller}>
        {lines.length === 0 && !error && <div className="meta" style={{ textAlign: "center" }}>{live ? "Go ahead — he's listening." : "Starting…"}</div>}
        {error && <div className="meta" style={{ color: "var(--act)", textAlign: "center" }}>{error}</div>}
        {lines.slice(-12).map((l, i) => (
          <div key={i} className={`jarvis-line ${l.role}`}>{l.text}</div>
        ))}
      </div>

      <div className="jarvis-input">
        <input
          className="input"
          placeholder={live ? "Type instead…" : "Not connected"}
          value={draft}
          disabled={!live}
          onChange={e => { setDraft(e.target.value); conversation.sendUserActivity(); }}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
        />
      </div>

      <div style={{ display: "flex", gap: "var(--s2)" }}>
        {live ? (
          <>
            <button className="btn sm" onClick={() => setMuted(!isMuted)}>{isMuted ? "Unmute" : "Mute"}</button>
            <button className="btn sm primary" style={{ marginLeft: "auto" }} onClick={toggle}>End</button>
          </>
        ) : (
          <>
            <button className="btn sm ghost" onClick={toggle}>Close</button>
            <span style={{ marginLeft: "auto", display: "flex", gap: "var(--s2)" }}>
              <button className="btn sm" onClick={() => void start("morning")} disabled={status === "connecting"}>Morning</button>
              <button className="btn sm" onClick={() => void start("evening")} disabled={status === "connecting"}>Evening</button>
              <button className="btn sm primary" onClick={() => void start("open")} disabled={status === "connecting"}>
                {status === "connecting" ? "Connecting…" : "Just talk"}
              </button>
            </span>
          </>
        )}
      </div>
    </section>
  );
}

// A button anywhere in the app that opens Jarvis straight into a routine
export function JarvisSessionButton({ mode, label }: { mode: Mode; label: string }) {
  return (
    <button className="btn sm" onClick={() => window.dispatchEvent(new CustomEvent("os:jarvis", { detail: { mode } }))}>
      <span className="jarvis-dot" /> {label}
    </button>
  );
}
