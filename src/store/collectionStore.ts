import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import {
  getCachedOwnedIds,
  setCachedOwned,
  removeCachedOwned,
  setCachedOwnedBulk,
  clearCachedOwnedAll,
  enqueuePendingChange,
  getDuplicateCounts,
  setCachedDuplicateCount,
} from '../lib/idb'
import type { Album, Sticker, AlbumWithStats, StickerWithOwned } from '../types'

const inFlight = new Map<string, Promise<void>>()

interface CollectionState {
  ownedByAlbum: Record<string, Set<string>>
  collectionIds: Record<string, string>
  duplicatesByAlbum: Record<string, Map<string, number>>

  pushLocalDuplicatesToServer: (userId: string, albumId: string) => Promise<number>

  loadOwnedForAlbum: (userId: string, albumId: string) => Promise<void>
  toggleSticker: (userId: string, albumId: string, sticker: Sticker) => Promise<void>
  markAllOwned: (userId: string, albumId: string, stickers: Sticker[]) => Promise<void>
  clearAllOwned: (userId: string, albumId: string) => Promise<void>
  setDuplicateCount: (userId: string, albumId: string, sticker: Sticker, count: number) => Promise<void>
  enrichAlbums: (albums: Album[], userId: string | null) => AlbumWithStats[]
  enrichStickers: (stickers: Sticker[], albumId: string) => StickerWithOwned[]
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  ownedByAlbum: {},
  collectionIds: {},
  duplicatesByAlbum: {},

  loadOwnedForAlbum: async (userId, albumId) => {
    const key = `${userId}:${albumId}`
    if (inFlight.has(key)) return inFlight.get(key)!

    const promise = (async () => {
    // 1. Load owned IDs from IndexedDB (instant).
    // Duplicate counts are intentionally NOT pre-loaded from IDB — stale counts
    // would briefly show every sticker as a duplicate before Supabase corrects it.
    const cached = await getCachedOwnedIds(userId, albumId)
    set(s => ({
      ownedByAlbum: { ...s.ownedByAlbum, [albumId]: cached },
      duplicatesByAlbum: { ...s.duplicatesByAlbum, [albumId]: new Map() },
    }))

    // 2. Ensure collection row exists in Supabase
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

    // 3. Fetch live owned sticker ids + duplicate counts
    const { data: us } = await supabase
      .from('user_stickers')
      .select('sticker_id, duplicate_count')
      .eq('user_collection_id', collectionId)

    if (us) {
      const ids = us.map(r => r.sticker_id)
      const liveSet = new Set(ids)
      const liveDups = new Map<string, number>()
      for (const row of us) {
        if ((row.duplicate_count ?? 0) > 0) {
          liveDups.set(row.sticker_id, row.duplicate_count)
        }
      }
      await setCachedOwnedBulk(userId, albumId, ids)
      // Sync server → IndexedDB: write non-zero counts and clear stale local entries
      const localDups = await getDuplicateCounts(userId, albumId)
      for (const [sid, count] of liveDups) {
        await setCachedDuplicateCount(userId, albumId, sid, count)
      }
      for (const [sid] of localDups) {
        if (!liveDups.has(sid)) {
          await setCachedDuplicateCount(userId, albumId, sid, 0)
        }
      }

      set(s => ({
        ownedByAlbum: { ...s.ownedByAlbum, [albumId]: liveSet },
        duplicatesByAlbum: { ...s.duplicatesByAlbum, [albumId]: liveDups },
      }))
    }
    })()

    inFlight.set(key, promise)
    promise.finally(() => inFlight.delete(key))
    return promise
  },

  toggleSticker: async (userId, albumId, sticker) => {
    const state = get()
    const owned = state.ownedByAlbum[albumId] ?? new Set<string>()
    const isOwned = owned.has(sticker.id)
    const collectionId = state.collectionIds[albumId]

    // Optimistic update
    const next = new Set(owned)
    if (isOwned) {
      next.delete(sticker.id)
      // Remove duplicates when un-owning
      const nextDups = new Map(state.duplicatesByAlbum[albumId] ?? [])
      nextDups.delete(sticker.id)
      set(s => ({
        ownedByAlbum: { ...s.ownedByAlbum, [albumId]: next },
        duplicatesByAlbum: { ...s.duplicatesByAlbum, [albumId]: nextDups },
      }))
      await setCachedDuplicateCount(userId, albumId, sticker.id, 0)
    } else {
      next.add(sticker.id)
      set(s => ({ ownedByAlbum: { ...s.ownedByAlbum, [albumId]: next } }))
    }

    if (isOwned) {
      await removeCachedOwned(userId, albumId, sticker.id)
    } else {
      await setCachedOwned(userId, albumId, sticker.id)
    }

    if (!navigator.onLine || !collectionId) {
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

  markAllOwned: async (userId, albumId, stickers) => {
    const state = get()
    const collectionId = state.collectionIds[albumId]
    const allIds = stickers.map(s => s.id)
    const newSet = new Set(allIds)

    set(s => ({ ownedByAlbum: { ...s.ownedByAlbum, [albumId]: newSet } }))
    await setCachedOwnedBulk(userId, albumId, allIds)

    if (!navigator.onLine || !collectionId) return

    await supabase
      .from('user_stickers')
      .upsert(allIds.map(id => ({ user_collection_id: collectionId, sticker_id: id })))
  },

  clearAllOwned: async (userId, albumId) => {
    const state = get()
    const collectionId = state.collectionIds[albumId]

    set(s => ({
      ownedByAlbum: { ...s.ownedByAlbum, [albumId]: new Set() },
      duplicatesByAlbum: { ...s.duplicatesByAlbum, [albumId]: new Map() },
    }))
    await clearCachedOwnedAll(userId, albumId)

    if (!navigator.onLine || !collectionId) return

    await supabase
      .from('user_stickers')
      .delete()
      .eq('user_collection_id', collectionId)
  },

  pushLocalDuplicatesToServer: async (userId, albumId) => {
    const state = get()
    const collectionId = state.collectionIds[albumId]
    if (!collectionId) throw new Error('No collection ID')

    // What the user wants locally
    const localDups = await getDuplicateCounts(userId, albumId)

    // What the server currently has (need this to know what to zero out)
    const { data: serverRows, error: fetchError } = await supabase
      .from('user_stickers')
      .select('sticker_id, duplicate_count')
      .eq('user_collection_id', collectionId)
    if (fetchError) throw fetchError

    const serverDups = new Map<string, number>()
    for (const row of serverRows ?? []) {
      if ((row.duplicate_count ?? 0) > 0) serverDups.set(row.sticker_id, row.duplicate_count)
    }

    // Build minimal update list: changed values + stickers zeroed locally
    const updates: Array<{ sticker_id: string; count: number }> = []
    for (const [sid, count] of localDups) {
      if (serverDups.get(sid) !== count) updates.push({ sticker_id: sid, count })
    }
    for (const [sid] of serverDups) {
      if (!localDups.has(sid)) updates.push({ sticker_id: sid, count: 0 })
    }

    if (updates.length > 0) {
      const results = await Promise.all(
        updates.map(({ sticker_id, count }) =>
          supabase
            .from('user_stickers')
            .update({ duplicate_count: count })
            .eq('user_collection_id', collectionId)
            .eq('sticker_id', sticker_id)
        )
      )
      const failed = results.filter(r => r.error)
      if (failed.length > 0) throw new Error('Some updates failed')
    }

    set(s => ({ duplicatesByAlbum: { ...s.duplicatesByAlbum, [albumId]: new Map(localDups) } }))
    return localDups.size
  },

  setDuplicateCount: async (userId, albumId, sticker, count) => {
    const state = get()
    const owned = state.ownedByAlbum[albumId] ?? new Set<string>()
    if (!owned.has(sticker.id)) return

    const nextDups = new Map(state.duplicatesByAlbum[albumId] ?? [])
    if (count <= 0) {
      nextDups.delete(sticker.id)
    } else {
      nextDups.set(sticker.id, count)
    }
    set(s => ({ duplicatesByAlbum: { ...s.duplicatesByAlbum, [albumId]: nextDups } }))
    await setCachedDuplicateCount(userId, albumId, sticker.id, count)
  },

  enrichAlbums: (albums, userId) => {
    const state = get()
    return albums.map(album => {
      const owned = userId ? (state.ownedByAlbum[album.id]?.size ?? 0) : 0
      const missing = Math.max(0, album.total_stickers - owned)
      const pct = album.total_stickers > 0 ? Math.min(100, Math.round((owned / album.total_stickers) * 100)) : 0
      const dups = state.duplicatesByAlbum[album.id]
      const totalDuplicates = dups
        ? Array.from(dups.values()).reduce((sum, c) => sum + c, 0)
        : 0
      return { ...album, owned, missing, pct, totalDuplicates }
    })
  },

  enrichStickers: (stickers, albumId) => {
    const state = get()
    const owned = state.ownedByAlbum[albumId] ?? new Set<string>()
    const dups = state.duplicatesByAlbum[albumId] ?? new Map<string, number>()
    return stickers.map(s => ({
      ...s,
      owned: owned.has(s.id),
      duplicateCount: dups.get(s.id) ?? 0,
    }))
  },
}))
