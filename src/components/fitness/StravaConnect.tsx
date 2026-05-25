"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  connected: boolean;
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
        setSyncMsg(`Synced ${data.synced} activities`);
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{ background: "#FC4C02", color: "#fff", textDecoration: "none" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        Connect Strava
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {syncMsg && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{syncMsg}</span>
      )}
      <button
        onClick={sync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{
          background: syncing ? "var(--bg-soft)" : "#FC4C02",
          color: syncing ? "var(--text-muted)" : "#fff",
          border: syncing ? "1px solid var(--border)" : "none",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        {syncing ? "Syncing…" : "Sync Strava"}
      </button>
    </div>
  );
}
