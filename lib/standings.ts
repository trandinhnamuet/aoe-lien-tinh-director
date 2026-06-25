// Pure standings/record computations — recomputed from match results
// (the source of truth) so live score updates immediately reflect.

export interface MiniMatch {
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  status: string;
  duration_seconds?: number | null;
  game_durations?: { p1?: (number | null)[]; p2?: (number | null)[] } | null;
}

export interface GroupRow {
  pid: string;
  win: number;
  loss: number;
  draw: number;
  points: number;  // win × 3 (+ draw × 1; "chạm" format has no draws)
  diff: number;    // hệ số: games/rounds won − lost (toàn bảng)
  timeSec: number; // total time of GAMES WON by the player (final tiebreaker)
  rank: number;
  advance: boolean;
}

/**
 * Round-robin standings for one group. Ranking criteria, in order:
 *   1. points (điểm)
 *   2. diff — overall game/round difference (hệ số)
 *   3. head-to-head wins among the still-tied players (đối đầu)
 *   4. head-to-head game difference among those players (hiệu số nội bộ)
 *   5. total match time, ascending — less time ranks higher (thời gian, nếu có)
 */
export function groupStandings(
  playerIds: string[],
  matches: MiniMatch[],
  advancePerGroup = 2
): GroupRow[] {
  const rows: Record<string, GroupRow> = {};
  for (const pid of playerIds) rows[pid] = { pid, win: 0, loss: 0, draw: 0, points: 0, diff: 0, timeSec: 0, rank: 0, advance: false };
  const done = matches.filter((m) => m.status === "done" && m.player1_id && m.player2_id);
  for (const m of done) {
    const a = rows[m.player1_id!], b = rows[m.player2_id!];
    if (!a || !b) continue;
    a.diff += m.player1_score - m.player2_score;
    b.diff += m.player2_score - m.player1_score;
    // Tiebreaker time = sum of the durations of games each player WON.
    const sum = (xs?: (number | null)[]) => (xs ?? []).reduce<number>((n, x) => n + (x ?? 0), 0);
    a.timeSec += sum(m.game_durations?.p1);
    b.timeSec += sum(m.game_durations?.p2);
    if (m.winner_id === m.player1_id) { a.win++; b.loss++; }
    else if (m.winner_id === m.player2_id) { b.win++; a.loss++; }
    else { a.draw++; b.draw++; } // "done" with no winner = draw (shouldn't happen in chạm)
  }
  for (const r of Object.values(rows)) r.points = r.win * 3 + r.draw;

  // Head-to-head, restricted to matches between members of a tied subset.
  const h2hWins = (pid: string, g: Set<string>) =>
    done.reduce((n, m) => (g.has(m.player1_id!) && g.has(m.player2_id!) && m.winner_id === pid ? n + 1 : n), 0);
  const h2hDiff = (pid: string, g: Set<string>) =>
    done.reduce((n, m) => {
      if (!g.has(m.player1_id!) || !g.has(m.player2_id!)) return n;
      if (m.player1_id === pid) return n + (m.player1_score - m.player2_score);
      if (m.player2_id === pid) return n + (m.player2_score - m.player1_score);
      return n;
    }, 0);
  // Less time ranks higher; players with no time recorded sort last among ties.
  const timeKey = (r: GroupRow) => (r.timeSec > 0 ? r.timeSec : Number.POSITIVE_INFINITY);

  // Primary: points desc, then overall diff desc.
  const arr = Object.values(rows).sort((x, y) => y.points - x.points || y.diff - x.diff);
  // Break runs equal on (points, diff): head-to-head wins → head-to-head diff → time.
  for (let i = 0; i < arr.length; ) {
    let j = i + 1;
    while (j < arr.length && arr[j].points === arr[i].points && arr[j].diff === arr[i].diff) j++;
    if (j - i > 1) {
      const g = new Set(arr.slice(i, j).map((r) => r.pid));
      const sub = arr.slice(i, j).sort((x, y) =>
        h2hWins(y.pid, g) - h2hWins(x.pid, g) ||
        h2hDiff(y.pid, g) - h2hDiff(x.pid, g) ||
        timeKey(x) - timeKey(y)
      );
      for (let k = 0; k < sub.length; k++) arr[i + k] = sub[k];
    }
    i = j;
  }
  arr.forEach((r, i) => { r.rank = i + 1; r.advance = i < advancePerGroup; });
  return arr;
}

export interface SwissRow {
  pid: string;
  win: number;
  loss: number;
  advanced: boolean;
  eliminated: boolean;
}

/** Swiss record across all legs. winsToAdvance defaults to 2. */
export function swissStanding(
  playerIds: string[],
  matches: MiniMatch[],
  winsToAdvance = 2
): Map<string, SwissRow> {
  const st = new Map<string, SwissRow>();
  for (const pid of playerIds) st.set(pid, { pid, win: 0, loss: 0, advanced: false, eliminated: false });
  for (const m of matches) {
    if (m.status !== "done" || !m.player1_id || !m.player2_id) continue;
    const a = st.get(m.player1_id), b = st.get(m.player2_id);
    if (!a || !b) continue;
    if (m.winner_id === m.player1_id) { a.win++; b.loss++; }
    else if (m.winner_id === m.player2_id) { b.win++; a.loss++; }
  }
  for (const r of st.values()) {
    r.advanced = r.win >= winsToAdvance;
    r.eliminated = r.loss >= winsToAdvance;
  }
  return st;
}
