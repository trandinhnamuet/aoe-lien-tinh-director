"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MatchCard from "@/components/MatchCard";
import type {
  ClusterSnapshot, RoundSnapshot, GroupVM, SwissLegVM, BracketNodeVM,
} from "@/lib/types";

const FONT_SAIRA = "'Saira Condensed',sans-serif";
const FONT_MONO = "'IBM Plex Mono',monospace";

function mach(m: number | null) {
  return m === null || m === undefined ? "" : "MÁY " + String(m).padStart(2, "0");
}

/** Build id -> signature map so polling can detect score/status changes. */
function buildSigMap(s: ClusterSnapshot): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of s.dashboardCards) map.set(c.id, `${c.status}:${c.aScore}-${c.bScore}`);
  for (const r of s.rounds) {
    if (r.type === "swiss") for (const leg of r.legs) for (const m of leg.matches) map.set(m.id, `${m.status}:${m.score}`);
    if (r.type !== "group") if ("columns" in r) for (const col of r.columns) for (const n of col.nodes) if (n.id) map.set(n.id, `${n.status}:${n.aScore}-${n.bScore}`);
  }
  return map;
}

/** A round is "finished" when it has matches and every one of them is done. */
function roundFinished(r: RoundSnapshot): boolean {
  let total = 0, allDone = true;
  if (r.type === "group") {
    for (const g of r.groups) for (const m of g.matches) { total++; if (!m.done) allDone = false; }
  } else if (r.type === "swiss") {
    for (const leg of r.legs) for (const m of leg.matches) { total++; if (m.status !== "done") allDone = false; }
  } else {
    for (const col of r.columns) for (const n of col.nodes) { if (!n.id) continue; total++; if (n.status !== "done") allDone = false; }
  }
  return total > 0 && allDone;
}

/** Default landing tab: the first round without final results; if every round
 *  is finished, the last (final) round; "dashboard" only when there are none. */
function defaultRoute(snap: ClusterSnapshot): string {
  const rounds = snap.rounds;
  if (!rounds.length) return "dashboard";
  const active = rounds.find((r) => !roundFinished(r));
  return active ? active.id : rounds[rounds.length - 1].id;
}

export default function PublicPortal({ initial }: { initial: ClusterSnapshot }) {
  const [snap, setSnap] = useState<ClusterSnapshot>(initial);
  const [route, setRoute] = useState<string>(() => defaultRoute(initial));
  const [selOpen, setSelOpen] = useState(false);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [confettiOn, setConfettiOn] = useState(false);
  const sigRef = useRef<Map<string, string>>(buildSigMap(initial));
  const cftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const burstConfetti = useCallback(() => {
    if (reduced.current) return;
    setConfettiOn(true);
    clearTimeout(cftTimer.current);
    cftTimer.current = setTimeout(() => setConfettiOn(false), 2600);
  }, []);

  const loadCluster = useCallback(async (clusterId: string) => {
    const r = await fetch(`/api/public/snapshot?clusterId=${clusterId}`, { cache: "no-store" });
    if (!r.ok) return;
    const next: ClusterSnapshot = await r.json();
    sigRef.current = buildSigMap(next);
    setSnap(next);
    setRoute(defaultRoute(next));
    setSelOpen(false);
  }, []);

  // polling — near-realtime
  useEffect(() => {
    const clusterId = snap.cluster.id;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/public/snapshot?clusterId=${clusterId}`, { cache: "no-store" });
        if (!r.ok) return;
        const next: ClusterSnapshot = await r.json();
        const nextSig = buildSigMap(next);
        const prevSig = sigRef.current;
        const changed: string[] = [];
        let newDone = false;
        for (const [k, v] of nextSig) {
          const pv = prevSig.get(k);
          if (pv !== undefined && pv !== v) {
            changed.push(k);
            if (v.startsWith("done") && !pv.startsWith("done")) newDone = true;
          }
        }
        if (changed.length) {
          const now = Date.now();
          setFlash((f) => { const nf = { ...f }; for (const k of changed) nf[k] = now; return nf; });
          if (newDone) burstConfetti();
        }
        sigRef.current = nextSig;
        setSnap(next);
      } catch { /* ignore transient poll errors */ }
    }, 4000);
    return () => clearInterval(id);
  }, [snap.cluster.id, burstConfetti]);

  const activeRound = useMemo(() => snap.rounds.find((r) => r.id === route), [snap.rounds, route]);
  const isLive = snap.cluster.status === "live";

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#080b1e", fontFamily: "'IBM Plex Sans',sans-serif", color: "#e8eeff", overflowX: "hidden" }}>
      {/* key art background */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: 'url("/background-2.jpg")', backgroundSize: "100% auto", backgroundPosition: "top center", backgroundRepeat: "no-repeat" }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,11,30,.72) 0%, rgba(8,11,30,.86) 40%, rgba(8,11,30,.96) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: "16%", width: 2, height: "40%", zIndex: 1, background: "linear-gradient(#bfe2ff, transparent)", filter: "blur(.6px)", animation: "lightning 7s 3s infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: "22%", width: 2, height: "32%", zIndex: 1, background: "linear-gradient(#cdb9ff, transparent)", filter: "blur(.6px)", animation: "lightning 9s 5s infinite", pointerEvents: "none" }} />

      {confettiOn && <Confetti />}

      <div style={{ position: "relative", zIndex: 10 }}>
        {/* HEADER */}
        <header style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(14px)", background: "linear-gradient(180deg, rgba(10,14,40,.92), rgba(10,14,40,.74))", borderBottom: "1px solid rgba(93,182,255,.18)" }}>
          <div className="pub-pad" style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 9, background: "linear-gradient(150deg,#9bd8ff,#3f7fe0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, color: "#0a1c44", fontSize: 22, boxShadow: "0 0 18px rgba(93,182,255,.5)" }}>A</span>
              <div>
                <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 21, letterSpacing: 1, lineHeight: 1, background: "linear-gradient(180deg,#ffffff,#9bd8ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>AOE LIÊN TỈNH</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#b9c3e6", letterSpacing: 2, marginTop: 2 }}>CSDN STUDIO · DIRECTOR</div>
              </div>
            </div>

            {/* cluster selector */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setSelOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(93,182,255,.1)", border: "1px solid rgba(93,182,255,.4)", color: "#e8eeff", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13 }}>
                <span style={{ color: "#b9c3e6" }}>{snap.tournament.name} ·</span>
                <span style={{ fontWeight: 600, color: "#bfe2ff" }}>{snap.cluster.name}</span>
                <span style={{ color: "#5db6ff" }}>▾</span>
              </button>
              {selOpen && (
                <div style={{ position: "absolute", top: 46, left: 0, minWidth: 280, background: "#0e1336", border: "1px solid #2c3470", borderRadius: 10, boxShadow: "0 18px 50px rgba(0,0,0,.5)", padding: 8, zIndex: 50 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#b9c3e6", letterSpacing: 1, padding: "6px 10px" }}>CHỌN CỤM · {snap.tournament.name}</div>
                  {snap.clusterOptions.map((c) => {
                    const active = c.id === snap.cluster.id;
                    const live = c.status === "live";
                    return (
                      <button key={c.id} onClick={() => loadCluster(c.id)} style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: 10, borderRadius: 8, border: "1px solid transparent", color: "#e8eeff", background: active ? "rgba(93,182,255,.12)" : "transparent" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                          <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1, padding: "2px 7px", borderRadius: 4, ...(live ? { color: "#a9d6ff", background: "rgba(93,182,255,.15)", border: "1px solid rgba(93,182,255,.4)" } : { color: "#b9c3e6", background: "rgba(255,255,255,.05)" }) }}>{live ? "ĐANG THI ĐẤU" : "ĐÃ XONG"}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#b9c3e6", marginTop: 3 }}>{c.date} · {c.location}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(93,182,255,.12)", border: "1px solid rgba(93,182,255,.5)", padding: "7px 13px", borderRadius: 30 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? "#5db6ff" : "#a8b2d6", boxShadow: isLive ? "0 0 8px #5db6ff" : "none", animation: isLive ? "liveDot 1.4s infinite" : "none" }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, letterSpacing: 1, color: "#a9d6ff" }}>{isLive ? "ĐANG CẬP NHẬT TRỰC TIẾP" : "CỤM ĐÃ KẾT THÚC"}</span>
            </div>
          </div>

          {/* tabs */}
          <div className="pub-pad" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, overflowX: "auto" }}>
            <Tab label="Tổng quan" active={route === "dashboard"} onClick={() => setRoute("dashboard")} />
            {snap.rounds.map((r) => (
              <Tab key={r.id} label={r.name} active={route === r.id} onClick={() => setRoute(r.id)} />
            ))}
          </div>
        </header>

        <main className="pub-pad" style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 80px" }}>
          {route === "dashboard" && <Dashboard snap={snap} flash={flash} onOpenRound={(id) => setRoute(id)} />}
          {activeRound?.type === "group" && <GroupsView round={activeRound} />}
          {activeRound?.type === "swiss" && <SwissView round={activeRound} />}
          {(activeRound?.type === "knockout_single" || activeRound?.type === "knockout_multi") && <BracketView round={activeRound} />}
        </main>

        <footer style={{ borderTop: "1px solid rgba(93,182,255,.12)", padding: "22px 24px", textAlign: "center" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9ca8ce", letterSpacing: 1 }}>{snap.tournament.name} {snap.tournament.year} · CSDN Studio</span>
        </footer>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", padding: "13px 16px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "#bfe2ff" : "#aab4d4", borderBottom: `2px solid ${active ? "#5db6ff" : "transparent"}`, whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

function Dashboard({ snap, flash, onOpenRound }: { snap: ClusterSnapshot; flash: Record<string, number>; onOpenRound: (id: string) => void }) {
  const cards = snap.dashboardCards;
  const done = cards.filter((c) => c.status === "done").length;
  const live = cards.filter((c) => c.status === "live").length;
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6", letterSpacing: 2, marginBottom: 8 }}>{snap.cluster.date} · {snap.cluster.location}</div>
          <h1 style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: "clamp(34px, 6vw, 58px)", margin: 0, lineHeight: .95, textTransform: "uppercase", background: "linear-gradient(180deg,#ffffff,#9bd8ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "0 0 40px rgba(93,182,255,.25)" }}>{snap.cluster.name}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(93,182,255,.1)", border: "1px solid rgba(93,182,255,.35)", padding: "9px 16px", borderRadius: 30 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5db6ff", boxShadow: "0 0 10px #5db6ff", animation: snap.cluster.status === "live" ? "liveDot 1.4s infinite" : "none" }} />
          <span style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>{snap.cluster.status === "live" ? "Đang thi đấu" : "Đã kết thúc"}</span>
        </div>
      </div>

      {snap.currentRound && (
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(93,182,255,.16)", borderRadius: 14, padding: "20px 22px", marginBottom: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 26, textTransform: "uppercase" }}>{snap.currentRound.name}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#b9c3e6" }}>{snap.currentRound.configText}</span>
            </div>
            <div style={{ display: "flex", gap: 18, fontFamily: FONT_MONO, fontSize: 13 }}>
              <span style={{ color: "#5db6ff" }}>{done}/{cards.length} cặp xong</span>
              <span style={{ color: "#9bd8ff" }}>{live} đang đánh</span>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: "#161d44", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 5, background: "linear-gradient(90deg,#5db6ff,#8a5cff)", boxShadow: "0 0 12px rgba(93,182,255,.6)", transformOrigin: "left", animation: "growX 1s .2s both" }} />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
        {cards.map((c, i) => (
          <div key={c.id} style={{ animation: `cardIn .55s ${Math.min(i * 0.05, 0.5)}s both` }}>
            <MatchCard {...c} flashKey={flash[c.id] || 0} />
          </div>
        ))}
        {cards.length === 0 && <Empty text="Chưa có cặp đấu nào ở vòng hiện tại." />}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
        {snap.rounds.map((r) => (
          <button key={r.id} onClick={() => onOpenRound(r.id)} style={{ flex: 1, minWidth: 220, textAlign: "left", background: "rgba(255,255,255,.03)", border: "1px solid rgba(93,182,255,.16)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", color: "#e8eeff" }}>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 19, textTransform: "uppercase" }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#b9c3e6", marginTop: 4 }}>{r.configText}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GroupsView({ round }: { round: Extract<RoundSnapshot, { type: "group" }> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))", gap: 18 }}>
      {round.groups.map((g: GroupVM) => <GroupCard key={g.key} g={g} />)}
    </div>
  );
}

function GroupCard({ g }: { g: GroupVM }) {
  const [open, setOpen] = useState(false); // match list collapsed by default
  // Columns: # | player | advance-badge | T(win) | B(loss) | [H(draw)] | +/-(diff)
  const cols = `26px 1fr auto 28px 28px ${g.showDraw ? "28px " : ""}40px`;
  const numCell: React.CSSProperties = { fontFamily: FONT_MONO, fontSize: 13, textAlign: "center" };
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(93,182,255,.16)", borderRadius: 14, padding: 18, animation: "cardIn .5s both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(150deg,#9bd8ff,#3f7fe0)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, color: "#0a1c44", fontSize: 18 }}>{g.key}</span>
        <span style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>Bảng {g.key}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8, padding: "0 10px 6px", fontFamily: FONT_MONO, fontSize: 10, color: "#b9c3e6", letterSpacing: 1 }}>
        <span>#</span><span>NGƯỜI CHƠI</span><span></span>
        <span style={{ textAlign: "center" }} title="Thắng">T</span>
        <span style={{ textAlign: "center" }} title="Thua">B</span>
        {g.showDraw && <span style={{ textAlign: "center" }} title="Hòa">H</span>}
        <span style={{ textAlign: "center" }} title="Hiệu số">+/-</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {g.rows.map((r) => (
          <div key={r.playerId} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center", padding: "7px 10px", borderRadius: 8, background: r.advance ? "rgba(93,182,255,.1)" : "transparent", border: `1px solid ${r.advance ? "rgba(93,182,255,.28)" : "transparent"}` }}>
            <span style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 17, color: r.advance ? "#5db6ff" : "#b9c3e6" }}>{r.rank}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.fullName}</div>
              {r.fullName !== r.nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 500, fontSize: 11, color: "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nick}</div>}
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#b9c3e6" }}>{mach(r.machine)}</div>
            </div>
            {r.advance ? <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: "#bfe2ff", border: "1px solid rgba(93,182,255,.45)", padding: "1px 5px", borderRadius: 4 }}>ĐI TIẾP</span> : <span />}
            <span style={{ ...numCell, fontSize: 14, color: "#e8eeff" }}>{r.win}</span>
            <span style={{ ...numCell, color: "#ff9db0" }}>{r.loss}</span>
            {g.showDraw && <span style={{ ...numCell, color: "#b9c3e6" }}>{r.draw}</span>}
            <span style={{ ...numCell, color: "#b9c3e6" }}>{r.diff > 0 ? "+" : ""}{r.diff}</span>
          </div>
        ))}
      </div>

      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", border: "none", borderTop: "1px solid rgba(93,182,255,.12)", marginTop: 14, paddingTop: 12, color: "#9bd8ff" }}>
        <span style={{ color: "#5db6ff", fontSize: 11, width: 10 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1 }}>CÁC CẶP ĐẤU ({g.matches.length})</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
          {g.matches.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center", fontSize: 13 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_SAIRA, fontWeight: m.aWin ? 700 : 500, fontSize: 14, color: m.bWin ? "#a8b2d6" : "#e8eeff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.aName}</div>
                {m.aName !== m.aNick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 11, color: m.bWin ? "#969ec0" : "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.aNick}</div>}
              </div>
              <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 13, padding: "0 10px", color: m.live ? "#9bd8ff" : m.done ? "#5db6ff" : "#b9c3e6" }}>{m.score}</span>
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div style={{ fontFamily: FONT_SAIRA, fontWeight: m.bWin ? 700 : 500, fontSize: 14, color: m.aWin ? "#a8b2d6" : "#e8eeff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.bName}</div>
                {m.bName !== m.bNick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 11, color: m.aWin ? "#969ec0" : "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.bNick}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SwissView({ round }: { round: Extract<RoundSnapshot, { type: "swiss" }> }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 240, background: "rgba(93,182,255,.07)", border: "1px solid rgba(93,182,255,.28)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#9bd8ff", letterSpacing: 1, marginBottom: 8 }}>✓ ĐỦ THẮNG · ĐI TIẾP</div>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 16, lineHeight: 1.5 }}>{round.advanced.length ? round.advanced.join(" · ") : "Chưa có"}</div>
        </div>
        <div style={{ flex: 1, minWidth: 240, background: "rgba(255,255,255,.03)", border: "1px solid #2c3470", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#a8b2d6", letterSpacing: 1, marginBottom: 8 }}>✕ ĐÃ BỊ LOẠI</div>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 16, lineHeight: 1.5, color: "#a8b2d6" }}>{round.eliminated.length ? round.eliminated.join(" · ") : "Chưa có"}</div>
        </div>
      </div>
      {round.legs.map((leg: SwissLegVM) => (
        <div key={leg.name} style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 22, textTransform: "uppercase", marginBottom: 12 }}>{leg.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))", gap: 12 }}>
            {leg.matches.map((m) => {
              const done = m.status === "done", live = m.status === "live";
              const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "center", padding: "12px 16px", borderRadius: 10,
                ...(live ? { background: "rgba(93,182,255,.06)", animation: "pulseIce 2s 1s infinite" } : done ? { background: "rgba(255,255,255,.04)", border: "1px solid #242c64" } : { background: "rgba(255,255,255,.02)", border: "1px dashed #2c3470" }) };
              return (
                <div key={m.id} style={rowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: done && m.winner === "a" ? 700 : 500, color: done && m.winner === "b" ? "#a8b2d6" : "#fff" }}>
                      <div style={{ fontFamily: FONT_SAIRA, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.aName}</div>
                      {m.aName !== m.aNick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 12, color: done && m.winner === "b" ? "#969ec0" : "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.aNick}</div>}
                    </div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#b9c3e6", marginTop: 2 }}>{mach(m.aMachine)} · {m.aRec}</div>
                  </div>
                  <span style={{ fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, fontSize: 22, color: live ? "#9bd8ff" : done ? "#5db6ff" : "#b9c3e6" }}>{m.score}</span>
                  <div style={{ minWidth: 0, textAlign: "right" }}>
                    <div style={{ fontWeight: done && m.winner === "b" ? 700 : 500, color: done && m.winner === "a" ? "#a8b2d6" : "#fff" }}>
                      <div style={{ fontFamily: FONT_SAIRA, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.bName}</div>
                      {m.bName !== m.bNick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 12, color: done && m.winner === "a" ? "#969ec0" : "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.bNick}</div>}
                    </div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#b9c3e6", marginTop: 2 }}>{mach(m.bMachine)} · {m.bRec}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketView({ round }: { round: Extract<RoundSnapshot, { type: "knockout_single" | "knockout_multi" }> }) {
  return (
    <div>
      {round.champion && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(120deg, rgba(93,182,255,.16), rgba(138,92,255,.12))", border: "1px solid rgba(93,182,255,.4)", borderRadius: 14, padding: "18px 22px", marginBottom: 26, animation: "slideInWin .6s both" }}>
          <span style={{ fontSize: 30 }}>🏆</span>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9bd8ff", letterSpacing: 2 }}>VÔ ĐỊCH CỤM</div>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 30, textTransform: "uppercase", background: "linear-gradient(180deg,#ffffff,#9bd8ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{round.champion}</div>
          </div>
        </div>
      )}
      <BracketTree round={round} />
    </div>
  );
}

const THIRD_RE = /tranh|hạng\s*3|3\s*[–-]\s*4/i;

function BracketTree({ round }: { round: Extract<RoundSnapshot, { type: "knockout_single" | "knockout_multi" }> }) {
  const mainCols = round.columns.filter((c) => !THIRD_RE.test(c.name));
  const thirdCol = round.columns.find((c) => THIRD_RE.test(c.name));
  const thirdNode = thirdCol?.nodes[0];
  // Connector tree only makes sense for a binary single-elim bracket.
  const useTree = round.type === "knockout_single" && mainCols.length > 1;

  return (
    <div>
      {useTree ? (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div className="bkp" style={{ minWidth: mainCols.length * 250 }}>
            {mainCols.map((col, ci) => {
              const isFinal = /chung kết/i.test(col.name);
              return (
                <div key={col.name} className="bkp-round">
                  <div className={`bkp-title${isFinal ? " final" : ""}`}>{isFinal ? "★ " : ""}{col.name.toUpperCase()}</div>
                  <div className="bkp-body">
                    {col.nodes.map((n, ni) => (
                      <div key={n.id ?? `${ci}-${ni}`} className="bkp-match">
                        <BracketCard n={n} isFinal={isFinal} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", overflowX: "auto", paddingBottom: 12 }}>
          {mainCols.map((col, ci) => (
            <div key={col.name} style={{ flex: mainCols.length <= 3 ? "1 1 0" : "none", minWidth: 250, display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="bkp-title">{col.name.toUpperCase()}</div>
              {col.nodes.map((n, ni) => <BracketCard key={n.id ?? `${ci}-${ni}`} n={n} />)}
            </div>
          ))}
        </div>
      )}

      {thirdNode && (
        <div style={{ marginTop: 24, maxWidth: 380 }}>
          <div className="bkp-title" style={{ textAlign: "left", marginBottom: 8 }}>TRANH HẠNG 3</div>
          <BracketCard n={thirdNode} />
        </div>
      )}
    </div>
  );
}

function BracketCard({ n, isFinal }: { n: BracketNodeVM; isFinal?: boolean }) {
  const done = n.status === "done", live = n.status === "live";
  // Glowing borders so every player card stands out on stream.
  const statusStyle: React.CSSProperties = live
    ? { background: "rgba(93,182,255,.1)", borderColor: "#7fd0ff", animation: "pulseIce 2s 1s infinite" }
    : done
    ? { background: "rgba(255,255,255,.05)", borderColor: "#5db6ff", boxShadow: "0 0 14px rgba(93,182,255,.45), inset 0 0 0 1px rgba(93,182,255,.25)" }
    : { background: "rgba(255,255,255,.03)", borderColor: "rgba(93,182,255,.6)", boxShadow: "0 0 12px rgba(93,182,255,.3)" };

  const renderRow = (name: string | null, nick: string | null, machine: number | null, score: number | null, win: boolean, dim: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, opacity: dim ? 0.55 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 17, color: win ? "#5db6ff" : name ? "#fff" : "#9ca8ce", textShadow: win ? "0 0 12px rgba(93,182,255,.6)" : undefined, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name ?? "Chờ KQ"}</div>
          {name && nick && name !== nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 12, color: win ? "#9bd8ff" : "#b9c3e6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nick}</div>}
        </div>
        {name && machine !== null && <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#b9c3e6", flexShrink: 0 }}>M{String(machine).padStart(2, "0")}</span>}
      </div>
      <span style={{ fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, fontSize: 21, color: win ? "#5db6ff" : "#e8eeff" }}>{name && (done || live) && score !== null ? score : ""}</span>
    </div>
  );

  return (
    <div className={`bkp-card${isFinal ? " final" : ""}`} style={statusStyle}>
      {renderRow(n.aName, n.aNick, n.aMachine, n.aScore, done && n.winner === "a", done && n.winner === "b")}
      <div style={{ height: 1, background: "rgba(93,182,255,.12)", margin: "8px 0" }} />
      {renderRow(n.bName, n.bNick, n.bMachine, n.bScore, done && n.winner === "b", done && n.winner === "a")}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ gridColumn: "1/-1", padding: "40px 20px", textAlign: "center", color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 13, border: "1px dashed #2c3470", borderRadius: 12 }}>{text}</div>;
}

function Confetti() {
  const cols = ["#5db6ff", "#9bd8ff", "#8a5cff", "#ffffff", "#bfe2ff"];
  const bits = Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
    bg: cols[i % cols.length], dur: 1.6 + Math.random() * 1.2, delay: Math.random() * 0.5,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none" }}>
      {bits.map((b, i) => (
        <span key={i} style={{ position: "absolute", top: -12, left: `${b.left}%`, width: b.w, height: b.h, background: b.bg, borderRadius: 1, animation: `confettiFall ${b.dur}s ${b.delay}s ease-in forwards`, opacity: 0.9 }} />
      ))}
    </div>
  );
}
