"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateResult, setMatchMachines } from "@/lib/actions";
import { effectiveBestOf } from "@/lib/pairing";
import type { ClusterWithMeta, AdminMatch, TournamentWithCount } from "@/lib/admin-queries";
import type { MatchStatus, Round } from "@/lib/types";
import { Card, Input, PageTitle, Select, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";
import AdminScopePicker from "@/components/admin/AdminScopePicker";

export default function ResultsClient({ tournaments, tournamentId, clusters, clusterId, clusterName, matches, rounds }: {
  tournaments: TournamentWithCount[]; tournamentId: string; clusters: ClusterWithMeta[]; clusterId: string; clusterName: string;
  matches: AdminMatch[]; rounds: Round[];
}) {
  const router = useRouter();
  const { msg, show } = useToast();
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();

  // Group matches by round, tracking both flat list (for stats) and sub-groups (for display)
  const byRound = new Map<string, {
    order: number; name: string; roundId: string;
    allMatches: AdminMatch[];
    groups: Map<string, AdminMatch[]>;
  }>();
  for (const m of matches) {
    if (!byRound.has(m.round_id)) byRound.set(m.round_id, { order: m.order_no, name: m.round_name, roundId: m.round_id, allMatches: [], groups: new Map() });
    const entry = byRound.get(m.round_id)!;
    entry.allMatches.push(m);
    const sub = m.group_name ? `Bảng ${m.group_name}` : m.leg_name ?? "";
    if (!entry.groups.has(sub)) entry.groups.set(sub, []);
    entry.groups.get(sub)!.push(m);
  }
  const roundEntries = [...byRound.values()].sort((a, b) => a.order - b.order);

  // Rounds sorted by order for next-round lookup
  const roundsSorted = [...rounds].sort((a, b) => a.order_no - b.order_no);

  function matchesSearch(m: AdminMatch) {
    if (!q) return true;
    return [m.an_full, m.an, m.bn_full, m.bn].some((s) => s?.toLowerCase().includes(q));
  }

  return (
    <div>
      <PageTitle title="Cập nhật kết quả" sub={`A8 · ${clusterName.toUpperCase()}`} right={
        <AdminScopePicker basePath="/admin/results" tournaments={tournaments} tournamentId={tournamentId} clusters={clusters} clusterId={clusterId} />
      } />

      <div style={{ marginBottom: 18 }}>
        <Input
          placeholder="Tìm theo tên game thủ trong cặp đấu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 380 }}
        />
      </div>

      {roundEntries.length === 0 && <Card><div style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 13 }}>Vòng đấu chưa có cặp đấu nào. Hãy xếp cặp / chia bảng trước.</div></Card>}

      {roundEntries.map((r) => {
        const nextRound = roundsSorted.find((rd) => rd.order_no > r.order);
        const { complete, statsText } = roundStats(r.allMatches);
        const filtered = r.allMatches.filter(matchesSearch);

        return (
          <div key={r.roundId} style={{ marginBottom: 30 }}>
            {/* Round header with stats */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", fontSize: 22, textTransform: "uppercase" }}>{r.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: complete ? "#5db6ff" : "#b9c3e6", background: complete ? "rgba(93,182,255,.1)" : "rgba(255,255,255,.04)", border: `1px solid ${complete ? "rgba(93,182,255,.4)" : "#2c3470"}`, padding: "4px 10px", borderRadius: 20 }}>
                  {complete ? "✓ " : ""}{statsText}
                </span>
                {nextRound ? (
                  complete ? (
                    <Link href={`/admin/pairing?tournament=${tournamentId}&cluster=${clusterId}&round=${nextRound.id}`}
                      style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#0a1c44", background: "linear-gradient(150deg,#9bd8ff,#5db6ff)", border: "none", padding: "4px 12px", borderRadius: 20, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(93,182,255,.35)" }}>
                      Xếp cặp {nextRound.name} →
                    </Link>
                  ) : (
                    <Link href={`/admin/pairing?tournament=${tournamentId}&cluster=${clusterId}&round=${nextRound.id}`}
                      style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#b9c3e6", background: "transparent", border: "1px solid #2c3470", padding: "4px 12px", borderRadius: 20, textDecoration: "none", whiteSpace: "nowrap" }}>
                      {nextRound.name} →
                    </Link>
                  )
                ) : (
                  complete && <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#5db6ff", letterSpacing: 1 }}>✓ VÒNG CUỐI HOÀN THÀNH</span>
                )}
              </div>
            </div>

            {/* Groups/legs */}
            {filtered.length === 0 && q && (
              <div style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 12, padding: "8px 0" }}>Không tìm thấy cặp đấu phù hợp.</div>
            )}
            {[...r.groups.entries()].map(([sub, list]) => {
              const filteredGroup = list.filter(matchesSearch);
              if (!filteredGroup.length) return null;
              return (
                <LegSection
                  key={sub}
                  sub={sub}
                  matches={filteredGroup}
                  total={list.length}
                  doneCount={list.filter((m) => m.status === "done").length}
                  onSaved={() => { show("Đã lưu"); router.refresh(); }}
                  onError={show}
                />
              );
            })}
          </div>
        );
      })}
      <Toast message={msg} />
    </div>
  );
}

/** Compute completion stats for a round, accounting for swiss leg requirements. */
function roundStats(matches: AdminMatch[]): { complete: boolean; statsText: string } {
  if (matches.length === 0) return { complete: false, statsText: "Chưa có cặp đấu" };

  const total = matches.length;
  const done = matches.filter((m) => m.status === "done").length;
  const allDone = done === total;

  const firstMatch = matches[0];
  if (firstMatch.round_type === "swiss") {
    const cfg = firstMatch.round_config as Record<string, number> | null;
    const winsToAdvance = cfg?.wins_to_advance ?? 2;
    const maxLegs = 2 * winsToAdvance - 1;
    const committedLegs = new Set(matches.map((m) => m.leg_id).filter(Boolean)).size;
    const complete = allDone && committedLegs >= maxLegs;
    const legsText = `${committedLegs}/${maxLegs} lượt`;
    return { complete, statsText: `${done}/${total} cặp xong · ${legsText}` };
  }

  return { complete: allDone && total > 0, statsText: `${done}/${total} cặp xong` };
}

/** Collapsible section for one leg / group. Defaults closed when every match
 *  in the leg is already done, open otherwise. */
function LegSection({ sub, matches, total, doneCount, onSaved, onError }: {
  sub: string; matches: AdminMatch[]; total: number; doneCount: number;
  onSaved: () => void; onError: (s: string) => void;
}) {
  const allDone = total > 0 && doneCount === total;
  const [open, setOpen] = useState(!allDone);
  const label = sub || "Cặp đấu";
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer",
          background: "rgba(93,182,255,.05)", border: "1px solid rgba(93,182,255,.18)", borderRadius: 8, padding: "8px 12px", margin: "6px 0" }}
      >
        <span style={{ color: "#5db6ff", fontSize: 12, width: 12 }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9bd8ff", letterSpacing: 1, flex: 1 }}>{label.toUpperCase()}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: allDone ? "#5db6ff" : "#b9c3e6" }}>{allDone ? "✓ " : ""}{doneCount}/{total} xong</span>
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px,1fr))", gap: 10 }}>
          {matches.map((m) => <MatchEditor key={m.id} m={m} onSaved={onSaved} onError={onError} />)}
        </div>
      )}
    </div>
  );
}

function MatchEditor({ m, onSaved, onError }: { m: AdminMatch; onSaved: () => void; onError: (s: string) => void }) {
  const bestOf = effectiveBestOf(m.round_config, m.leg_name) || 99;

  const [s1, setS1] = useState(m.player1_score);
  const [s2, setS2] = useState(m.player2_score);
  const [status, setStatus] = useState<MatchStatus>(m.status);
  const [m1, setM1] = useState(m.player1_machine ?? "");
  const [m2, setM2] = useState(m.player2_machine ?? "");
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function autoStatus(score1: number, score2: number): MatchStatus {
    if (score1 >= bestOf || score2 >= bestOf) return "done";
    if (score1 > 0 || score2 > 0) return "live";
    return "pending";
  }

  async function doSave(score1: number, score2: number, st: MatchStatus) {
    setBusy(true);
    await setMatchMachines(m.id, m1 === "" ? null : +m1, m2 === "" ? null : +m2);
    const r = await updateResult(m.id, score1, score2, st);
    setBusy(false);
    if (r.ok) onSaved(); else onError(r.error);
  }

  function schedSave(score1: number, score2: number, st: MatchStatus) {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(score1, score2, st), 250);
  }

  function incS1() {
    if (s1 >= bestOf) return;
    const v = s1 + 1; const st = autoStatus(v, s2);
    setS1(v); setStatus(st); schedSave(v, s2, st);
  }
  function decS1() {
    if (s1 <= 0) return;
    const v = s1 - 1; const st = autoStatus(v, s2);
    setS1(v); setStatus(st); schedSave(v, s2, st);
  }
  function incS2() {
    if (s2 >= bestOf) return;
    const v = s2 + 1; const st = autoStatus(s1, v);
    setS2(v); setStatus(st); schedSave(s1, v, st);
  }
  function decS2() {
    if (s2 <= 0) return;
    const v = s2 - 1; const st = autoStatus(s1, v);
    setS2(v); setStatus(st); schedSave(s1, v, st);
  }

  const live = status === "live", done = status === "done";
  const border = live ? "1px solid rgba(93,182,255,.45)" : done ? "1px solid #242c64" : "1px dashed #2c3470";

  const stepper = (v: number, dec: () => void, inc: () => void, atCap: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={dec} disabled={v <= 0} style={stepBtnStyle(v <= 0)}>−</button>
      <span style={{ fontFamily: FONT_SAIRA, fontStyle: "italic", fontWeight: 800, fontSize: 22, minWidth: 22, textAlign: "center", color: atCap ? "#5db6ff" : undefined }}>{v}</span>
      <button onClick={inc} disabled={v >= bestOf} style={stepBtnStyle(v >= bestOf)}>+</button>
    </div>
  );

  // One row per player: the name takes the full card width and truncates only
  // when truly long; the machine box + score stepper sit on the right.
  const playerRow = (fullName: string | null, nick: string | null, mv: string, setMv: (s: string) => void, score: number, dec: () => void, inc: () => void, atCap: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName ?? nick ?? "Chờ KQ"}</div>
        {fullName && nick && fullName !== nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 500, fontSize: 12, color: "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nick}</div>}
      </div>
      <input value={mv} onChange={(e) => setMv(e.target.value.replace(/\D/g, ""))} placeholder="máy" title="Số máy"
        style={{ width: 46, padding: "3px 6px", borderRadius: 6, background: "rgba(255,255,255,.05)", border: "1px solid #2c3470", color: "#9bd8ff", fontFamily: FONT_MONO, fontSize: 11, textAlign: "center", outline: "none", flexShrink: 0 }} />
      <div style={{ flexShrink: 0 }}>{stepper(score, dec, inc, atCap)}</div>
    </div>
  );

  return (
    <div style={{ background: "rgba(255,255,255,.03)", border, borderRadius: 11, padding: "12px 14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {playerRow(m.an_full, m.an, String(m1), (s) => setM1(s), s1, decS1, incS1, s1 >= bestOf)}
        <div style={{ height: 1, background: "rgba(93,182,255,.1)" }} />
        {playerRow(m.bn_full, m.bn, String(m2), (s) => setM2(s), s2, decS2, incS2, s2 >= bestOf)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <Select value={status} onChange={(e) => { const st = e.target.value as MatchStatus; setStatus(st); void doSave(s1, s2, st); }} style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}>
          <option value="pending">Chờ</option>
          <option value="live">Đang đánh</option>
          <option value="done">Xong</option>
        </Select>
        {busy && <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6", marginLeft: 4 }}>Đang lưu…</span>}
        {bestOf < 99 && <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#b9c3e6", marginLeft: "auto" }}>best of {bestOf}</span>}
      </div>
    </div>
  );
}

function stepBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 8,
    border: "1px solid rgba(93,182,255,.4)",
    background: disabled ? "rgba(93,182,255,.03)" : "rgba(93,182,255,.08)",
    color: disabled ? "#828aac" : "#bfe2ff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 16, lineHeight: 1,
  };
}
