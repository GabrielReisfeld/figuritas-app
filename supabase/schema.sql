-- ─────────────────────────────────────────────────────────────────────────────
-- Figuritas – World Cup Sticker Album Tracker
-- Supabase / Postgres schema
-- Run this in the Supabase SQL editor to bootstrap your project
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "pgcrypto";

-- Enum
do $$ begin
  create type sticker_category as enum (
    'team', 'player', 'badge', 'stadium', 'special', 'gold', 'other'
  );
exception
  when duplicate_object then null;
end $$;

-- ─── albums ───────────────────────────────────────────────────────────────────

create table if not exists albums (
  id              uuid primary key default gen_random_uuid(),
  year            integer not null unique,
  name            text    not null,
  total_stickers  integer not null
);

-- ─── stickers ─────────────────────────────────────────────────────────────────

create table if not exists stickers (
  id        uuid             primary key default gen_random_uuid(),
  album_id  uuid             not null references albums(id) on delete cascade,
  number    text             not null,
  label     text             not null,
  team      text,
  category  sticker_category not null default 'other',
  unique (album_id, number)
);

create index if not exists stickers_album_id_number_idx on stickers (album_id, number);

-- ─── user_collections ─────────────────────────────────────────────────────────

create table if not exists user_collections (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  album_id  uuid not null references albums(id) on delete cascade,
  unique (user_id, album_id)
);

-- ─── user_stickers ────────────────────────────────────────────────────────────

create table if not exists user_stickers (
  id                   uuid primary key default gen_random_uuid(),
  user_collection_id   uuid not null references user_collections(id) on delete cascade,
  sticker_id           uuid not null references stickers(id) on delete cascade,
  unique (user_collection_id, sticker_id)
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

-- Albums and stickers are readable by everyone
alter table albums    enable row level security;
alter table stickers  enable row level security;

create policy "albums_read_all"   on albums   for select using (true);
create policy "stickers_read_all" on stickers for select using (true);

-- user_collections: owned by user
alter table user_collections enable row level security;

create policy "uc_select" on user_collections for select
  using (auth.uid() = user_id);

create policy "uc_insert" on user_collections for insert
  with check (auth.uid() = user_id);

create policy "uc_delete" on user_collections for delete
  using (auth.uid() = user_id);

-- user_stickers: owned by user (via collection)
alter table user_stickers enable row level security;

create policy "us_select" on user_stickers for select
  using (
    exists (
      select 1 from user_collections uc
      where uc.id = user_stickers.user_collection_id
        and uc.user_id = auth.uid()
    )
  );

create policy "us_insert" on user_stickers for insert
  with check (
    exists (
      select 1 from user_collections uc
      where uc.id = user_stickers.user_collection_id
        and uc.user_id = auth.uid()
    )
  );

create policy "us_delete" on user_stickers for delete
  using (
    exists (
      select 1 from user_collections uc
      where uc.id = user_stickers.user_collection_id
        and uc.user_id = auth.uid()
    )
  );
