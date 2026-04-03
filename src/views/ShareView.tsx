import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { StickerChip } from '../components/ui/StickerChip'
import type { StickerWithOwned } from '../types'

// ─── Share view ───────────────────────────────────────────────────────────────

export const ShareView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, ownedByAlbum, duplicatesByAlbum, enrichStickers } = useCollectionStore()
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const album = albums.find(a => a.id === selectedAlbumId)
  const { stickers } = useStickers(selectedAlbumId || undefined, album?.total_stickers)

  useEffect(() => {
    if (albums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(albums[albums.length - 1].id)
    }
  }, [albums, selectedAlbumId])

  useEffect(() => {
    if (user && selectedAlbumId) loadOwnedForAlbum(user.id, selectedAlbumId)
  }, [user, selectedAlbumId, loadOwnedForAlbum])

  const enriched = useMemo(
    () => enrichStickers(stickers, selectedAlbumId),
    [stickers, selectedAlbumId, enrichStickers, ownedByAlbum, duplicatesByAlbum]  // eslint-disable-line
  )

  const ownedIds = Array.from(ownedByAlbum[selectedAlbumId] ?? [])
  const dups = duplicatesByAlbum[selectedAlbumId] ?? new Map<string, number>()

  // Missing sticker numbers in album order (stickers array is already sorted)
  const missingNumbers = useMemo(
    () => enriched.filter(s => !s.owned).map(s => s.number),
    [enriched]
  )

  // Duplicate stickers list in album order
  const dupList = useMemo(
    () => enriched.filter(s => s.owned && s.duplicateCount > 0),
    [enriched]
  )

  // Share messages
  const missingMessage = useMemo(() => {
    if (!album || missingNumbers.length === 0) return ''
    return `Me faltan las siguientes figuritas del Álbum del Mundial ${album.year}:\n${missingNumbers.join(', ')}`
  }, [album, missingNumbers])

  const dupMessage = useMemo(() => {
    if (!album || dupList.length === 0) return ''
    const parts = dupList.map(s => `${s.number}${s.duplicateCount > 1 ? ` (x${s.duplicateCount})` : ''}`)
    return `Tengo las siguientes figuritas repetidas del Álbum del Mundial ${album.year}:\n${parts.join(', ')}`
  }, [album, dupList])

  const shareUrl = useMemo(() => {
    if (!selectedAlbumId || ownedIds.length === 0) return ''
    const encoded = btoa(ownedIds.join(','))
    const dupEncoded = dups.size > 0
      ? '&d=' + btoa(Array.from(dups.entries()).map(([id, c]) => `${id}:${c}`).join(','))
      : ''
    return `${window.location.origin}/shared/${selectedAlbumId}?o=${encoded}${dupEncoded}`
  }, [selectedAlbumId, ownedIds, dups])

  async function copyText(text: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers/WebViews that block clipboard
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareNative(text: string) {
    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await copyText(text)
    }
  }

  function exportJson() {
    if (!selectedAlbumId) return
    const data = {
      album,
      owned_sticker_ids: ownedIds,
      duplicates: Object.fromEntries(dups),
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
        <p>Iniciá sesión para compartir tu colección</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Compartir</h1>

      <select value={selectedAlbumId} onChange={e => setSelectedAlbumId(e.target.value)} style={selectStyle}>
        {albums.map(a => <option key={a.id} value={a.id}>{a.year} – {a.name}</option>)}
      </select>

      <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
        {ownedIds.length} de {album?.total_stickers ?? 0} figuritas tenidas
        {dupList.length > 0 && ` · ${dupList.reduce((s, x) => s + x.duplicateCount, 0)} repetidas`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

        {/* Share missing */}
        {missingMessage && (
          <ShareCard
            label="Compartir faltantes"
            preview={missingMessage}
            onCopy={() => copyText(missingMessage)}
            onShare={() => shareNative(missingMessage)}
            copied={copied}
          />
        )}

        {/* Share duplicates */}
        {dupMessage && (
          <ShareCard
            label="Compartir repetidas"
            preview={dupMessage}
            onCopy={() => copyText(dupMessage)}
            onShare={() => shareNative(dupMessage)}
            copied={copied}
          />
        )}

        {/* Share URL */}
        {shareUrl && (
          <div style={cardStyle}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Link de colección completa</p>
            <div style={{ fontSize: 11, color: '#475569', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 10 }}>
              {shareUrl}
            </div>
            <button onClick={() => copyText(shareUrl)} style={btnStyle('#60a5fa')}>
              {copied ? '✓ Copiado' : '🔗 Copiar link'}
            </button>
          </div>
        )}

        <button onClick={exportJson} disabled={!selectedAlbumId} style={btnStyle('#a78bfa')}>
          ⬇ Exportar JSON
        </button>
      </div>
    </div>
  )
}

// ─── Share card ───────────────────────────────────────────────────────────────

interface ShareCardProps {
  label: string
  preview: string
  onCopy: () => void
  onShare: () => void
  copied: boolean
}

const ShareCard: React.FC<ShareCardProps> = ({ label, preview, onCopy, onShare, copied }) => (
  <div style={cardStyle}>
    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>{label}</p>
    <pre style={{
      fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, margin: '0 0 10px',
      maxHeight: 120, overflow: 'auto',
    }}>
      {preview}
    </pre>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onCopy} style={{ ...btnStyle('#4ade80'), flex: 1 }}>
        {copied ? '✓ Copiado' : '📋 Copiar'}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button onClick={onShare} style={{ ...btnStyle('#60a5fa'), flex: 1 }}>
          ↗ Compartir
        </button>
      )}
    </div>
  </div>
)

// ─── Shared (public, read-only) view ─────────────────────────────────────────

export const SharedAlbumView: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>()
  const [searchParams] = useSearchParams()
  const { albums } = useAlbums()
  const album = albums.find(a => a.id === albumId)
  const { stickers } = useStickers(albumId, album?.total_stickers)

  const ownedIds = useMemo(() => {
    try { return new Set(atob(searchParams.get('o') ?? '').split(',').filter(Boolean)) }
    catch { return new Set<string>() }
  }, [searchParams])

  const dupMap = useMemo(() => {
    const m = new Map<string, number>()
    try {
      const raw = searchParams.get('d')
      if (raw) {
        atob(raw).split(',').forEach(part => {
          const [id, c] = part.split(':')
          if (id && c) m.set(id, Number(c))
        })
      }
    } catch { /* ignore */ }
    return m
  }, [searchParams])

  const enriched: StickerWithOwned[] = useMemo(
    () => stickers.map(s => ({ ...s, owned: ownedIds.has(s.id), duplicateCount: dupMap.get(s.id) ?? 0 })),
    [stickers, ownedIds, dupMap]
  )

  const missing = enriched.filter(s => !s.owned)
  const owned = enriched.filter(s => s.owned)
  const dups = enriched.filter(s => s.owned && s.duplicateCount > 0)
  const pct = enriched.length > 0 ? Math.round((owned.length / enriched.length) * 100) : 0

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        {album?.year} – {album?.name}
      </h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Colección compartida · {owned.length}/{enriched.length} tenidas ({pct}%)
        {dups.length > 0 && ` · ${dups.reduce((s, x) => s + x.duplicateCount, 0)} repetidas`}
      </p>

      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 10 }}>
        Faltantes ({missing.length})
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {missing.map(s => <StickerChip key={s.id} sticker={s} onToggle={() => {}} readOnly />)}
      </div>

      {dups.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>
            Repetidas ({dups.reduce((s, x) => s + x.duplicateCount, 0)})
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {dups.map(s => <StickerChip key={s.id} sticker={s} onToggle={() => {}} readOnly />)}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: 14,
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
    padding: '12px 0',
    width: '100%',
  }
}
