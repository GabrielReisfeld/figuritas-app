// ─── Database types ───────────────────────────────────────────────────────────

export type StickerCategory =
  | 'team'
  | 'player'
  | 'badge'
  | 'stadium'
  | 'special'
  | 'gold'
  | 'other'

export interface Album {
  id: string
  year: number
  name: string
  total_stickers: number
}

export interface Sticker {
  id: string
  album_id: string
  number: string
  label: string
  team: string | null
  category: StickerCategory
}

export interface UserCollection {
  id: string
  user_id: string
  album_id: string
}

export interface UserSticker {
  id: string
  user_collection_id: string
  sticker_id: string
}

// ─── Enriched / view types ────────────────────────────────────────────────────

export interface AlbumWithStats extends Album {
  owned: number
  missing: number
  pct: number
}

export interface StickerWithOwned extends Sticker {
  owned: boolean
}

export interface CategoryBreakdown {
  category: StickerCategory
  total: number
  owned: number
}

export interface TeamBreakdown {
  team: string
  stickers: StickerWithOwned[]
  owned: number
  total: number
}

// ─── Offline sync ─────────────────────────────────────────────────────────────

export type SyncAction = 'add' | 'remove'

export interface PendingChange {
  id: string                // local uuid
  sticker_id: string
  album_id: string
  user_id: string
  action: SyncAction
  timestamp: number
}

// ─── Shared view (URL-encoded) ────────────────────────────────────────────────

export interface SharedView {
  album_id: string
  owned_ids: string[]       // sticker ids
}
