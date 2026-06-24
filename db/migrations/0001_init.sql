-- ============================================================
-- AoE Liên Tỉnh Director — schema migration (initial)
-- Isolated in schema "aoe" so it never collides with other
-- projects living in the shared Supabase "public" schema.
-- Enum values intentionally match the approved design code
-- ('live' / 'done' / 'pending') to avoid mapping bugs.
-- ============================================================

drop schema if exists aoe cascade;
create schema aoe;
set search_path = aoe, public;

-- ---------- Enums ----------
create type aoe.cluster_status      as enum ('draft', 'live', 'done');
create type aoe.round_type          as enum ('group', 'swiss', 'knockout_multi', 'knockout_single');
create type aoe.round_status        as enum ('pending', 'live', 'done');
create type aoe.participant_outcome as enum ('pending', 'advanced', 'eliminated');
create type aoe.match_status        as enum ('pending', 'live', 'done');

-- ---------- Tournaments ----------
create table aoe.tournaments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  year       int  not null,
  organizer  text,
  created_at timestamptz not null default now()
);

-- ---------- Clusters ----------
create table aoe.clusters (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references aoe.tournaments(id) on delete cascade,
  name          text not null,
  location      text,
  match_date    date,
  status        aoe.cluster_status not null default 'draft',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index clusters_tournament_idx on aoe.clusters(tournament_id);
create index clusters_tournament_status_idx on aoe.clusters(tournament_id, status);

-- ---------- Players ----------
create table aoe.players (
  id           uuid primary key default gen_random_uuid(),
  cluster_id   uuid not null references aoe.clusters(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  aoe_nickname text,
  birth_date   date,
  citizen_id   text,
  address      text,
  facebook_url text,
  created_at   timestamptz not null default now()
);
create index players_cluster_idx on aoe.players(cluster_id);

-- ---------- Rounds ----------
create table aoe.rounds (
  id         uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references aoe.clusters(id) on delete cascade,
  order_no   int  not null,
  name       text not null,
  round_type aoe.round_type not null,
  config     jsonb not null default '{}',
  status     aoe.round_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (cluster_id, order_no)
);
create index rounds_cluster_idx on aoe.rounds(cluster_id);

-- ---------- Round participants (input + outcome) ----------
create table aoe.round_participants (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references aoe.rounds(id) on delete cascade,
  player_id  uuid not null references aoe.players(id) on delete cascade,
  outcome    aoe.participant_outcome not null default 'pending',
  wins       int not null default 0,
  losses     int not null default 0,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);
create index rp_round_idx on aoe.round_participants(round_id);

-- ---------- Groups (round_type = group) ----------
create table aoe.groups (
  id       uuid primary key default gen_random_uuid(),
  round_id uuid not null references aoe.rounds(id) on delete cascade,
  name     text not null
);
create index groups_round_idx on aoe.groups(round_id);

create table aoe.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references aoe.groups(id) on delete cascade,
  player_id  uuid not null references aoe.players(id) on delete cascade,
  wins       int not null default 0,
  score_diff int not null default 0,
  rank       int,
  unique (group_id, player_id)
);
create index gm_group_idx on aoe.group_members(group_id);

-- ---------- Legs (lượt đấu inside a round) ----------
create table aoe.legs (
  id       uuid primary key default gen_random_uuid(),
  round_id uuid not null references aoe.rounds(id) on delete cascade,
  leg_no   int  not null,
  name     text not null,
  unique (round_id, leg_no)
);
create index legs_round_idx on aoe.legs(round_id);

-- ---------- Matches (cặp đấu) ----------
create table aoe.matches (
  id                  uuid primary key default gen_random_uuid(),
  round_id            uuid not null references aoe.rounds(id) on delete cascade,
  leg_id              uuid references aoe.legs(id) on delete set null,
  group_id            uuid references aoe.groups(id) on delete set null,
  player1_id          uuid references aoe.players(id) on delete set null,
  player2_id          uuid references aoe.players(id) on delete set null,
  player1_machine     int,
  player2_machine     int,
  player1_score       int not null default 0,
  player2_score       int not null default 0,
  winner_id           uuid references aoe.players(id) on delete set null,
  is_bye              boolean not null default false,
  status              aoe.match_status not null default 'pending',
  next_match_id       uuid references aoe.matches(id) on delete set null,
  next_match_slot     int,
  loser_next_match_id uuid references aoe.matches(id) on delete set null,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);
create index matches_round_idx on aoe.matches(round_id);
create index matches_group_idx on aoe.matches(group_id);
create index matches_leg_idx on aoe.matches(leg_id);

-- ---------- Format templates ----------
create table aoe.format_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  spec        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------- App settings (key/value) ----------
create table aoe.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
