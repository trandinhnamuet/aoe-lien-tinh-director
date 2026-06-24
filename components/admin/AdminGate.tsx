"use client";
import { useEffect, useState } from "react";
import { Btn, Input, FONT_SAIRA, FONT_MONO } from "./ui";

const LS_KEY = "aoe_admin_ok";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "1");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        localStorage.setItem(LS_KEY, "1");
        setAuthed(true);
      } else {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Sai mật khẩu");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#7e8cc8", fontFamily: FONT_MONO }}>Đang tải…</div>;
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(130% 90% at 50% -20%, #2a1c5e 0%, #131140 38%, #0a0e24 78%)", padding: 24 }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, background: "rgba(10,14,40,.7)", border: "1px solid rgba(93,182,255,.2)", borderRadius: 16, padding: 28, boxShadow: "0 18px 50px rgba(0,0,0,.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ width: 40, height: 40, borderRadius: 9, background: "linear-gradient(150deg,#9bd8ff,#3f7fe0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, color: "#0a1c44", fontSize: 22, boxShadow: "0 0 18px rgba(93,182,255,.5)" }}>A</span>
            <div>
              <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 19, color: "#e8eeff" }}>AOE LIÊN TỈNH</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#7e8cc8", letterSpacing: 2 }}>TRANG QUẢN TRỊ</div>
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, color: "#7e8cc8", marginBottom: 6, textTransform: "uppercase" }}>Mật khẩu admin</div>
          <Input type="password" value={password} autoFocus onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={error ? { borderColor: "#ff8fa8" } : undefined} />
          {error && <div style={{ color: "#ff8fa8", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <Btn kind="primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>{busy ? "Đang vào…" : "Đăng nhập"}</Btn>
          <div style={{ fontSize: 11, color: "#5a648c", marginTop: 14, textAlign: "center" }}>Chỉ hỏi 1 lần trên thiết bị này.</div>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
