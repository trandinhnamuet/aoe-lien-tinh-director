"use client";
import { useEffect, useRef, useState } from "react";
import type { MatchStatus } from "@/lib/types";

export interface MatchCardProps {
  aName: string;
  aNick: string;
  aMachine: number | null;
  aScore: number | null;
  bName: string;
  bNick: string;
  bMachine: number | null;
  bScore: number | null;
  status: MatchStatus;
  winner: "a" | "b" | "";
  advanceA?: boolean;
  advanceB?: boolean;
  flashKey?: number;
}

function mach(m: number | null) {
  return m === null || m === undefined ? "—" : "MÁY " + String(m).padStart(2, "0");
}

export default function MatchCard(p: MatchCardProps) {
  const [pop, setPop] = useState(false);
  const prevFlash = useRef(p.flashKey);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (p.flashKey && prevFlash.current !== p.flashKey) {
      setPop(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPop(false), 900);
    }
    prevFlash.current = p.flashKey;
    return () => clearTimeout(timer.current);
  }, [p.flashKey]);

  const live = p.status === "live", done = p.status === "done", pending = p.status === "pending";
  const base = "border-radius:11px; padding:14px 16px; position:relative; transition:box-shadow .3s;";
  const cont = live
    ? base + "background:rgba(93,182,255,.06); animation:pulseIce 2s 1s infinite;"
    : pending
    ? base + "background:rgba(255,255,255,.02); border:1px dashed #2c3470;"
    : base + "background:rgba(255,255,255,.04); border:1px solid #242c64;";
  const winA = done && p.winner === "a", winB = done && p.winner === "b";

  const scoreStyle = (win: boolean): React.CSSProperties => ({
    fontFamily: "'Saira Condensed',sans-serif", fontWeight: 800, fontStyle: "italic",
    fontSize: 25, minWidth: 24, textAlign: "right",
    color: win ? "#5db6ff" : "#e8eeff",
    textShadow: win ? "0 0 14px rgba(93,182,255,.7)" : undefined,
  });
  const rowBase: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
  const nameStyle: React.CSSProperties = {
    fontFamily: "'Saira Condensed',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  };
  const nickLabelStyle: React.CSSProperties = {
    fontFamily: "'Saira Condensed',sans-serif", fontWeight: 500, fontSize: 13, color: "#9bd8ff",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2, marginTop: 1,
  };
  const machStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#9bd8ff",
    background: "rgba(93,182,255,.12)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap",
  };
  const advBadge: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#bfe2ff",
    border: "1px solid rgba(93,182,255,.45)", padding: "1px 6px", borderRadius: 4, letterSpacing: ".5px", whiteSpace: "nowrap",
  };

  const aScoreText = done || live ? (p.aScore ?? 0) : "–";
  const bScoreText = done || live ? (p.bScore ?? 0) : "–";
  const aHasNick = p.aName !== p.aNick;
  const bHasNick = p.bName !== p.bNick;

  const renderPlayer = (name: string, nick: string, hasNick: boolean, machine: number | null, advance: boolean | undefined, win: boolean, dim: boolean, score: number | string) => (
    <div style={{ ...rowBase, opacity: dim ? 0.5 : 1 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ ...nameStyle, color: win ? "#5db6ff" : "#fff", textShadow: win ? "0 0 10px rgba(93,182,255,.5)" : undefined }}>{name}</span>
          <span style={machStyle}>{mach(machine)}</span>
          {advance && <span style={advBadge}>ĐI TIẾP</span>}
        </div>
        {hasNick && <div style={nickLabelStyle}>{nick}</div>}
      </div>
      <span style={done ? scoreStyle(win) : scoreStyle(false)}>{score}</span>
    </div>
  );

  return (
    <div style={cssToStyle(cont)}>
      {live && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1, color: "#9bd8ff", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5db6ff", boxShadow: "0 0 8px #5db6ff", animation: "liveDot 1.2s infinite" }} />
            ĐANG ĐÁNH
          </span>
        </div>
      )}

      {renderPlayer(p.aName, p.aNick, aHasNick, p.aMachine, p.advanceA, winA, winB, aScoreText)}
      <div style={{ marginTop: 7 }}>
        {renderPlayer(p.bName, p.bNick, bHasNick, p.bMachine, p.advanceB, winB, winA, bScoreText)}
      </div>

      {pending && (
        <div style={{ position: "absolute", top: 14, right: 16, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#7e8cc8", letterSpacing: 1 }}>
          CHỜ
        </div>
      )}

      {pop && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 11, pointerEvents: "none", boxShadow: "inset 0 0 0 2px #9bd8ff, 0 0 30px rgba(93,182,255,.7)", animation: "scoreFlash .9s ease-out" }} />
      )}
    </div>
  );
}

function cssToStyle(css: string): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const val = decl.slice(i + 1).trim();
    if (prop) style[prop] = val;
  }
  return style as React.CSSProperties;
}
