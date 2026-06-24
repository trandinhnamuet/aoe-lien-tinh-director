"use server";
import type { TransactionSql } from "postgres";
import { sql } from "./db";
import { requireAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import type { ClusterStatus, RoundStatus, RoundType, MatchStatus } from "./types";

type Result<T = object> = { ok: true } & T | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } { return { ok: false, error }; }

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------- Tournaments ----------------
export async function createTournament(input: { name: string; year: number; organizer?: string }): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    if (!input.name.trim()) return fail("Tên giải không được trống");
    const [r] = await sql<{ id: string }[]>`insert into aoe.tournaments (name, year, organizer)
      values (${input.name.trim()}, ${input.year}, ${input.organizer?.trim() || null}) returning id`;
    refresh();
    return { ok: true, id: r.id };
  } catch (e) { return fail(msg(e)); }
}

export async function updateTournament(id: string, input: { name: string; year: number; organizer?: string }): Promise<Result> {
  try {
    await requireAdmin();
    if (!input.name.trim()) return fail("Tên giải không được trống");
    await sql`update aoe.tournaments set name=${input.name.trim()}, year=${input.year}, organizer=${input.organizer?.trim() || null} where id=${id}`;
    refresh();
    return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

export async function deleteTournament(id: string): Promise<Result> {
  try { await requireAdmin(); await sql`delete from aoe.tournaments where id = ${id}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

// ---------------- Clusters ----------------
export async function createCluster(input: { tournamentId: string; name: string; location?: string; date?: string }): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    if (!input.name.trim()) return fail("Tên cụm không được trống");
    const [{ next }] = await sql<{ next: number }[]>`select coalesce(max(sort_order),0)+1 as next from aoe.clusters where tournament_id = ${input.tournamentId}`;
    const [r] = await sql<{ id: string }[]>`insert into aoe.clusters (tournament_id, name, location, match_date, sort_order)
      values (${input.tournamentId}, ${input.name.trim()}, ${input.location?.trim() || null}, ${input.date || null}, ${next}) returning id`;
    refresh();
    return { ok: true, id: r.id };
  } catch (e) { return fail(msg(e)); }
}

export async function updateCluster(id: string, input: { name: string; location?: string; date?: string }): Promise<Result> {
  try {
    await requireAdmin();
    await sql`update aoe.clusters set name=${input.name.trim()}, location=${input.location?.trim() || null}, match_date=${input.date || null} where id = ${id}`;
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

export async function setClusterStatus(id: string, status: ClusterStatus): Promise<Result> {
  try { await requireAdmin(); await sql`update aoe.clusters set status=${status} where id=${id}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

/**
 * Pin a cluster as the public "current" cluster AND make it live.
 * - The chosen cluster becomes `live`.
 * - Other clusters in the same tournament that were `live` are demoted by date:
 *   match_date today-or-past (or null) → `done`; future → `draft` (chưa diễn ra).
 * - All other clusters keep their status.
 */
export async function setCurrentCluster(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const [c] = await sql<{ tournament_id: string }[]>`select tournament_id from aoe.clusters where id=${id}`;
    if (!c) return fail("Không tìm thấy cụm");
    await sql.begin(async (tx) => {
      // Demote the previously-live cluster(s) in this tournament before promoting the new one.
      await tx`update aoe.clusters
        set status = (case when match_date is null or match_date <= current_date then 'done' else 'draft' end)::aoe.cluster_status
        where tournament_id = ${c.tournament_id} and status = 'live' and id <> ${id}`;
      await tx`update aoe.clusters set status = 'live' where id = ${id}`;
      await tx`insert into aoe.app_settings (key, value, updated_at)
        values ('current_cluster_id', ${sql.json(id as never)}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()`;
    });
    refresh();
    return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

export async function deleteCluster(id: string): Promise<Result> {
  try { await requireAdmin(); await sql`delete from aoe.clusters where id=${id}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

// ---------------- Settings ----------------
export async function setSetting(key: string, value: unknown): Promise<Result> {
  try {
    await requireAdmin();
    await sql`insert into aoe.app_settings (key, value, updated_at) values (${key}, ${sql.json(value as never)}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

// ---------------- Players ----------------
export interface PlayerInput {
  full_name: string; phone: string; aoe_nickname?: string; birth_date?: string;
  citizen_id?: string; address?: string; facebook_url?: string;
}
async function checkCccd(): Promise<boolean> {
  const r = await sql<{ value: unknown }[]>`select value from aoe.app_settings where key='check_duplicate_cccd'`;
  return r[0]?.value === true;
}

export async function addPlayer(clusterId: string, p: PlayerInput): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    if (!p.full_name.trim()) return fail("Họ tên bắt buộc");
    if (!p.phone.trim()) return fail("Số điện thoại bắt buộc");
    if (p.citizen_id?.trim() && (await checkCccd())) {
      const dup = await sql`select 1 from aoe.players where cluster_id=${clusterId} and citizen_id=${p.citizen_id.trim()}`;
      if (dup.length) return fail("CCCD đã tồn tại trong cụm này");
    }
    const [r] = await sql<{ id: string }[]>`insert into aoe.players
      (cluster_id, full_name, phone, aoe_nickname, birth_date, citizen_id, address, facebook_url)
      values (${clusterId}, ${p.full_name.trim()}, ${p.phone.trim()}, ${p.aoe_nickname?.trim() || null},
        ${p.birth_date || null}, ${p.citizen_id?.trim() || null}, ${p.address?.trim() || null}, ${p.facebook_url?.trim() || null})
      returning id`;
    refresh(); return { ok: true, id: r.id };
  } catch (e) { return fail(msg(e)); }
}

export async function importPlayers(clusterId: string, rows: PlayerInput[]): Promise<Result<{ inserted: number; skipped: number }>> {
  try {
    await requireAdmin();
    const check = await checkCccd();
    let inserted = 0, skipped = 0;
    await sql.begin(async (tx) => {
      for (const p of rows) {
        if (!p.full_name?.trim() || !p.phone?.trim()) { skipped++; continue; }
        if (check && p.citizen_id?.trim()) {
          const dup = await tx`select 1 from aoe.players where cluster_id=${clusterId} and citizen_id=${p.citizen_id.trim()}`;
          if (dup.length) { skipped++; continue; }
        }
        await tx`insert into aoe.players (cluster_id, full_name, phone, aoe_nickname, birth_date, citizen_id, address, facebook_url)
          values (${clusterId}, ${p.full_name.trim()}, ${String(p.phone).trim()}, ${p.aoe_nickname?.trim() || null},
            ${p.birth_date || null}, ${p.citizen_id?.toString().trim() || null}, ${p.address?.trim() || null}, ${p.facebook_url?.trim() || null})`;
        inserted++;
      }
    });
    refresh(); return { ok: true, inserted, skipped };
  } catch (e) { return fail(msg(e)); }
}

export async function deletePlayer(id: string): Promise<Result> {
  try { await requireAdmin(); await sql`delete from aoe.players where id=${id}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

// ---------------- Rounds ----------------
export async function addRound(clusterId: string, input: { name: string; round_type: RoundType; config: Record<string, unknown> }): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    const [{ next }] = await sql<{ next: number }[]>`select coalesce(max(order_no),0)+1 as next from aoe.rounds where cluster_id=${clusterId}`;
    const [r] = await sql<{ id: string }[]>`insert into aoe.rounds (cluster_id, order_no, name, round_type, config)
      values (${clusterId}, ${next}, ${input.name.trim()}, ${input.round_type}, ${sql.json(input.config as never)}) returning id`;
    refresh(); return { ok: true, id: r.id };
  } catch (e) { return fail(msg(e)); }
}

export async function updateRound(id: string, input: { name: string; config: Record<string, unknown> }): Promise<Result> {
  try {
    await requireAdmin();
    if (!input.name.trim()) return fail("Tên vòng không được trống");
    await sql`update aoe.rounds set name=${input.name.trim()}, config=${sql.json(input.config as never)} where id=${id}`;
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

export async function deleteRound(id: string): Promise<Result> {
  try { await requireAdmin(); await sql`delete from aoe.rounds where id=${id}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

export async function setRoundStatus(id: string, status: RoundStatus): Promise<Result> {
  try { await requireAdmin(); await sql`update aoe.rounds set status=${status} where id=${id}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

interface SpecRound { order_no?: number; name: string; round_type: RoundType; config?: Record<string, unknown> }
export async function applyTemplate(clusterId: string, templateId: string): Promise<Result<{ created: number }>> {
  try {
    await requireAdmin();
    const [tpl] = await sql<{ spec: { rounds?: SpecRound[] } }[]>`select spec from aoe.format_templates where id=${templateId}`;
    if (!tpl) return fail("Không tìm thấy thể thức");
    const rounds = tpl.spec?.rounds ?? [];
    await sql.begin(async (tx) => {
      await tx`delete from aoe.rounds where cluster_id=${clusterId}`;
      let i = 1;
      for (const r of rounds) {
        await tx`insert into aoe.rounds (cluster_id, order_no, name, round_type, config)
          values (${clusterId}, ${r.order_no ?? i}, ${r.name}, ${r.round_type}, ${sql.json((r.config ?? {}) as never)})`;
        i++;
      }
    });
    refresh(); return { ok: true, created: rounds.length };
  } catch (e) { return fail(msg(e)); }
}

// ---------------- Round participants ----------------
export async function setRoundPlayers(roundId: string, playerIds: string[]): Promise<Result> {
  try {
    await requireAdmin();
    await sql.begin(async (tx) => {
      await tx`delete from aoe.round_participants where round_id=${roundId}`;
      for (const pid of playerIds) {
        await tx`insert into aoe.round_participants (round_id, player_id) values (${roundId}, ${pid})`;
      }
    });
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

// ---------------- Groups ----------------
export async function generateGroups(roundId: string, groups: { name: string; playerIds: string[] }[]): Promise<Result> {
  try {
    await requireAdmin();
    await sql.begin(async (tx) => {
      await tx`delete from aoe.matches where round_id=${roundId} and group_id is not null`;
      await tx`delete from aoe.group_members gm using aoe.groups g where gm.group_id=g.id and g.round_id=${roundId}`;
      await tx`delete from aoe.groups where round_id=${roundId}`;
      const allIds = groups.flatMap((g) => g.playerIds);
      await tx`delete from aoe.round_participants where round_id=${roundId}`;
      for (const pid of allIds) await tx`insert into aoe.round_participants (round_id, player_id) values (${roundId}, ${pid})`;
      for (const g of groups) {
        const [grp] = await tx<{ id: string }[]>`insert into aoe.groups (round_id, name) values (${roundId}, ${g.name}) returning id`;
        for (const pid of g.playerIds) await tx`insert into aoe.group_members (group_id, player_id) values (${grp.id}, ${pid})`;
        let so = 0;
        for (let i = 0; i < g.playerIds.length; i++)
          for (let j = i + 1; j < g.playerIds.length; j++)
            await tx`insert into aoe.matches (round_id, group_id, player1_id, player2_id, sort_order)
              values (${roundId}, ${grp.id}, ${g.playerIds[i]}, ${g.playerIds[j]}, ${so++})`;
      }
    });
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

// ---------------- Pairing (single leg: swiss leg / knockout_multi) ----------------
export interface PairInput { p1: string; p2: string | null; m1?: number | null; m2?: number | null }
export async function commitPairs(roundId: string, legName: string | null, pairs: PairInput[]): Promise<Result> {
  try {
    await requireAdmin();
    await sql.begin(async (tx) => {
      let legId: string | null = null;
      if (legName) {
        const [{ next }] = await tx<{ next: number }[]>`select coalesce(max(leg_no),0)+1 as next from aoe.legs where round_id=${roundId}`;
        const [lg] = await tx<{ id: string }[]>`insert into aoe.legs (round_id, leg_no, name) values (${roundId}, ${next}, ${legName}) returning id`;
        legId = lg.id;
      }
      let so = 0;
      for (const p of pairs) {
        const bye = p.p2 === null;
        await tx`insert into aoe.matches (round_id, leg_id, player1_id, player2_id, player1_machine, player2_machine, is_bye, status, winner_id, sort_order)
          values (${roundId}, ${legId}, ${p.p1}, ${p.p2}, ${p.m1 ?? null}, ${p.m2 ?? null}, ${bye}, ${bye ? "done" : "pending"}, ${bye ? p.p1 : null}, ${so++})`;
      }
    });
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

// ---------------- Bracket (knockout_single) ----------------
import { bracketLegNames, isPowerOfTwo, effectiveBestOf } from "./pairing";
export async function generateBracket(roundId: string, orderedPlayerIds: string[], machines: (number | null)[], thirdPlace: boolean): Promise<Result> {
  try {
    await requireAdmin();
    const n = orderedPlayerIds.length;
    if (!isPowerOfTwo(n) || n < 2) return fail("Số game thủ phải là lũy thừa của 2 (2,4,8,16…)");
    const names = bracketLegNames(n); // e.g. ["Tứ kết","Bán kết","Chung kết"]
    await sql.begin(async (tx) => {
      await tx`delete from aoe.matches where round_id=${roundId}`;
      await tx`delete from aoe.legs where round_id=${roundId}`;
      await tx`delete from aoe.round_participants where round_id=${roundId}`;
      for (const pid of orderedPlayerIds) await tx`insert into aoe.round_participants (round_id, player_id) values (${roundId}, ${pid})`;

      // create legs
      const legIds: string[] = [];
      for (let i = 0; i < names.length; i++) {
        const [lg] = await tx<{ id: string }[]>`insert into aoe.legs (round_id, leg_no, name) values (${roundId}, ${i + 1}, ${names[i]}) returning id`;
        legIds.push(lg.id);
      }
      let thirdId: string | null = null;
      if (thirdPlace && names.length >= 2) {
        const [lg] = await tx<{ id: string }[]>`insert into aoe.legs (round_id, leg_no, name) values (${roundId}, ${names.length + 1}, 'Tranh 3–4') returning id`;
        const [m] = await tx<{ id: string }[]>`insert into aoe.matches (round_id, leg_id, sort_order) values (${roundId}, ${lg.id}, 0) returning id`;
        thirdId = m.id;
      }

      // build matches from final back to first round so next links resolve
      // level sizes: n/2 matches in round0 ... 1 match in final
      const levels: string[][] = []; // matchIds per level
      let matchesInLevel = n / 2;
      for (let lvl = 0; lvl < names.length; lvl++) {
        const ids: string[] = [];
        for (let k = 0; k < matchesInLevel; k++) {
          const [m] = await tx<{ id: string }[]>`insert into aoe.matches (round_id, leg_id, sort_order) values (${roundId}, ${legIds[lvl]}, ${k}) returning id`;
          ids.push(m.id);
        }
        levels.push(ids);
        matchesInLevel /= 2;
      }
      // link winners upward; semifinal losers -> third place
      for (let lvl = 0; lvl < levels.length - 1; lvl++) {
        const cur = levels[lvl], nxt = levels[lvl + 1];
        for (let k = 0; k < cur.length; k++) {
          const target = nxt[Math.floor(k / 2)];
          const slot = (k % 2) + 1;
          const isSemifinal = lvl === levels.length - 2;
          await tx`update aoe.matches set next_match_id=${target}, next_match_slot=${slot},
            loser_next_match_id=${isSemifinal && thirdId ? thirdId : null} where id=${cur[k]}`;
        }
      }
      // seed round 0 players (standard 1 vs last pairing order as provided)
      const first = levels[0];
      for (let k = 0; k < first.length; k++) {
        const a = orderedPlayerIds[2 * k], b = orderedPlayerIds[2 * k + 1];
        await tx`update aoe.matches set player1_id=${a}, player2_id=${b}, player1_machine=${machines[2 * k] ?? null}, player2_machine=${machines[2 * k + 1] ?? null} where id=${first[k]}`;
      }
    });
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

// ---------------- Results ----------------
async function setSlot(tx: TransactionSql<Record<string, never>>, matchId: string, slot: number, playerId: string | null, machine: number | null) {
  if (slot === 1) await tx`update aoe.matches set player1_id=${playerId}, player1_machine=${machine} where id=${matchId}`;
  else await tx`update aoe.matches set player2_id=${playerId}, player2_machine=${machine} where id=${matchId}`;
}

export async function updateResult(matchId: string, s1: number, s2: number, status: MatchStatus): Promise<Result> {
  try {
    await requireAdmin();
    await sql.begin(async (tx) => {
      const [m] = await tx<{ player1_id: string | null; player2_id: string | null; next_match_id: string | null; next_match_slot: number | null; loser_next_match_id: string | null; round_config: Record<string, unknown> | null; leg_name: string | null }[]>`
        select m.player1_id, m.player2_id, m.next_match_id, m.next_match_slot, m.loser_next_match_id, r.config as round_config, l.name as leg_name
        from aoe.matches m join aoe.rounds r on r.id = m.round_id
        left join aoe.legs l on l.id = m.leg_id where m.id=${matchId}`;
      if (!m) throw new Error("Không tìm thấy cặp đấu");
      // Server-side enforcement for capped formats (best_of), resolved per-round
      // (e.g. Chung kết chạm 5 while earlier rounds chạm 3):
      //  - reaching the cap finishes the match (done + winner);
      //  - dropping below the cap un-finishes it — e.g. editing 2–0 back to 1–0
      //    reverts the match to "live"/"pending" so that win is no longer counted.
      const bestOf = effectiveBestOf(m.round_config, m.leg_name);
      let finalStatus: MatchStatus = status;
      if (bestOf > 0) {
        if (s1 >= bestOf || s2 >= bestOf) finalStatus = "done";
        else if (status === "done") finalStatus = s1 > 0 || s2 > 0 ? "live" : "pending";
      }
      let winner: string | null = null;
      if (finalStatus === "done") winner = s1 > s2 ? m.player1_id : s2 > s1 ? m.player2_id : null;
      await tx`update aoe.matches set player1_score=${s1}, player2_score=${s2}, status=${finalStatus}, winner_id=${winner} where id=${matchId}`;
      if (finalStatus === "done" && winner) {
        const loser = winner === m.player1_id ? m.player2_id : m.player1_id;
        if (m.next_match_id && m.next_match_slot) await setSlot(tx, m.next_match_id, m.next_match_slot, winner, null);
        if (m.loser_next_match_id && m.next_match_slot) await setSlot(tx, m.loser_next_match_id, m.next_match_slot, loser, null);
      } else if (m.next_match_slot) {
        // Reverted to not-finished: pull this match's player back out of the
        // downstream slot(s) it had fed (knockout), so the bracket stays correct.
        if (m.next_match_id) await setSlot(tx, m.next_match_id, m.next_match_slot, null, null);
        if (m.loser_next_match_id) await setSlot(tx, m.loser_next_match_id, m.next_match_slot, null, null);
      }
    });
    refresh(); return { ok: true };
  } catch (e) { return fail(msg(e)); }
}

export async function setMatchMachines(matchId: string, m1: number | null, m2: number | null): Promise<Result> {
  try { await requireAdmin(); await sql`update aoe.matches set player1_machine=${m1}, player2_machine=${m2} where id=${matchId}`; refresh(); return { ok: true }; }
  catch (e) { return fail(msg(e)); }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Có lỗi xảy ra";
}
