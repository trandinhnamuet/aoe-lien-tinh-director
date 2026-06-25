import "server-only";
import { sql } from "./db";
import { groupStandings, swissStanding, type MiniMatch } from "./standings";
import type {
  ClusterSnapshot, RoundSnapshot, MatchCardVM, GroupVM, SwissLegVM,
  BracketColumnVM, BracketNodeVM, ClusterOption, MatchStatus, RoundType,
} from "./types";

interface MRow {
  id: string; round_id: string; leg_id: string | null; group_id: string | null;
  player1_id: string | null; player2_id: string | null;
  player1_machine: number | null; player2_machine: number | null;
  player1_score: number; player2_score: number; winner_id: string | null;
  is_bye: boolean; status: MatchStatus; sort_order: number;
  next_match_id: string | null; next_match_slot: number | null; loser_next_match_id: string | null;
  an: string | null;      // coalesce(nickname, full_name)
  bn: string | null;
  an_full: string | null; // full_name
  bn_full: string | null;
}

function num(config: Record<string, unknown>, key: string, dflt: number): number {
  const v = config?.[key];
  return typeof v === "number" ? v : dflt;
}

function configText(type: RoundType, c: Record<string, unknown>): string {
  if (type === "group") {
    const adv = num(c, "advance_per_group", 2);
    const bo = num(c, "best_of", 3);
    const gc = c.groups_count ? `${num(c, "groups_count", 0)} bảng · ` : "";
    return `${gc}top ${adv} đi tiếp · vòng tròn chạm ${bo}`;
  }
  if (type === "swiss") {
    const w = num(c, "wins_to_advance", 2);
    const bo = num(c, "best_of", 2);
    return `Chạm ${bo} · thắng ${w} đi tiếp · ${2 * w - 1} lượt`;
  }
  if (type === "knockout_single") {
    const bo = num(c, "best_of", 3);
    const byRound = (c.best_of_by_round as Record<string, number> | undefined) ?? {};
    const overrides = Object.entries(byRound).filter(([, v]) => typeof v === "number" && v > 0);
    // legacy final_best_of shown as a Chung kết override if no explicit one set
    if (!byRound["Chung kết"] && typeof c.final_best_of === "number" && c.final_best_of > 0) {
      overrides.push(["Chung kết", c.final_best_of as number]);
    }
    const ovText = overrides.length ? " · " + overrides.map(([k, v]) => `${k} chạm ${v}`).join(" · ") : "";
    const third = c.third_place ? " · có tranh 3–4" : "";
    return `Chạm ${bo}${ovText}${third}`;
  }
  return `Chạm ${num(c, "best_of", 3)}`;
}

function toMini(m: MRow): MiniMatch {
  return {
    player1_id: m.player1_id, player2_id: m.player2_id,
    player1_score: m.player1_score, player2_score: m.player2_score,
    winner_id: m.winner_id, status: m.status,
  };
}

function cardVM(m: MRow): MatchCardVM {
  const done = m.status === "done";
  return {
    id: m.id,
    aName: m.an_full ?? m.an ?? "—", aNick: m.an ?? "—", aMachine: m.player1_machine,
    aScore: m.status === "pending" ? null : m.player1_score,
    bName: m.bn_full ?? m.bn ?? "—", bNick: m.bn ?? "—", bMachine: m.player2_machine,
    bScore: m.status === "pending" ? null : m.player2_score,
    status: m.status,
    winner: done ? (m.winner_id === m.player1_id ? "a" : m.winner_id === m.player2_id ? "b" : "") : "",
    advanceA: done && m.winner_id === m.player1_id,
    advanceB: done && m.winner_id === m.player2_id,
  };
}

function bracketNode(m: MRow | undefined, p1Nick?: string, p1M?: number | null, p2Nick?: string, p2M?: number | null): BracketNodeVM {
  if (!m) {
    return { id: null, aName: p1Nick ?? null, aNick: p1Nick ?? null, aMachine: p1M ?? null, aScore: null,
      bName: p2Nick ?? null, bNick: p2Nick ?? null, bMachine: p2M ?? null, bScore: null, status: "pending", winner: "" };
  }
  const done = m.status === "done", live = m.status === "live";
  return {
    id: m.id,
    aName: m.an_full ?? m.an, aNick: m.an, aMachine: m.player1_machine, aScore: done || live ? m.player1_score : null,
    bName: m.bn_full ?? m.bn, bNick: m.bn, bMachine: m.player2_machine, bScore: done || live ? m.player2_score : null,
    status: m.status,
    winner: done ? (m.winner_id === m.player1_id ? "a" : m.winner_id === m.player2_id ? "b" : "") : "",
  };
}

export async function getClusterSnapshot(clusterId: string): Promise<ClusterSnapshot | null> {
  const clusterRows = await sql<
    { id: string; name: string; location: string | null; date: string | null; status: ClusterSnapshot["cluster"]["status"];
      tid: string; tname: string; tyear: number }[]
  >`
    select c.id, c.name, c.location, to_char(c.match_date,'DD.MM.YYYY') as date, c.status,
           t.id as tid, t.name as tname, t.year as tyear
    from aoe.clusters c join aoe.tournaments t on t.id = c.tournament_id
    where c.id = ${clusterId}`;
  if (clusterRows.length === 0) return null;
  const c = clusterRows[0];

  const [optRows, roundRows, groupRows, legRows, matchRows, partRows] = await Promise.all([
    sql<ClusterOption[]>`
      select id, name, location, to_char(match_date,'DD.MM.YYYY') as date, status
      from aoe.clusters where tournament_id = ${c.tid} and status <> 'draft'
      order by sort_order, match_date`,
    sql<{ id: string; order_no: number; name: string; round_type: RoundType; config: Record<string, unknown>; status: string }[]>`
      select id, order_no, name, round_type, config, status from aoe.rounds
      where cluster_id = ${clusterId} order by order_no`,
    sql<{ id: string; name: string; round_id: string }[]>`
      select g.id, g.name, g.round_id from aoe.groups g
      join aoe.rounds r on r.id = g.round_id where r.cluster_id = ${clusterId} order by g.name`,
    sql<{ id: string; round_id: string; leg_no: number; name: string }[]>`
      select l.id, l.round_id, l.leg_no, l.name from aoe.legs l
      join aoe.rounds r on r.id = l.round_id where r.cluster_id = ${clusterId} order by l.leg_no`,
    sql<MRow[]>`
      select m.id, m.round_id, m.leg_id, m.group_id, m.player1_id, m.player2_id,
             m.player1_machine, m.player2_machine, m.player1_score, m.player2_score,
             m.winner_id, m.is_bye, m.status, m.sort_order,
             m.next_match_id, m.next_match_slot, m.loser_next_match_id,
             coalesce(pa.aoe_nickname, pa.full_name) as an, pa.full_name as an_full,
             coalesce(pb.aoe_nickname, pb.full_name) as bn, pb.full_name as bn_full
      from aoe.matches m
      left join aoe.players pa on pa.id = m.player1_id
      left join aoe.players pb on pb.id = m.player2_id
      join aoe.rounds r on r.id = m.round_id
      where r.cluster_id = ${clusterId}
      order by m.sort_order, m.created_at`,
    sql<{ round_id: string; player_id: string; outcome: string; wins: number; losses: number; nick: string; full_name: string }[]>`
      select rp.round_id, rp.player_id, rp.outcome, rp.wins, rp.losses,
             coalesce(p.aoe_nickname, p.full_name) as nick, p.full_name
      from aoe.round_participants rp join aoe.players p on p.id = rp.player_id
      join aoe.rounds r on r.id = rp.round_id where r.cluster_id = ${clusterId}`,
  ]);

  const matchesByRound = new Map<string, MRow[]>();
  const matchById = new Map<string, MRow>();
  for (const m of matchRows) {
    if (!matchesByRound.has(m.round_id)) matchesByRound.set(m.round_id, []);
    matchesByRound.get(m.round_id)!.push(m);
    matchById.set(m.id, m);
  }

  const rounds: RoundSnapshot[] = [];

  for (const r of roundRows) {
    const cfgText = configText(r.round_type, r.config);
    const rMatches = matchesByRound.get(r.id) ?? [];

    if (r.round_type === "group") {
      const advance = num(r.config, "advance_per_group", 2);
      const bestOf = num(r.config, "best_of", 1);
      const showDraw = bestOf % 2 === 0; // draws only possible when the cap is even
      const groups = groupRows.filter((g) => g.round_id === r.id);
      const groupVMs: GroupVM[] = groups.map((g) => {
        const gm = rMatches.filter((m) => m.group_id === g.id);
        const ids = Array.from(new Set(gm.flatMap((m) => [m.player1_id, m.player2_id].filter(Boolean) as string[])));
        const nick = new Map<string, string>();
        const fullNameMap = new Map<string, string>();
        const mach = new Map<string, number | null>();
        for (const m of gm) {
          if (m.player1_id) { nick.set(m.player1_id, m.an ?? "—"); fullNameMap.set(m.player1_id, m.an_full ?? m.an ?? "—"); mach.set(m.player1_id, m.player1_machine); }
          if (m.player2_id) { nick.set(m.player2_id, m.bn ?? "—"); fullNameMap.set(m.player2_id, m.bn_full ?? m.bn ?? "—"); mach.set(m.player2_id, m.player2_machine); }
        }
        const st = groupStandings(ids, gm.map(toMini), advance);
        return {
          key: g.name,
          rows: st.map((row) => ({
            playerId: row.pid, rank: row.rank,
            fullName: fullNameMap.get(row.pid) ?? "—",
            nick: nick.get(row.pid) ?? "—",
            machine: mach.get(row.pid) ?? null, points: row.points, win: row.win, loss: row.loss, draw: row.draw, diff: row.diff, advance: row.advance,
          })),
          matches: gm.map((m) => {
            const done = m.status === "done", live = m.status === "live";
            return {
              aName: m.an_full ?? m.an ?? "—", aNick: m.an ?? "—",
              bName: m.bn_full ?? m.bn ?? "—", bNick: m.bn ?? "—",
              score: done || live ? `${m.player1_score}–${m.player2_score}` : "vs",
              aWin: done && m.winner_id === m.player1_id,
              bWin: done && m.winner_id === m.player2_id,
              live, done,
            };
          }),
          showDraw,
        };
      });
      rounds.push({ id: r.id, name: r.name, type: "group", configText: cfgText, groups: groupVMs });
    } else if (r.round_type === "swiss") {
      const wins = num(r.config, "wins_to_advance", 2);
      const parts = partRows.filter((p) => p.round_id === r.id);
      // Player set = saved participants ∪ everyone who actually has a match.
      // Matches are the source of truth, so standings work even if the
      // participant list was never explicitly saved (commitPairs skips it).
      const idSet = new Set<string>(parts.map((p) => p.player_id));
      for (const m of rMatches) {
        if (m.player1_id) idSet.add(m.player1_id);
        if (m.player2_id) idSet.add(m.player2_id);
      }
      const ids = [...idSet];
      const stand = swissStanding(ids, rMatches.map(toMini), wins);
      const rec = (pid: string | null) => { const s = pid ? stand.get(pid) : null; return s ? `${s.win}–${s.loss}` : "0–0"; };
      const legs = legRows.filter((l) => l.round_id === r.id);
      const legVMs: SwissLegVM[] = legs.map((l) => ({
        name: l.name,
        matches: rMatches.filter((m) => m.leg_id === l.id).map((m) => {
          const done = m.status === "done";
          return {
            id: m.id,
            aName: m.an_full ?? m.an ?? "—", aNick: m.an ?? "—", aMachine: m.player1_machine, aRec: rec(m.player1_id),
            bName: m.bn_full ?? m.bn ?? "—", bNick: m.bn ?? "—", bMachine: m.player2_machine, bRec: rec(m.player2_id),
            score: m.status === "pending" ? "vs" : `${m.player1_score} – ${m.player2_score}`,
            status: m.status,
            winner: (done ? (m.winner_id === m.player1_id ? "a" : m.winner_id === m.player2_id ? "b" : "") : "") as "a" | "b" | "",
          };
        }),
      }));
      const fullNameOf = new Map<string, string>(parts.map((p) => [p.player_id, (p.full_name as string) ?? p.nick]));
      for (const m of rMatches) {
        if (m.player1_id && !fullNameOf.has(m.player1_id)) fullNameOf.set(m.player1_id, m.an_full ?? m.an ?? "—");
        if (m.player2_id && !fullNameOf.has(m.player2_id)) fullNameOf.set(m.player2_id, m.bn_full ?? m.bn ?? "—");
      }
      const advanced: string[] = [], eliminated: string[] = [];
      for (const [pid, s] of stand) {
        if (s.advanced) advanced.push(fullNameOf.get(pid) ?? "—");
        else if (s.eliminated) eliminated.push(fullNameOf.get(pid) ?? "—");
      }
      rounds.push({ id: r.id, name: r.name, type: "swiss", configText: cfgText, legs: legVMs, advanced, eliminated });
    } else {
      // knockout (single/multi): columns per leg in order; fill TBD slots from feeder winners.
      const legs = legRows.filter((l) => l.round_id === r.id);
      const winnerNickMach = (m: MRow, slot: "a" | "b") => {
        const pid = slot === "a" ? m.player1_id : m.player2_id;
        const n = slot === "a" ? m.an : m.bn;
        const mc = slot === "a" ? m.player1_machine : m.player2_machine;
        return { pid, n, mc };
      };
      // For each match, resolve nick/machine of an empty slot from its feeders
      const feedersOf = new Map<string, { slot: number; from: MRow; win: boolean }[]>();
      for (const m of rMatches) {
        if (m.next_match_id) {
          if (!feedersOf.has(m.next_match_id)) feedersOf.set(m.next_match_id, []);
          feedersOf.get(m.next_match_id)!.push({ slot: m.next_match_slot ?? 1, from: m, win: true });
        }
        if (m.loser_next_match_id) {
          if (!feedersOf.has(m.loser_next_match_id)) feedersOf.set(m.loser_next_match_id, []);
          feedersOf.get(m.loser_next_match_id)!.push({ slot: m.next_match_slot ?? 1, from: m, win: false });
        }
      }
      const columns: BracketColumnVM[] = legs.length
        ? legs.map((l) => ({
            name: l.name,
            nodes: rMatches.filter((m) => m.leg_id === l.id).map((m) => {
              const node = bracketNode(m);
              if (!m.player1_id || !m.player2_id) {
                const feeders = feedersOf.get(m.id) ?? [];
                for (const f of feeders) {
                  const r2 = f.from;
                  let label: string | null = null;
                  if (r2.status === "done") {
                    const wid = r2.winner_id;
                    const targetPid = f.win ? wid : (wid === r2.player1_id ? r2.player2_id : r2.player1_id);
                    label = targetPid === r2.player1_id ? r2.an : targetPid === r2.player2_id ? r2.bn : null;
                  }
                  if (f.slot === 1 && !m.player1_id && label) { node.aNick = label; node.aName = label; }
                  if (f.slot === 2 && !m.player2_id && label) { node.bNick = label; node.bName = label; }
                }
              }
              return node;
            }),
          }))
        : [{ name: r.name, nodes: rMatches.map((m) => bracketNode(m)) }];

      let champion: string | null = null;
      const finalCol = columns.find((col) => /chung kết/i.test(col.name)) ?? columns[columns.length - 1];
      const fnode = finalCol?.nodes.find((n) => n.status === "done" && n.winner);
      if (fnode) champion = fnode.winner === "a" ? fnode.aName : fnode.bName;
      void winnerNickMach; void matchById;
      rounds.push({ id: r.id, name: r.name, type: r.round_type, configText: cfgText, columns, champion });
    }
  }

  // ----- dashboard: current round + current leg -----
  const liveRounds = roundRows.filter((r) => r.status === "live");
  const liveRound = liveRounds.length ? liveRounds[liveRounds.length - 1] : roundRows[roundRows.length - 1];
  let dashboardCards: MatchCardVM[] = [];
  let currentRound: ClusterSnapshot["currentRound"] = null;
  if (liveRound) {
    const rMatches = matchesByRound.get(liveRound.id) ?? [];
    const legs = legRows.filter((l) => l.round_id === liveRound.id);
    let scope = rMatches;
    let legName = "";
    if (legs.length) {
      const currentLeg = legs.find((l) => rMatches.some((m) => m.leg_id === l.id && m.status !== "done")) ?? legs[legs.length - 1];
      scope = rMatches.filter((m) => m.leg_id === currentLeg.id);
      legName = currentLeg.name;
    }
    dashboardCards = scope.filter((m) => m.player1_id || m.player2_id).map(cardVM);
    currentRound = {
      id: liveRound.id,
      name: legName ? `${legName} · ${liveRound.name}` : liveRound.name,
      configText: configText(liveRound.round_type, liveRound.config),
    };
  }

  return {
    tournament: { id: c.tid, name: c.tname, year: c.tyear },
    cluster: { id: c.id, name: c.name, location: c.location, date: c.date, status: c.status },
    currentRound,
    dashboardCards,
    rounds,
    clusterOptions: optRows,
  };
}

export async function getDefaultClusterId(): Promise<string | null> {
  const cur = await sql<{ value: string }[]>`select value::text as value from aoe.app_settings where key = 'current_cluster_id'`;
  const pinnedId = cur.length && cur[0].value ? cur[0].value.replace(/^"|"$/g, "").trim() || null : null;

  // (1) Admin's explicitly pinned cluster always wins — that is the whole point of
  //     the "Đặt hiện tại" button. Show it regardless of live/done (only skip draft).
  if (pinnedId) {
    const rows = await sql<{ id: string }[]>`select id from aoe.clusters where id = ${pinnedId} and status <> 'draft'`;
    if (rows.length) return rows[0].id;
  }
  // (2) No valid pin → fall back to the active competition
  const live = await sql<{ id: string }[]>`select id from aoe.clusters where status = 'live' order by match_date desc limit 1`;
  if (live.length) return live[0].id;
  // (3) Otherwise the most recent finished cluster
  const done = await sql<{ id: string }[]>`select id from aoe.clusters where status = 'done' order by match_date desc limit 1`;
  return done.length ? done[0].id : null;
}
