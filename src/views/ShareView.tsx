import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { StickerChip } from '../components/ui/StickerChip'
import type { StickerWithOwned } from '../types'

// ─── Encoding helpers ─────────────────────────────────────────────────────────

function encodeOwnedIds(ids: string[]): string {
  return btoa(ids.join(','))
}

function decodeOwnedIds(encoded: string): string[] {
  try {
    return atob(encoded).split(',').filter(Boolean)
  } catch {
    return []
  }
}

// ─── Share view ───────────────────────────────────────────────────────────────

export const ShareView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, ownedByAlbum } = useCollectionStore()
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const album = albums.find(a => a.id === selectedAlbumId)
  useStickers(selectedAlbumId || undefined, album?.total_stickers)

  useEffect(() => {
    if (albums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(albums[albums.length - 1].id)
    }
  }, [albums, selectedAlbumId])

  useEffect(() => {
    if (user && selectedAlbumId) loadOwnedForAlbum(user.id, selectedAlbumId)
  }, [user, selectedAlbumId, loadOwnedForAlbum])

  const ownedIds = Array.from(ownedByAlbum[selectedAlbumId] ?? [])

  const shareUrl = useMemo(() => {
    if (!selectedAlbumId || ownedIds.length === 0) return ''
    const encoded = encodeOwnedIds(ownedIds)
    return `${window.location.origin}/shared/${selectedAlbumId}?o=${encoded}`
  }, [selectedAlbumId, ownedIds])

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportJson() {
    if (!selectedAlbumId) return
    const data = {
      album: album,
      owned_sticker_ids: ownedIds,
      exported_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `figuritas-${album?.year ?? 'album'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <p>Sign in to share your collection</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Share Collection</h1>

      <select
        value={selectedAlbumId}
        onChange={e => setSelectedAlbumId(e.target.value)}
        style={selectStyle}
      >
        {albums.map(a => (
          <option key={a.id} value={a.id}>{a.year} – {a.name}</option>
        ))}
      </select>

      <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
        {ownedIds.length} of {album?.total_stickers ?? 0} stickers owned
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {shareUrl && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: 12,
              fontSize: 11,
              color: '#64748b',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {shareUrl}
          </div>
        )}

        <button onClick={copyLink} disabled={!shareUrl} style={btnStyle('#4ade80')}>
          {copied ? '✓ Copied!' : '🔗 Copy Share Link'}
        </button>

        <button onClick={exportJson} disabled={!selectedAlbumId} style={btnStyle('#60a5fa')}>
          ⬇ Export JSON
        </button>
      </div>
    </div>
  )
}

// ─── Shared (public, read-only) view ─────────────────────────────────────────

export const SharedAlbumView: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>()
  const [searchParams] = useSearchParams()
  const { albums } = useAlbums()
  const album = albums.find(a => a.id === albumId)
  const { stickers } = useStickers(albumId, album?.total_stickers)

  const ownedIds = useMemo(() => {
    const encoded = searchParams.get('o') ?? ''
    return new Set(decodeOwnedIds(encoded))
  }, [searchParams])

  const enriched: StickerWithOwned[] = useMemo(
    () => stickers.map(s => ({ ...s, owned: ownedIds.has(s.id) })),
    [stickers, ownedIds]
  )

  const missing = enriched.filter(s => !s.owned)
  const owned = enriched.filter(s => s.owned)
  const pct = enriched.length > 0 ? Math.round((owned.length / enriched.length) * 100) : 0

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        {album?.year} – {album?.name}
      </h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Shared collection — {owned.length}/{enriched.length} owned ({pct}%)
      </p>

      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 10 }}>
        Missing ({missing.length})
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {missing.map(s => (
          <StickerChip key={s.id} sticker={s} onToggle={() => {}} readOnly />
        ))}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '9px 12px',
  outline: 'none',
  width: '100%',
  cursor: 'pointer',
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}22`,
    border: `1px solid ${color}55`,
    borderRadius: 10,
    color,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    padding: '13px 0',
    width: '100%',
  }
}
