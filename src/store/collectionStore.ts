/**
 * Central store for sticker collection state.
 * Handles optimistic UI updates, IndexedDB caching, and offline queuing.
 */
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import {
  getCachedOwnedIds,
  setCachedOwned,
  removeCachedOwned,
  setCachedOwnedBulk,
  enqueuePendingChange,
} from '../lib/idb'
import type { Album, Sticker, AlbumWithStats, StickerWithOwned } from '../types'

interface CollectionState {
  // owned sticker ids per album: albumId → Set<stickerId>
  ownedByAlbum: Record<string, Set<string>>
  // collection id per album: albumId → collectionId
  collectionIds: Record<string, string>

  loadOwnedForAlbum: (userId: string, albumId: string) => Promise<void>
  toggleSticker: (userId: string, albumId: string, sticker: Sticker) => Promise<void>
  enrichAlbums: (albums: Album[], userId: string | null) => AlbumWithStats[]
  enrichStickers: (stickers: Sticker[], albumId: string) => StickerWithOwned[]
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  ownedByAlbum: {},
  collectionIds: {},

  loadOwnedForAlbum: async (userId, albumId) => {
    // 1. Try IndexedDB first (instant)
    const cached = await getCachedOwnedIds(userId, albumId)
    set(s => ({
      ownedByAlbum: { ...s.ownedByAlbum, [albumId]: cached },
    }))

    // 2. Ensure collection row exists
    const { data: colData } = await supabase
      .from('user_collections')
      .select('id')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .maybeSingle()

    let collectionId: string
    if (colData) {
      collectionId = colData.id
    } else {
      const { data: inserted } = await supabase
        .from('user_collections')
        .insert({ user_id: userId, album_id: albumId })
        .select('id')
        .single()
      collectionId = inserted!.id
    }

    set(s => ({ collectionIds: { ...s.collectionIds, [albumId]: collectionId } }))

    // 3. Fetch live owned sticker ids from Supabase
    const { data: us } = await supabase
      .from('user_stickers')
      .select('sticker_id')
      .eq('user_collection_id', collectionId)

    if (us) {
      const ids = us.map(r => r.sticker_id)
      const liveSet = new Set(ids)
      await setCachedOwnedBulk(userId, albumId, ids)
      set(s => ({ ownedByAlbum: { ...s.ownedByAlbum, [albumId]: liveSet } }))
    }
  },

  toggleSticker: async (userId, albumId, sticker) => {
    const state = get()
    const owned = state.ownedByAlbum[albumId] ?? new Set<string>()
    const isOwned = owned.has(sticker.id)
    const collectionId = state.collectionIds[albumId]

    // Optimistic update
    const next = new Set(owned)
    if (isOwned) next.delete(sticker.id)
    else next.add(sticker.id)
    set(s => ({ ownedByAlbum: { ...s.ownedByAlbum, [albumId]: next } }))

    // Update IndexedDB
    if (isOwned) {
      await removeCachedOwned(userId, albumId, sticker.id)
    } else {
      await setCachedOwned(userId, albumId, sticker.id)
    }

    if (!navigator.onLine || !collectionId) {
      // Queue for later sync
      await enqueuePendingChange({
        id: uuidv4(),
        sticker_id: sticker.id,
        album_id: albumId,
        user_id: userId,
        action: isOwned ? 'remove' : 'add',
        timestamp: Date.now(),
      })
      return
    }

    // Live sync
    if (isOwned) {
      await supabase
        .from('user_stickers')
        .delete()
        .eq('user_collection_id', collectionId)
        .eq('sticker_id', sticker.id)
    } else {
      await supabase
        .from('user_stickers')
        .upsert({ user_collection_id: collectionId, sticker_id: sticker.id })
    }
  },

  enrichAlbums: (albums, userId) => {
    const state = get()
    return albums.map(album => {
      const owned = userId ? (state.ownedByAlbum[album.id]?.size ?? 0) : 0
      const missing = album.total_stickers - owned
      const pct = album.total_stickers > 0 ? Math.round((owned / album.total_stickers) * 100) : 0
      return { ...album, owned, missing, pct }
    })
  },

  enrichStickers: (stickers, albumId) => {
    const state = get()
    const owned = state.ownedByAlbum[albumId] ?? new Set<string>()
    return stickers.map(s => ({ ...s, owned: owned.has(s.id) }))
  },
}))
