-- Per-match duration (seconds), used as the final group-standings tiebreaker
-- (after points → diff → head-to-head → head-to-head game diff). Idempotent.
alter table aoe.matches add column if not exists duration_seconds int;
