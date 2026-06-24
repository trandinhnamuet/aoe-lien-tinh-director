import { sql } from "@/lib/db";
import { resolveScope, listRounds, listPlayers, listRoundParticipants, getRound } from "@/lib/admin-queries";
import { swissStanding, groupStandings, type MiniMatch } from "@/lib/standings";
import type { Round } from "@/lib/types";
import PairingClient, { type SwissState } from "@/components/admin/pages/PairingClient";
import { NoCluster } from "@/components/admin/pages/NoCluster";

export const dynamic = "force-dynamic";

/**
 * Players still in contention after a round — i.e. eligible for the next one.
 * They are everyone who was NOT eliminated:
 *  - swiss → losses < wins_to_advance (advanced + still-active, so it also works
 *    while the round is mid-way and nobody has clinched advancement yet);
 *  - group → top advance_per_group of each group (the rest are eliminated);
 *  - knockout/unknown → null (no restriction).
 */
async function eligibleAfterRound(round: Round): Promise<Set<string> | null> {
  const ms = await sql<(MiniMatch & { group_id: string | null })[]>`
    select group_id, player1_id, player2_id, player1_score, player2_score, winner_id, status
    from aoe.matches where round_id = ${round.id}`;
  if (round.round_type === "swiss") {
    const wins = Number((round.config as Record<string, number>)?.wins_to_advance ?? 2);
    const ids = new Set<string>();
    for (const m of ms) { if (m.player1_id) ids.add(m.player1_id); if (m.player2_id) ids.add(m.player2_id); }
    const stand = swissStanding([...ids], ms, wins);
    return new Set([...stand.values()].filter((s) => !s.eliminated).map((s) => s.pid));
  }
  if (round.round_type === "group") {
    const per = Number((round.config as Record<string, number>)?.advance_per_group ?? 2);
    const byGroup = new Map<string, (MiniMatch & { group_id: string | null })[]>();
    for (const m of ms) {
      const k = m.group_id ?? "_";
      if (!byGroup.has(k)) byGroup.set(k, []);
      byGroup.get(k)!.push(m);
    }
    const advanced = new Set<string>();
    for (const gms of byGroup.values()) {
      const ids = new Set<string>();
      for (const m of gms) { if (m.player1_id) ids.add(m.player1_id); if (m.player2_id) ids.add(m.player2_id); }
      groupStandings([...ids], gms, per).filter((r) => r.advance).forEach((r) => advanced.add(r.pid));
    }
    return advanced;
  }
  return null; // knockout etc. — no restriction
}

export default async function Page({ searchParams }: { searchParams: Promise<{ tournament?: string; cluster?: string; round?: string }> }) {
  const sp = await searchParams;
  const { tournaments, tournamentId, clusters, clusterId } = await resolveScope(sp);
  if (!clusterId) return <NoCluster />;

  const [rounds, players] = await Promise.all([listRounds(clusterId), listPlayers(clusterId)]);

  // Default the round dropdown to the next round that still needs work: the first
  // round (by order) that isn't finished. A round is "finished" when it has matches,
  // all are done, and (swiss) enough legs have been played. So once a round is done,
  // the page auto-advances to the next one to pair.
  const comp = await sql<{ round_id: string; total: number; done: number; legs: number }[]>`
    select r.id as round_id, count(m.id)::int as total,
      count(m.id) filter (where m.status = 'done')::int as done,
      count(distinct m.leg_id)::int as legs
    from aoe.rounds r left join aoe.matches m on m.round_id = r.id
    where r.cluster_id = ${clusterId} group by r.id`;
  const compMap = new Map(comp.map((c) => [c.round_id, c]));
  const sortedRounds = [...rounds].sort((a, b) => a.order_no - b.order_no);
  const finished = (r: Round): boolean => {
    const c = compMap.get(r.id);
    if (!c || c.total === 0 || c.done !== c.total) return false;
    if (r.round_type === "swiss") {
      const wins = Number((r.config as Record<string, number>)?.wins_to_advance ?? 2);
      if (c.legs < 2 * wins - 1) return false;
    }
    return true;
  };
  const defaultRound = sortedRounds.find((r) => !finished(r)) ?? sortedRounds[sortedRounds.length - 1];

  const roundId = sp.round && rounds.some((r) => r.id === sp.round) ? sp.round : defaultRound?.id;
  const roundRow = roundId ? await getRound(roundId) : null;

  let participantIds: string[] = [];
  let legCount = 0;
  let swissState: SwissState | null = null;
  let eligibleIds: string[] | null = null;
  if (roundRow) {
    const parts = await listRoundParticipants(roundRow.id);
    participantIds = parts.map((p) => p.player_id);
    const legs = await sql<{ c: number }[]>`select count(*)::int as c from aoe.legs where round_id = ${roundRow.id}`;
    legCount = legs[0]?.c ?? 0;

    // Eligible players for THIS round = whoever advanced from the previous round.
    const sorted = [...rounds].sort((a, b) => a.order_no - b.order_no);
    const idx = sorted.findIndex((r) => r.id === roundRow.id);
    const prev = idx > 0 ? sorted[idx - 1] : null;
    if (prev) {
      const adv = await eligibleAfterRound(prev);
      if (adv) eligibleIds = [...adv];
    }

    // For swiss leg 2+: derive each player's record + prior matchups so the
    // next leg can pair players with the same record (cùng thành tích).
    if (roundRow.round_type === "swiss" && legCount > 0) {
      const ms = await sql<MiniMatch[]>`
        select player1_id, player2_id, player1_score, player2_score, winner_id, status
        from aoe.matches where round_id = ${roundRow.id}`;
      const wins = Number((roundRow.config as Record<string, number>)?.wins_to_advance ?? 2);
      const ids = new Set<string>(participantIds);
      for (const m of ms) { if (m.player1_id) ids.add(m.player1_id); if (m.player2_id) ids.add(m.player2_id); }
      const stand = swissStanding([...ids], ms, wins);
      const played: string[] = [];
      for (const m of ms) {
        if (m.player1_id && m.player2_id) played.push([m.player1_id, m.player2_id].sort().join("|"));
      }
      swissState = {
        recs: [...stand.values()].map((s) => ({ id: s.pid, win: s.win, loss: s.loss, advanced: s.advanced, eliminated: s.eliminated })),
        played,
      };
    }
  }

  return <PairingClient tournaments={tournaments} tournamentId={tournamentId ?? ""} clusters={clusters} clusterId={clusterId} rounds={rounds} round={roundRow} players={players} participantIds={participantIds} legCount={legCount} swissState={swissState} eligibleIds={eligibleIds} />;
}
