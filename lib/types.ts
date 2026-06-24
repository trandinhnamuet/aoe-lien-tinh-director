// Shared types (DB row shapes + public view-model snapshot)

export type ClusterStatus = "draft" | "live" | "done";
export type RoundType = "group" | "swiss" | "knockout_multi" | "knockout_single";
export type RoundStatus = "pending" | "live" | "done";
export type MatchStatus = "pending" | "live" | "done";
export type ParticipantOutcome = "pending" | "advanced" | "eliminated";

export interface Tournament {
  id: string;
  name: string;
  year: number;
  organizer: string | null;
}

export interface Cluster {
  id: string;
  tournament_id: string;
  name: string;
  location: string | null;
  match_date: string | null;
  status: ClusterStatus;
  sort_order: number;
}

export interface Player {
  id: string;
  cluster_id: string;
  full_name: string;
  phone: string;
  aoe_nickname: string | null;
  birth_date: string | null;
  citizen_id: string | null;
  address: string | null;
  facebook_url: string | null;
}

export interface Round {
  id: string;
  cluster_id: string;
  order_no: number;
  name: string;
  round_type: RoundType;
  config: Record<string, unknown>;
  status: RoundStatus;
}

export interface MatchRow {
  id: string;
  round_id: string;
  leg_id: string | null;
  group_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_machine: number | null;
  player2_machine: number | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  is_bye: boolean;
  status: MatchStatus;
  next_match_id: string | null;
  next_match_slot: number | null;
  loser_next_match_id: string | null;
  sort_order: number;
}

// ---------- Public snapshot view-models ----------

export interface MatchCardVM {
  id: string;
  aName: string;       // full_name — primary display
  aNick: string;       // coalesce(nickname, full_name) — shown below if ≠ aName
  aMachine: number | null;
  aScore: number | null;
  bName: string;
  bNick: string;
  bMachine: number | null;
  bScore: number | null;
  status: MatchStatus;
  winner: "a" | "b" | "";
  advanceA: boolean;
  advanceB: boolean;
}

export interface GroupStandingRow {
  playerId: string;
  rank: number;
  fullName: string;    // primary display
  nick: string;        // secondary if ≠ fullName
  machine: number | null;
  win: number;
  loss: number;
  draw: number;
  diff: number;
  advance: boolean;
}

export interface CompactRowVM {
  aName: string;
  aNick: string;
  bName: string;
  bNick: string;
  score: string;
  aWin: boolean;
  bWin: boolean;
  live: boolean;
  done: boolean;
}

export interface GroupVM {
  key: string;
  rows: GroupStandingRow[];
  matches: CompactRowVM[];
  showDraw: boolean; // only when best_of is even (draws are possible)
}

export interface SwissMatchVM {
  id: string;
  aName: string;
  aNick: string;
  aMachine: number | null;
  aRec: string;
  bName: string;
  bNick: string;
  bMachine: number | null;
  bRec: string;
  score: string;
  status: MatchStatus;
  winner: "a" | "b" | "";
}

export interface SwissLegVM {
  name: string;
  matches: SwissMatchVM[];
}

export interface BracketNodeVM {
  id: string | null;
  aName: string | null;
  aNick: string | null;
  aMachine: number | null;
  aScore: number | null;
  bName: string | null;
  bNick: string | null;
  bMachine: number | null;
  bScore: number | null;
  status: MatchStatus;
  winner: "a" | "b" | "";
}

export interface BracketColumnVM {
  name: string;
  nodes: BracketNodeVM[];
}

export type RoundSnapshot =
  | { id: string; name: string; type: "group"; configText: string; groups: GroupVM[] }
  | {
      id: string;
      name: string;
      type: "swiss";
      configText: string;
      legs: SwissLegVM[];
      advanced: string[];
      eliminated: string[];
    }
  | {
      id: string;
      name: string;
      type: "knockout_single" | "knockout_multi";
      configText: string;
      columns: BracketColumnVM[];
      champion: string | null;
    };

export interface ClusterOption {
  id: string;
  name: string;
  location: string | null;
  date: string | null;
  status: ClusterStatus;
}

export interface ClusterSnapshot {
  tournament: { id: string; name: string; year: number };
  cluster: { id: string; name: string; location: string | null; date: string | null; status: ClusterStatus };
  currentRound: { id: string; name: string; configText: string } | null;
  dashboardCards: MatchCardVM[];
  rounds: RoundSnapshot[];
  clusterOptions: ClusterOption[];
}
