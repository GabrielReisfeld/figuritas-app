import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Album, Sticker, PendingChange } from '../types'

interface FiguritasDB extends DBSchema {
  albums: {
    key: string
    value: Album
  }
  stickers: {
    key: string
    value: Sticker
    indexes: { 'by-album': string }
  }
  owned_sticker_ids: {
    key: string          // `${user_id}:${album_id}:${sticker_id}`
    value: {
      key: string
      user_id: string
      album_id: string
      sticker_id: string
    }
    indexes: { 'by-user-album': [string, string] }
  }
  pending_changes: {
    key: string
    value: PendingChange
    indexes: { 'by-timestamp': number }
  }
  duplicate_counts: {
    key: string          // `${user_id}:${album_id}:${sticker_id}`
    value: {
      key: string
      user_id: string
      album_id: string
      sticker_id: string
      count: number
    }
    indexes: { 'by-user-album': [string, string] }
  }
}

let _db: IDBPDatabase<FiguritasDB> | null = null

export async function getDB(): Promise<IDBPDatabase<FiguritasDB>> {
  if (_db) return _db
  _db = await openDB<FiguritasDB>('figuritas', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('albums', { keyPath: 'id' })

        const stickersStore = db.createObjectStore('stickers', { keyPath: 'id' })
        stickersStore.createIndex('by-album', 'album_id')

        const ownedStore = db.createObjectStore('owned_sticker_ids', { keyPath: 'key' })
        ownedStore.createIndex('by-user-album', ['user_id', 'album_id'])

        const changesStore = db.createObjectStore('pending_changes', { keyPath: 'id' })
        changesStore.createIndex('by-timestamp', 'timestamp')
      }
      if (oldVersion < 3) {
        const dupStore = db.createObjectStore('duplicate_counts', { keyPath: 'key' })
        dupStore.createIndex('by-user-album', ['user_id', 'album_id'])
      }
    },
  })
  return _db
}

// ─── Albums ───────────────────────────────────────────────────────────────────

export async function cacheAlbums(albums: Album[]) {
  const db = await getDB()
  const tx = db.transaction('albums', 'readwrite')
  await Promise.all(albums.map(a => tx.store.put(a)))
  await tx.done
}

export async function getCachedAlbums(): Promise<Album[]> {
  const db = await getDB()
  return db.getAll('albums')
}

// ─── Stickers ─────────────────────────────────────────────────────────────────

export async function cacheStickers(stickers: Sticker[]) {
  const db = await getDB()
  const tx = db.transaction('stickers', 'readwrite')
  await Promise.all(stickers.map(s => tx.store.put(s)))
  await tx.done
}

export async function getCachedStickers(albumId: string): Promise<Sticker[]> {
  const db = await getDB()
  return db.getAllFromIndex('stickers', 'by-album', albumId)
}

// ─── Owned sticker ids ────────────────────────────────────────────────────────

function ownedKey(userId: string, albumId: string, stickerId: string) {
  return `${userId}:${albumId}:${stickerId}`
}

export async function getCachedOwnedIds(userId: string, albumId: string): Promise<Set<string>> {
  const db = await getDB()
  const entries = await db.getAllFromIndex('owned_sticker_ids', 'by-user-album', [userId, albumId])
  return new Set(entries.map(e => e.sticker_id))
}

export async function setCachedOwned(userId: string, albumId: string, stickerId: string) {
  const db = await getDB()
  await db.put('owned_sticker_ids', {
    key: ownedKey(userId, albumId, stickerId),
    user_id: userId,
    album_id: albumId,
    sticker_id: stickerId,
  })
}

export async function removeCachedOwned(userId: string, albumId: string, stickerId: string) {
  const db = await getDB()
  await db.delete('owned_sticker_ids', ownedKey(userId, albumId, stickerId))
}

export async function setCachedOwnedBulk(userId: string, albumId: string, stickerIds: string[]) {
  const db = await getDB()
  const existing = await db.getAllFromIndex('owned_sticker_ids', 'by-user-album', [userId, albumId])
  const newKeySet = new Set(stickerIds.map(sid => ownedKey(userId, albumId, sid)))

  const tx = db.transaction('owned_sticker_ids', 'readwrite')
  await Promise.all(
    existing
      .filter(e => !newKeySet.has(e.key))
      .map(e => tx.store.delete(e.key))
  )
  await Promise.all(
    stickerIds.map(sid =>
      tx.store.put({
        key: ownedKey(userId, albumId, sid),
        user_id: userId,
        album_id: albumId,
        sticker_id: sid,
      })
    )
  )
  await tx.done
}

export async function clearCachedOwnedAll(userId: string, albumId: string) {
  const db = await getDB()
  const entries = await db.getAllFromIndex('owned_sticker_ids', 'by-user-album', [userId, albumId])
  const tx = db.transaction('owned_sticker_ids', 'readwrite')
  await Promise.all(entries.map(e => tx.store.delete(e.key)))
  await tx.done
}

// ─── Duplicate counts ─────────────────────────────────────────────────────────

function dupKey(userId: string, albumId: string, stickerId: string) {
  return `${userId}:${albumId}:${stickerId}`
}

export async function getDuplicateCounts(userId: string, albumId: string): Promise<Map<string, number>> {
  const db = await getDB()
  const entries = await db.getAllFromIndex('duplicate_counts', 'by-user-album', [userId, albumId])
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.count > 0) map.set(e.sticker_id, e.count)
  }
  return map
}

export async function setCachedDuplicateCount(userId: string, albumId: string, stickerId: string, count: number) {
  const db = await getDB()
  if (count <= 0) {
    await db.delete('duplicate_counts', dupKey(userId, albumId, stickerId))
  } else {
    await db.put('duplicate_counts', {
      key: dupKey(userId, albumId, stickerId),
      user_id: userId,
      album_id: albumId,
      sticker_id: stickerId,
      count,
    })
  }
}

// ─── Pending changes ──────────────────────────────────────────────────────────

export async function enqueuePendingChange(change: PendingChange) {
  const db = await getDB()
  await db.put('pending_changes', change)
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await getDB()
  return db.getAllFromIndex('pending_changes', 'by-timestamp')
}

export async function deletePendingChange(id: string) {
  const db = await getDB()
  await db.delete('pending_changes', id)
}
