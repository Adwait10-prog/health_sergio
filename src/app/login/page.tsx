import { safeNextPath } from "@/lib/auth";

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14,
  border: "1px solid var(--border)", borderRadius: "var(--radius-xs)",
  background: "var(--bg-subtle)", color: "var(--text-1)", outline: "none", font: "inherit",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; e?: string }> }) {
  const { next, e } = await searchParams;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form method="post" action="/api/login" style={{
        width: "100%", maxWidth: 340, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 24, boxShadow: "var(--shadow)",
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", margin: "0 0 4px" }}>Personal OS</h1>
        <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "0 0 18px" }}>Sign in to continue.</p>
        <input type="hidden" name="next" value={safeNextPath(next)} />
        <label style={labelStyle}>Username</label>
        <input type="text" name="username" autoComplete="username" autoCapitalize="none" autoFocus required style={inputStyle} />
        <label style={{ ...labelStyle, marginTop: 12 }}>Password</label>
        <input type="password" name="password" autoComplete="current-password" required style={inputStyle} />
        {e && <p style={{ fontSize: 12, color: "var(--warn)", margin: "8px 0 0" }}>Wrong username or password.</p>}
        <button type="submit" style={{
          width: "100%", marginTop: 14, padding: "10px 0", fontSize: 13.5, fontWeight: 600,
          color: "#fff", background: "var(--text-1)", border: "none", borderRadius: "var(--radius-xs)", cursor: "pointer",
        }}>Sign in</button>
      </form>
    </div>
  );
}
