"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  connected: boolean;
}

function StravaIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

export default function StravaConnect({ connected }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  async function sync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json() as { synced?: number; error?: string };
      if (data.error) {
        setSyncMsg(`Error: ${data.error}`);
      } else {
        setSyncMsg(`✓ ${data.synced} activities synced`);
        router.refresh();
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  }

  if (!connected) {
    return (
      <a
        href="/api/strava/connect"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8,
          background: "#FC4C02", color: "#fff",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
          boxShadow: "0 1px 4px rgba(252,76,2,0.3)",
        }}
      >
        <StravaIcon />
        Connect Strava
      </a>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {syncMsg && (
        <span style={{ fontSize: 12, color: syncMsg.startsWith("Error") ? "var(--c-warn)" : "var(--c-fitness)", fontWeight: 500 }}>
          {syncMsg}
        </span>
      )}
      <button
        onClick={sync}
        disabled={syncing}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8, cursor: syncing ? "not-allowed" : "pointer",
          background: syncing ? "var(--bg-subtle)" : "#FC4C02",
          color: syncing ? "var(--text-3)" : "#fff",
          border: syncing ? "1px solid var(--border)" : "1px solid transparent",
          fontSize: 13, fontWeight: 600,
          boxShadow: syncing ? "none" : "0 1px 4px rgba(252,76,2,0.3)",
          transition: "all 0.15s",
          opacity: syncing ? 0.7 : 1,
        }}
      >
        <span style={{
          display: "inline-block",
          animation: syncing ? "spin 1s linear infinite" : "none",
        }}>
          <StravaIcon />
        </span>
        {syncing ? "Syncing…" : "Sync Strava"}
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
