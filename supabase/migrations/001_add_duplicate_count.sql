-- Run this in Supabase SQL Editor to enable duplicate sync
ALTER TABLE user_stickers
  ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0;
