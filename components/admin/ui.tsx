"use client";
import React from "react";

export const FONT_SAIRA = "'Saira Condensed',sans-serif";
export const FONT_SANS = "'IBM Plex Sans',sans-serif";
export const FONT_MONO = "'IBM Plex Mono',monospace";

type BtnKind = "primary" | "secondary" | "ghost" | "danger";

export function Btn({
  kind = "secondary", children, style, ...rest
}: { kind?: BtnKind } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: React.CSSProperties = {
    fontFamily: FONT_SAIRA, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px",
    fontSize: 14, padding: "9px 16px", borderRadius: 10, cursor: "pointer", border: "1px solid transparent",
    transition: "filter .15s, background .15s", whiteSpace: "nowrap",
  };
  const kinds: Record<BtnKind, React.CSSProperties> = {
    primary: { background: "linear-gradient(150deg,#9bd8ff,#5db6ff)", color: "#0a1c44", boxShadow: "0 6px 20px rgba(93,182,255,.35)" },
    secondary: { background: "rgba(93,182,255,.08)", border: "1px solid rgba(93,182,255,.4)", color: "#bfe2ff" },
    ghost: { background: "transparent", border: "1px solid #2c3470", color: "#aab4d4" },
    danger: { background: "transparent", border: "1px solid #4a2230", color: "#ff8fa8" },
  };
  return (
    <button {...rest} style={{ ...base, ...kinds[kind], ...(rest.disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}), ...style }}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      {label && <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, color: "#9aaad8", marginBottom: 6, textTransform: "uppercase" }}>{label}</div>}
      {children}
      {hint && <div style={{ fontSize: 11, color: "#7884a8", marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)",
  border: "1px solid #2c3470", color: "#fff", outline: "none", fontFamily: FONT_SANS, fontSize: 14,
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 80, resize: "vertical", ...props.style }} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  // Solid dark background so the native option list is readable (not white-on-white).
  return <select {...props} style={{ ...inputStyle, background: "#0e1336", color: "#e8eeff", ...props.style }} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(93,182,255,.16)", borderRadius: 14, padding: 20, ...style }}>{children}</div>;
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
      <div>
        <h1 style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 26, textTransform: "uppercase", margin: 0, background: "linear-gradient(180deg,#fff,#9bd8ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{title}</h1>
        {sub && <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9aaad8", letterSpacing: 1, marginTop: 6 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{ width: 52, height: 30, borderRadius: 20, border: "none", cursor: "pointer", position: "relative", background: on ? "linear-gradient(150deg,#9bd8ff,#5db6ff)" : "#2c3470", transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
    </button>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "linear-gradient(150deg,#9bd8ff,#5db6ff)", color: "#0a1c44", fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 15, padding: "11px 22px", borderRadius: 30, boxShadow: "0 10px 30px rgba(93,182,255,.4)", animation: "toastIn .3s" }}>
      {message}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const t = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = React.useCallback((m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return { msg, show };
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "live" | "done" | "muted" | "warn" }) {
  const tones: Record<string, React.CSSProperties> = {
    live: { color: "#a9d6ff", background: "rgba(93,182,255,.15)", border: "1px solid rgba(93,182,255,.4)" },
    done: { color: "#9aaad8", background: "rgba(255,255,255,.05)", border: "1px solid transparent" },
    muted: { color: "#9aaad8", background: "rgba(255,255,255,.04)", border: "1px solid transparent" },
    warn: { color: "#ffce6b", background: "rgba(255,206,107,.08)", border: "1px solid rgba(255,206,107,.3)" },
  };
  return <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1, padding: "2px 7px", borderRadius: 4, ...tones[tone] }}>{children}</span>;
}
