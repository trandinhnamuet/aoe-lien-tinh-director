// Pure standings/record computations — recomputed from match results
// (the source of truth) so live score updates immediately reflect.

export interface MiniMatch {
  player1_id: string | null;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  status: string;
}

export interface GroupRow {
  pid: string;
  win: number;
  loss: number;
  draw: number;
  diff: number;
  rank: number;
  advance: boolean;
}

/** Round-robin standings for one group. advancePerGroup defaults to 2. */
export function groupStandings(
  playerIds: string[],
  matches: MiniMatch[],
  advancePerGroup = 2
): GroupRow[] {
  const rows: Record<string, GroupRow> = {};
  for (const pid of playerIds) rows[pid] = { pid, win: 0, loss: 0, draw: 0, diff: 0, rank: 0, advance: false };
  for (const m of matches) {
    if (m.status !== "done" || !m.player1_id || !m.player2_id) continue;
    const a = rows[m.player1_id], b = rows[m.player2_id];
    if (!a || !b) continue;
    a.diff += m.player1_score - m.player2_score;
    b.diff += m.player2_score - m.player1_score;
    if (m.winner_id === m.player1_id) { a.win++; b.loss++; }
    else if (m.winner_id === m.player2_id) { b.win++; a.loss++; }
    else { a.draw++; b.draw++; } // done with no winner = draw
  }
  // Rank by wins, then head-to-head goal/game difference. Draws break no ties here.
  const arr = Object.values(rows).sort((x, y) => y.win - x.win || y.diff - x.diff);
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
