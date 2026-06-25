import "server-only";
import { cookies } from "next/headers";
import { sql } from "./db";
import type { Cluster, Player, Round, ClusterStatus, RoundType, MatchStatus } from "./types";

export interface Settings {
  check_duplicate_cccd: boolean;
  current_tournament_id: string | null;
  current_cluster_id: string | null;
}

export async function getSettings(): Promise<Settings> {
  const rows = await sql<{ key: string; value: unknown }[]>`select key, value from aoe.app_settings`;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    check_duplicate_cccd: map.get("check_duplicate_cccd") === true,
    current_tournament_id: (map.get("current_tournament_id") as string) ?? null,
    current_cluster_id: (map.get("current_cluster_id") as string) ?? null,
  };
}

export interface TournamentWithCount {
  id: string; name: string; year: number; organizer: string | null; cluster_count: number;
}
export async function listTournaments(): Promise<TournamentWithCount[]> {
  return sql<TournamentWithCount[]>`
    select t.id, t.name, t.year, t.organizer, count(c.id)::int as cluster_count
    from aoe.tournaments t left join aoe.clusters c on c.tournament_id = t.id
    group by t.id order by t.year desc, t.name`;
}

export interface ClusterWithMeta extends Cluster {
  tournament_name: string; player_count: number; round_count: number; date_fmt: string | null;
}
export async function listClusters(tournamentId?: string): Promise<ClusterWithMeta[]> {
  const rows = await sql<ClusterWithMeta[]>`
    select c.*, t.name as tournament_name, to_char(c.match_date,'DD.MM.YYYY') as date_fmt,
      (select count(*)::int from aoe.players p where p.cluster_id = c.id) as player_count,
      (select count(*)::int from aoe.rounds r where r.cluster_id = c.id) as round_count
    from aoe.clusters c join aoe.tournaments t on t.id = c.tournament_id
    ${tournamentId ? sql`where c.tournament_id = ${tournamentId}` : sql``}
    order by t.year desc, c.sort_order, c.match_date`;
  return rows;
}

export async function getCluster(id: string): Promise<ClusterWithMeta | null> {
  const rows = await sql<ClusterWithMeta[]>`
    select c.*, t.name as tournament_name, to_char(c.match_date,'YYYY-MM-DD') as date_fmt,
      (select count(*)::int from aoe.players p where p.cluster_id = c.id) as player_count,
      (select count(*)::int from aoe.rounds r where r.cluster_id = c.id) as round_count
    from aoe.clusters c join aoe.tournaments t on t.id = c.tournament_id where c.id = ${id}`;
  return rows[0] ?? null;
}

export async function listPlayers(clusterId: string): Promise<Player[]> {
  return sql<Player[]>`select * from aoe.players where cluster_id = ${clusterId} order by full_name`;
}

export async function listRounds(clusterId: string): Promise<Round[]> {
  return sql<Round[]>`select id, cluster_id, order_no, name, round_type, config, status
    from aoe.rounds where cluster_id = ${clusterId} order by order_no`;
}

export interface FormatTemplate { id: string; name: string; description: string | null; spec: { rounds?: unknown[] } }
export async function listFormatTemplates(): Promise<FormatTemplate[]> {
  return sql<FormatTemplate[]>`select id, name, description, spec from aoe.format_templates order by name`;
}

export interface AdminMatch {
  id: string; round_id: string; leg_id: string | null; group_id: string | null;
  player1_id: string | null; player2_id: string | null;
  player1_machine: number | null; player2_machine: number | null;
  player1_score: number; player2_score: number; status: MatchStatus; is_bye: boolean; sort_order: number; duration_seconds: number | null;
  game_durations: { p1?: (number | null)[]; p2?: (number | null)[] } | null;
  an: string | null;
  an_full: string | null;
  bn: string | null;
  bn_full: string | null;
  round_name: string; round_type: RoundType; order_no: number;
  round_config: Record<string, unknown>;
  leg_name: string | null; group_name: string | null;
}
export async function listClusterMatches(clusterId: string): Promise<AdminMatch[]> {
  return sql<AdminMatch[]>`
    select m.id, m.round_id, m.leg_id, m.group_id, m.player1_id, m.player2_id,
      m.player1_machine, m.player2_machine, m.player1_score, m.player2_score, m.status, m.is_bye, m.sort_order, m.duration_seconds, m.game_durations,
      coalesce(pa.aoe_nickname, pa.full_name) as an, pa.full_name as an_full,
      coalesce(pb.aoe_nickname, pb.full_name) as bn, pb.full_name as bn_full,
      r.name as round_name, r.round_type, r.order_no, r.config as round_config, l.name as leg_name, g.name as group_name
    from aoe.matches m
    join aoe.rounds r on r.id = m.round_id
    left join aoe.legs l on l.id = m.leg_id
    left join aoe.groups g on g.id = m.group_id
    left join aoe.players pa on pa.id = m.player1_id
    left join aoe.players pb on pb.id = m.player2_id
    where r.cluster_id = ${clusterId}
    order by r.order_no, l.leg_no nulls first, g.name nulls first, m.sort_order`;
}

export interface RoundParticipant {
  player_id: string; nick: string; outcome: string; wins: number; losses: number;
}
export async function listRoundParticipants(roundId: string): Promise<RoundParticipant[]> {
  return sql<RoundParticipant[]>`
    select rp.player_id, coalesce(p.aoe_nickname, p.full_name) as nick, rp.outcome, rp.wins, rp.losses
    from aoe.round_participants rp join aoe.players p on p.id = rp.player_id
    where rp.round_id = ${roundId} order by p.full_name`;
}

export async function getRound(roundId: string): Promise<Round | null> {
  const rows = await sql<Round[]>`select id, cluster_id, order_no, name, round_type, config, status
    from aoe.rounds where id = ${roundId}`;
  return rows[0] ?? null;
}

/** Resolve the tournament+cluster scope for admin pages.
 *  Priority: URL params → `aoe_scope` cookie (last picked) → app settings → first available.
 *  The cookie makes the picked cluster persist across all admin screens. */
export async function resolveScope(sp: { tournament?: string; cluster?: string }) {
  const [tournaments, settings, jar] = await Promise.all([listTournaments(), getSettings(), cookies()]);
  const [ckTour, ckCluster] = (jar.get("aoe_scope")?.value ?? "").split("|");

  const tournamentId =
    sp.tournament ??
    (ckTour && tournaments.some((t) => t.id === ckTour) ? ckTour : undefined) ??
    settings.current_tournament_id ?? tournaments[0]?.id ?? null;
  const clusters = tournamentId ? await listClusters(tournamentId) : [];

  let clusterId = sp.cluster && clusters.some((c) => c.id === sp.cluster) ? sp.cluster : undefined;
  // Only honour the cookie cluster when the tournament wasn't explicitly switched via URL.
  if (!clusterId && !sp.tournament && ckCluster && clusters.some((c) => c.id === ckCluster)) clusterId = ckCluster;
  if (!clusterId) {
    if (settings.current_cluster_id && clusters.some((c) => c.id === settings.current_cluster_id)) clusterId = settings.current_cluster_id;
    else clusterId = clusters[0]?.id;
  }
  return { tournaments, settings, tournamentId, clusters, clusterId: clusterId ?? null };
}

export async function adminOverview() {
  const [s] = await Promise.all([getSettings()]);
  const cluster = s.current_cluster_id ? await getCluster(s.current_cluster_id) : null;
  const tournaments = await listTournaments();
  let counts = { players: 0, alive: 0, eliminated: 0, matchesDone: 0, matchesTotal: 0 };
  if (cluster) {
    const [c] = await sql<{ players: number; mdone: number; mtotal: number }[]>`
      select (select count(*)::int from aoe.players p where p.cluster_id = ${cluster.id}) as players,
             (select count(*)::int from aoe.matches m join aoe.rounds r on r.id=m.round_id where r.cluster_id=${cluster.id} and m.status='done') as mdone,
             (select count(*)::int from aoe.matches m join aoe.rounds r on r.id=m.round_id where r.cluster_id=${cluster.id}) as mtotal`;
    counts = { players: c.players, alive: 0, eliminated: 0, matchesDone: c.mdone, matchesTotal: c.mtotal };
  }
  return { settings: s, cluster, tournaments, counts };
}
