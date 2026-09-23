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
        className="btn sm primary"
      >
        <StravaIcon />
        Connect Strava
      </a>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {syncMsg && (
        <span style={{ fontSize: 12, color: syncMsg.startsWith("Error") ? "var(--act)" : "var(--ink-3)", fontWeight: 500 }}>
          {syncMsg}
        </span>
      )}
      <button
        onClick={sync}
        disabled={syncing}
        className="btn sm primary"
        style={{ opacity: syncing ? 0.6 : 1, cursor: syncing ? "not-allowed" : "pointer" }}
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
