// Pure pairing / group-split / bracket helpers (no DB, no React).

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random 1v1 pairs from a player list. Odd count -> last player gets a bye (b=null). */
export function randomPairs(playerIds: string[]): [string, string | null][] {
  const s = shuffle(playerIds);
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < s.length; i += 2) {
    pairs.push([s[i], i + 1 < s.length ? s[i + 1] : null]);
  }
  return pairs;
}

export interface SwissPlayerRec { id: string; win: number; loss: number; }

/**
 * Swiss pairing for leg 2+: pair players who share the same win–loss record
 * (cùng thành tích / hiệu số) against each other. Best-effort rematch
 * avoidance using `played` (a set of "idA|idB" keys, ids sorted). An odd
 * player in a record group floats down to the next (lower) group; a final
 * leftover gets a bye (b = null). Pass only ACTIVE players (not yet
 * advanced/eliminated).
 */
export function swissPairsByRecord(players: SwissPlayerRec[], played: Set<string>): [string, string | null][] {
  const key = (a: string, b: string) => [a, b].sort().join("|");
  const groups = new Map<string, string[]>();
  for (const p of players) {
    const k = `${p.win}-${p.loss}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p.id);
  }
  // Higher wins first, then fewer losses — strongest records pair at the top.
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    const [aw, al] = a.split("-").map(Number);
    const [bw, bl] = b.split("-").map(Number);
    return bw - aw || al - bl;
  });

  const pairs: [string, string | null][] = [];
  let carry: string[] = []; // floated down from the previous (higher) group
  for (const k of orderedKeys) {
    const pool = shuffle([...carry, ...groups.get(k)!]);
    carry = [];
    const used = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      if (used.has(pool[i])) continue;
      let partner = -1;
      // prefer a partner not already played
      for (let j = i + 1; j < pool.length; j++) {
        if (used.has(pool[j])) continue;
        if (!played.has(key(pool[i], pool[j]))) { partner = j; break; }
      }
      // fallback: allow a rematch rather than leave them unpaired
      if (partner === -1) {
        for (let j = i + 1; j < pool.length; j++) { if (!used.has(pool[j])) { partner = j; break; } }
      }
      if (partner === -1) { carry.push(pool[i]); used.add(pool[i]); }
      else { pairs.push([pool[i], pool[partner]]); used.add(pool[i]); used.add(pool[partner]); }
    }
  }
  // leftovers that never found a group below → pair among themselves, last gets a bye
  const left = shuffle(carry);
  for (let i = 0; i < left.length; i += 2) pairs.push([left[i], i + 1 < left.length ? left[i + 1] : null]);
  return pairs;
}

export interface GroupSplitOption {
  groups: number;
  sizes: number[]; // length === groups
  label: string;
}

/** Group-split options: number of groups must be a power of two, each group 3..6 players. */
export function groupSplitOptions(n: number): GroupSplitOption[] {
  const options: GroupSplitOption[] = [];
  for (let g = 1; g <= 64; g *= 2) {
    if (n < 3 * g || n > 6 * g) continue;
    const base = Math.floor(n / g);
    const rem = n - base * g;
    const sizes: number[] = [];
    for (let i = 0; i < g; i++) sizes.push(base + (i < rem ? 1 : 0));
    if (sizes.some((s) => s < 3 || s > 6)) continue;
    const counts: Record<number, number> = {};
    for (const s of sizes) counts[s] = (counts[s] ?? 0) + 1;
    const label = `${g} bảng · ` + Object.entries(counts).sort((a, b) => +b[0] - +a[0]).map(([size, c]) => `${c}×${size} người`).join(", ");
    options.push({ groups: g, sizes, label });
  }
  return options;
}

/** Distribute players into G groups of the given sizes (randomized). */
export function splitIntoGroups(playerIds: string[], sizes: number[]): string[][] {
  const s = shuffle(playerIds);
  const groups: string[][] = [];
  let idx = 0;
  for (const size of sizes) {
    groups.push(s.slice(idx, idx + size));
    idx += size;
  }
  return groups;
}

/** All round-robin pairings (index pairs) for a group of size n. */
export function roundRobinPairs(n: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  return pairs;
}

export function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}

export const KO_ROUND_NAMES: Record<number, string> = {
  2: "Chung kết",
  4: "Bán kết",
  8: "Tứ kết",
  16: "Vòng 1/8",
  32: "Vòng 1/16",
  64: "Vòng 1/32",
};

/** Standard knockout round labels, biggest stage first — for per-round config UI. */
export const KO_ROUND_LABELS = ["Chung kết", "Bán kết", "Tứ kết", "Vòng 1/8", "Vòng 1/16", "Vòng 1/32"];

/**
 * Effective "first to N" (best_of / số chạm) for a match, given its round config
 * and leg name. Priority: per-round override (config.best_of_by_round[legName])
 * → legacy final_best_of for the final → the default config.best_of.
 */
export function effectiveBestOf(config: Record<string, unknown> | null | undefined, legName: string | null | undefined): number {
  if (!config) return 0;
  const byRound = config.best_of_by_round as Record<string, number> | undefined;
  if (legName && byRound && typeof byRound[legName] === "number" && byRound[legName] > 0) return byRound[legName];
  if (legName && /chung kết/i.test(legName) && typeof config.final_best_of === "number" && (config.final_best_of as number) > 0) {
    return config.final_best_of as number;
  }
  return typeof config.best_of === "number" ? (config.best_of as number) : 0;
}

/** Names for each bracket depth given the first-round player count (power of two). */
export function bracketLegNames(playerCount: number): string[] {
  const names: string[] = [];
  let size = playerCount;
  while (size >= 2) {
    names.push(KO_ROUND_NAMES[size] ?? `Vòng ${playerCount / size + 1}`);
    size /= 2;
  }
  return names; // e.g. 8 -> ["Tứ kết","Bán kết","Chung kết"]
}
