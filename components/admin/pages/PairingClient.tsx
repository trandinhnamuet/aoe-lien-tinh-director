"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { setRoundPlayers, generateGroups, commitPairs, generateBracket } from "@/lib/actions";
import { groupSplitOptions, splitIntoGroups, randomPairs, swissPairsByRecord, shuffle, isPowerOfTwo, bracketLegNames } from "@/lib/pairing";
import type { ClusterWithMeta, TournamentWithCount } from "@/lib/admin-queries";
import type { Round, Player } from "@/lib/types";
import { Btn, Card, PageTitle, Select, Badge, Toast, useToast, FONT_SAIRA, FONT_MONO } from "@/components/admin/ui";
import AdminScopePicker from "@/components/admin/AdminScopePicker";

export interface SwissState {
  recs: { id: string; win: number; loss: number; advanced: boolean; eliminated: boolean }[];
  played: string[]; // "idA|idB" keys, ids sorted
}

export default function PairingClient({ tournaments, tournamentId, clusters, clusterId, rounds, round, players, participantIds, legCount, swissState, eligibleIds }: {
  tournaments: TournamentWithCount[]; tournamentId: string; clusters: ClusterWithMeta[]; clusterId: string; rounds: Round[]; round: Round | null;
  players: Player[]; participantIds: string[]; legCount: number; swissState: SwissState | null; eligibleIds: string[] | null;
}) {
  const router = useRouter();
  const { msg, show } = useToast();
  const nameOf = useMemo(() => new Map(players.map((p) => [p.id, { name: p.full_name, nick: p.aoe_nickname }])), [players]);
  const [checked, setChecked] = useState<Set<string>>(() => {
    // Default selection: a previously-saved list wins; otherwise pre-select all
    // valid players — active players for a swiss leg 2+, else whoever advanced
    // from the previous round, else everyone in the cluster.
    if (participantIds.length > 0) return new Set(participantIds);
    if (swissState) return new Set(swissState.recs.filter((r) => !r.advanced && !r.eliminated).map((r) => r.id));
    if (eligibleIds) return new Set(eligibleIds);
    return new Set(players.map((p) => p.id));
  });
  const [busy, setBusy] = useState(false);

  // preview state
  const [groupOpt, setGroupOpt] = useState(0);
  const [groupPreview, setGroupPreview] = useState<string[][] | null>(null);
  const [pairPreview, setPairPreview] = useState<[string, string | null][] | null>(null);
  const [bracketPreview, setBracketPreview] = useState<string[] | null>(null);
  const [swissMode, setSwissMode] = useState<"record" | "random">("record"); // leg 2+ draw mode

  const partIds = useMemo(() => [...checked], [checked]);
  const opts = useMemo(() => groupSplitOptions(partIds.length), [partIds.length]);

  // Swiss leg 2+: records carried over from prior legs (source: server).
  const swissActive = useMemo(() => (swissState?.recs ?? []).filter((r) => !r.advanced && !r.eliminated), [swissState]);
  const recOf = useMemo(() => new Map((swissState?.recs ?? []).map((r) => [r.id, r])), [swissState]);
  const playedSet = useMemo(() => new Set(swissState?.played ?? []), [swissState]);
  // Eliminated players (loss >= wins_to_advance in the current swiss round) drop out.
  const eliminatedIds = useMemo(() => new Set((swissState?.recs ?? []).filter((r) => r.eliminated).map((r) => r.id)), [swissState]);
  // Players eligible for this round = advanced from the previous round (null = no restriction).
  const eligibleSet = useMemo(() => (eligibleIds ? new Set(eligibleIds) : null), [eligibleIds]);
  const visiblePlayers = useMemo(
    () => players.filter((p) => !eliminatedIds.has(p.id) && (!eligibleSet || eligibleSet.has(p.id))),
    [players, eliminatedIds, eligibleSet],
  );

  function toggle(id: string) {
    const n = new Set(checked);
    if (n.has(id)) n.delete(id); else n.add(id);
    setChecked(n);
  }
  async function saveParticipants() {
    setBusy(true);
    const r = await setRoundPlayers(round!.id, [...checked]);
    setBusy(false);
    if (r.ok) { show(`Đã lưu ${checked.size} game thủ vào vòng`); setGroupPreview(null); setPairPreview(null); setBracketPreview(null); router.refresh(); }
    else show(r.error);
  }

  if (!round) {
    return <div><PageTitle title="Xếp cặp / chia bảng" sub="A7" /><Card><div style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 13 }}>Cụm chưa có vòng đấu. Tạo vòng ở mục Thể thức.</div></Card></div>;
  }

  const type = round.round_type;
  // Use record-based Swiss pairing once at least one leg has been played.
  const useSwissRecord = type === "swiss" && legCount > 0 && swissActive.length > 0;
  const recBadge = (id: string) => {
    const r = recOf.get(id);
    return r ? <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#9bd8ff", marginLeft: 6 }}>{r.win}–{r.loss}</span> : null;
  };
  const modePill = (active: boolean): CSSProperties => ({
    padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 12,
    color: active ? "#0a1c44" : "#bfe2ff",
    background: active ? "linear-gradient(150deg,#9bd8ff,#5db6ff)" : "rgba(93,182,255,.08)",
    border: "1px solid rgba(93,182,255,.3)",
  });

  return (
    <div>
      <PageTitle title="Xếp cặp / chia bảng" sub={`A7 · ${round.name.toUpperCase()}`} right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <AdminScopePicker basePath="/admin/pairing" tournaments={tournaments} tournamentId={tournamentId} clusters={clusters} clusterId={clusterId} />
          <Select value={round.id} onChange={(e) => router.push(`/admin/pairing?tournament=${tournamentId}&cluster=${clusterId}&round=${e.target.value}`)} style={{ width: 200 }}>
            {rounds.map((r) => <option key={r.id} value={r.id}>{r.order_no}. {r.name}</option>)}
          </Select>
        </div>
      } />

      {/* participants */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 17, textTransform: "uppercase" }}>Game thủ vào vòng · <span style={{ color: "#5db6ff" }}>{checked.size}</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" onClick={() => setChecked(new Set(visiblePlayers.map((p) => p.id)))} style={{ fontSize: 12, padding: "6px 10px" }}>Chọn tất cả</Btn>
            <Btn kind="ghost" onClick={() => setChecked(new Set())} style={{ fontSize: 12, padding: "6px 10px" }}>Bỏ chọn</Btn>
            <Btn kind="primary" onClick={saveParticipants} disabled={busy} style={{ fontSize: 12, padding: "6px 12px" }}>Lưu danh sách</Btn>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 6 }}>
          {visiblePlayers.map((p) => (
            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer", background: checked.has(p.id) ? "rgba(93,182,255,.1)" : "rgba(255,255,255,.02)", border: `1px solid ${checked.has(p.id) ? "rgba(93,182,255,.3)" : "transparent"}` }}>
              <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggle(p.id)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.full_name}{recBadge(p.id)}</div>
                {p.aoe_nickname && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 500, fontSize: 11, color: "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.aoe_nickname}</div>}
              </div>
            </label>
          ))}
          {visiblePlayers.length === 0 && <div style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 13 }}>Cụm chưa có game thủ.</div>}
        </div>
        <div style={{ fontSize: 12, color: "#b9c3e6", marginTop: 8 }}>Lưu danh sách trước, rồi bốc thăm bên dưới. (Danh sách đã lưu: {participantIds.length})</div>
      </Card>

      {/* type-specific tool */}
      <Card>
        {type === "group" && (
          <div>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 17, textTransform: "uppercase", marginBottom: 10 }}>Chia bảng · {partIds.length} game thủ đã chọn</div>
            {opts.length === 0 ? <div style={{ color: "#ffce6b", fontFamily: FONT_MONO, fontSize: 12 }}>Số game thủ đã chọn ({partIds.length}) không chia được thành bảng hợp lệ (mỗi bảng 3–6, số bảng là lũy thừa 2). Hãy điều chỉnh danh sách bên trên.</div> : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {opts.map((o, i) => (
                    <button key={i} onClick={() => { setGroupOpt(i); setGroupPreview(null); }} style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 12, color: i === groupOpt ? "#0a1c44" : "#bfe2ff", background: i === groupOpt ? "linear-gradient(150deg,#9bd8ff,#5db6ff)" : "rgba(93,182,255,.08)", border: "1px solid rgba(93,182,255,.3)" }}>{o.label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <Btn kind="secondary" onClick={() => setGroupPreview(splitIntoGroups(partIds, opts[groupOpt].sizes))}>🎲 Bốc thăm chia bảng</Btn>
                  {groupPreview && <Btn kind="primary" disabled={busy} onClick={async () => {
                    setBusy(true);
                    const groups = groupPreview.map((ids, i) => ({ name: String.fromCharCode(65 + i), playerIds: ids }));
                    const r = await generateGroups(round.id, groups); setBusy(false);
                    if (r.ok) { show("Đã chốt chia bảng"); router.refresh(); } else show(r.error);
                  }}>✓ Chốt chia bảng</Btn>}
                </div>
                {groupPreview && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
                    {groupPreview.map((ids, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(93,182,255,.16)", borderRadius: 10, padding: 12, animation: "shuffle .4s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 800, fontStyle: "italic", color: "#5db6ff" }}>Bảng {String.fromCharCode(65 + i)}</div>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6" }}>{ids.length} người</div>
                        </div>
                        {ids.map((id) => { const p = nameOf.get(id); return (
                          <div key={id} style={{ padding: "2px 0" }}>
                            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 13 }}>{p?.name ?? id}</div>
                            {p?.nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 11, color: "#9bd8ff" }}>{p.nick}</div>}
                          </div>
                        ); })}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(type === "swiss" || type === "knockout_multi") && (
          <div>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 17, textTransform: "uppercase", marginBottom: 10 }}>
              {type === "swiss" ? `Bốc thăm lượt mới (Lượt ${legCount + 1})` : "Bốc thăm cặp đấu"} · {useSwissRecord ? `${swissActive.length} game thủ còn thi đấu` : `${partIds.length} game thủ đã chọn`}
            </div>
            {useSwissRecord && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <button onClick={() => { setSwissMode("record"); setPairPreview(null); }} style={modePill(swissMode === "record")}>Ghép theo thành tích</button>
                <button onClick={() => { setSwissMode("random"); setPairPreview(null); }} style={modePill(swissMode === "random")}>Random hoàn toàn</button>
              </div>
            )}
            {useSwissRecord && swissMode === "record" && (
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(93,182,255,.06)", border: "1px solid rgba(93,182,255,.2)" }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9bd8ff", marginBottom: 6 }}>GHÉP THEO THÀNH TÍCH — cùng thắng/thua gặp nhau</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {Object.entries(swissActive.reduce((acc, r) => { const k = `${r.win}–${r.loss}`; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {} as Record<string, number>))
                    .sort((a, b) => Number(b[0][0]) - Number(a[0][0]))
                    .map(([k, n]) => <span key={k} style={{ fontFamily: FONT_MONO, fontSize: 12 }}><b style={{ color: "#bfe2ff" }}>{k}</b>: {n} người</span>)}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Btn kind="secondary" onClick={() => setPairPreview(
                useSwissRecord
                  ? (swissMode === "record" ? swissPairsByRecord(swissActive, playedSet) : randomPairs(swissActive.map((r) => r.id)))
                  : randomPairs(partIds)
              )}>
                {useSwissRecord ? (swissMode === "record" ? "🎲 Bốc thăm theo thành tích" : "🎲 Bốc thăm ngẫu nhiên") : "🎲 Bốc thăm cặp"}
              </Btn>
              {pairPreview && <Btn kind="primary" disabled={busy} onClick={async () => {
                setBusy(true);
                const pairs = pairPreview.map(([a, b]) => ({ p1: a, p2: b }));
                const legName = type === "swiss" ? `Lượt ${legCount + 1}` : null;
                const r = await commitPairs(round.id, legName, pairs); setBusy(false);
                if (r.ok) { show("Đã chốt cặp đấu"); setPairPreview(null); router.refresh(); } else show(r.error);
              }}>✓ Chốt cặp đấu</Btn>}
            </div>
            {pairPreview && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 8 }}>
                {pairPreview.map(([a, b], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,.03)", border: "1px solid rgba(93,182,255,.16)", borderRadius: 8, padding: "8px 12px", animation: "shuffle .4s" }}>
                    {(() => { const pa = nameOf.get(a); return (
                      <div><div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 14 }}>{pa?.name ?? a}{recBadge(a)}</div>{pa?.nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 11, color: "#9bd8ff" }}>{pa.nick}</div>}</div>
                    ); })()}
                    <span style={{ color: "#b9c3e6", fontFamily: FONT_MONO, fontSize: 11, padding: "0 8px" }}>vs</span>
                    {b ? (() => { const pb = nameOf.get(b); return (
                      <div style={{ textAlign: "right" }}><div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 14 }}>{pb?.name ?? b}{recBadge(b)}</div>{pb?.nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 11, color: "#9bd8ff" }}>{pb.nick}</div>}</div>
                    ); })() : <Badge tone="warn">BYE</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {type === "knockout_single" && (
          <div>
            <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 17, textTransform: "uppercase", marginBottom: 10 }}>Bốc thăm nhánh đấu · {partIds.length} game thủ đã chọn</div>
            {!isPowerOfTwo(partIds.length) ? <div style={{ color: "#ffce6b", fontFamily: FONT_MONO, fontSize: 12 }}>Cần số game thủ là lũy thừa của 2 (2, 4, 8, 16…). Hiện có {partIds.length}.</div> : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <Btn kind="secondary" onClick={() => setBracketPreview(shuffle(partIds))}>🎲 Bốc thăm nhánh</Btn>
                  {bracketPreview && <Btn kind="primary" disabled={busy} onClick={async () => {
                    setBusy(true);
                    const third = (round.config as { third_place?: boolean })?.third_place !== false;
                    const r = await generateBracket(round.id, bracketPreview, bracketPreview.map(() => null), third); setBusy(false);
                    if (r.ok) { show("Đã chốt sơ đồ nhánh"); setBracketPreview(null); router.refresh(); } else show(r.error);
                  }}>✓ Chốt sơ đồ</Btn>}
                </div>
                {bracketPreview && (
                  <>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#b9c3e6", marginBottom: 10 }}>
                      Xem trước cây phân nhánh — winner mỗi cặp đi tiếp sang cột bên phải. Slot &quot;Thắng …&quot; cho biết đối thủ tiềm năng ở vòng sau.
                    </div>
                    <BracketPreview ids={bracketPreview} nameOf={nameOf} />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </Card>
      <Toast message={msg} />
    </div>
  );
}

/**
 * Full single-elimination bracket preview from a seeded player order.
 * Round 0 shows the real first-round pairs; later rounds show "Thắng <vòng N>"
 * placeholders so the path to the final (and potential future opponents) is
 * visible before committing. Mirrors the seeding used by generateBracket:
 * match k of a round is fed by matches 2k and 2k+1 of the previous round.
 */
function BracketPreview({ ids, nameOf }: { ids: string[]; nameOf: Map<string, { name: string; nick: string | null }> }) {
  const legNames = bracketLegNames(ids.length); // e.g. ["Tứ kết","Bán kết","Chung kết"]
  const columns = legNames.map((name, lvl) => {
    const count = ids.length / Math.pow(2, lvl + 1);
    const nodes = Array.from({ length: count }, (_, k) => {
      if (lvl === 0) return { aId: ids[2 * k] ?? null, bId: ids[2 * k + 1] ?? null, aLabel: null as string | null, bLabel: null as string | null };
      const prev = legNames[lvl - 1];
      return { aId: null as string | null, bId: null as string | null, aLabel: `Thắng ${prev} ${2 * k + 1}`, bLabel: `Thắng ${prev} ${2 * k + 2}` };
    });
    return { name, nodes };
  });

  const slot = (id: string | null, label: string | null) => {
    if (id) {
      const p = nameOf.get(id);
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_SAIRA, fontWeight: 700, fontSize: 16, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.name ?? id}</div>
          {p?.nick && <div style={{ fontFamily: FONT_SAIRA, fontWeight: 400, fontSize: 12, color: "#9bd8ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nick}</div>}
        </div>
      );
    }
    return <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#a8b3d8", fontStyle: "italic" }}>{label}</div>;
  };

  // Min width keeps it readable when there are many rounds (then it scrolls);
  // otherwise the flex columns stretch to fill the full available width.
  return (
    <div style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div className="bkp" style={{ minWidth: columns.length * 240 }}>
        {columns.map((col, ci) => {
          const isFinal = ci === columns.length - 1;
          return (
            <div key={ci} className="bkp-round">
              <div className={`bkp-title${isFinal ? " final" : ""}`}>{isFinal ? "★ " : ""}{col.name.toUpperCase()}</div>
              <div className="bkp-body">
                {col.nodes.map((n, ni) => (
                  <div key={ni} className="bkp-match">
                    <div className={`bkp-card${isFinal ? " final" : ""}`} style={{ animation: "shuffle .4s" }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#b9c3e6", letterSpacing: 1, marginBottom: 7 }}>{col.name.toUpperCase()} {ni + 1}</div>
                      {slot(n.aId, n.aLabel)}
                      <div style={{ height: 1, background: "rgba(93,182,255,.14)", margin: "8px 0" }} />
                      {slot(n.bId, n.bLabel)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
