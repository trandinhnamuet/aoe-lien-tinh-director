-- Per-game (ván) durations for a group match, so the time tiebreaker can use
-- "total time of games WON" per player. Shape: { "p1": number[], "p2": number[] }
-- (seconds per won game; p1 length = player1_score, p2 length = player2_score).
alter table aoe.matches add column if not exists game_durations jsonb;
