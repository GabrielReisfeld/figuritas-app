-- Fix: add UPDATE policy on user_stickers (was missing, causing duplicate_count updates to fail silently)
create policy "us_update" on user_stickers for update
  using (
    exists (
      select 1 from user_collections uc
      where uc.id = user_stickers.user_collection_id
        and uc.user_id = auth.uid()
    )
  );
