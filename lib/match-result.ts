import "server-only";
import type { TransactionSql } from "postgres";
import { sql } from "./db";
import { effectiveBestOf } from "./pairing";
import type { MatchStatus } from "./types";

async function setSlot(tx: TransactionSql<Record<string, never>>, matchId: string, slot: number, playerId: string | null, machine: number | null) {
  if (slot === 1) await tx`update aoe.matches set player1_id=${playerId}, player1_machine=${machine} where id=${matchId}`;
  else await tx`update aoe.matches set player2_id=${playerId}, player2_machine=${machine} where id=${matchId}`;
}

/**
 * Persist a match score/machines and resolve its status against the per-round
 * best_of cap (reaching the cap finishes it + sets the winner; dropping below
 * un-finishes it). Propagates the winner into / clears downstream knockout
 * slots. Returns the resolved status. No cache revalidation / page re-render —
 * callers (the results API route) return JSON and the client updates locally.
 */
export async function saveMatchResult(
  matchId: string, s1: number, s2: number, status: MatchStatus,
  m1: number | null = null, m2: number | null = null,
): Promise<MatchStatus> {
  let finalStatus: MatchStatus = status;
  await sql.begin(async (tx) => {
    const [m] = await tx<{ player1_id: string | null; player2_id: string | null; next_match_id: string | null; next_match_slot: number | null; loser_next_match_id: string | null; round_config: Record<string, unknown> | null; leg_name: string | null }[]>`
      select m.player1_id, m.player2_id, m.next_match_id, m.next_match_slot, m.loser_next_match_id, r.config as round_config, l.name as leg_name
      from aoe.matches m join aoe.rounds r on r.id = m.round_id
      left join aoe.legs l on l.id = m.leg_id where m.id=${matchId}`;
    if (!m) throw new Error("Không tìm thấy cặp đấu");
    const bestOf = effectiveBestOf(m.round_config, m.leg_name);
    finalStatus = status;
    if (bestOf > 0) {
      if (s1 >= bestOf || s2 >= bestOf) finalStatus = "done";
      else if (status === "done") finalStatus = s1 > 0 || s2 > 0 ? "live" : "pending";
    }
    let winner: string | null = null;
    if (finalStatus === "done") winner = s1 > s2 ? m.player1_id : s2 > s1 ? m.player2_id : null;
    await tx`update aoe.matches set player1_score=${s1}, player2_score=${s2}, player1_machine=${m1}, player2_machine=${m2}, status=${finalStatus}, winner_id=${winner} where id=${matchId}`;
    if (finalStatus === "done" && winner) {
      const loser = winner === m.player1_id ? m.player2_id : m.player1_id;
      if (m.next_match_id && m.next_match_slot) await setSlot(tx, m.next_match_id, m.next_match_slot, winner, null);
      if (m.loser_next_match_id && m.next_match_slot) await setSlot(tx, m.loser_next_match_id, m.next_match_slot, loser, null);
    } else if (m.next_match_slot) {
      if (m.next_match_id) await setSlot(tx, m.next_match_id, m.next_match_slot, null, null);
      if (m.loser_next_match_id) await setSlot(tx, m.loser_next_match_id, m.next_match_slot, null, null);
    }
  });
  return finalStatus;
}
