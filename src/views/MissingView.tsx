import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { CategoryBadge } from '../components/ui/Badge'
import type { StickerCategory, StickerWithOwned } from '../types'

const CATEGORIES: StickerCategory[] = ['team', 'player', 'badge', 'stadium', 'special', 'gold', 'other']

export const MissingView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, enrichStickers, ownedByAlbum } = useCollectionStore()

  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<StickerCategory | ''>('')
  const [teamFilter, setTeamFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'number' | 'team'>('number')

  const album = albums.find(a => a.id === selectedAlbumId)
  const { stickers } = useStickers(selectedAlbumId || undefined, album?.total_stickers)

  useEffect(() => {
    if (albums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(albums[albums.length - 1].id)
    }
  }, [albums, selectedAlbumId])

  useEffect(() => {
    if (user && selectedAlbumId) {
      loadOwnedForAlbum(user.id, selectedAlbumId)
    }
  }, [user, selectedAlbumId, loadOwnedForAlbum])

  const enriched = useMemo(
    () => enrichStickers(stickers, selectedAlbumId),
    [stickers, selectedAlbumId, enrichStickers, ownedByAlbum]  // eslint-disable-line
  )

  const missing: StickerWithOwned[] = useMemo(() => {
    let result = enriched.filter(s => !s.owned)
    if (categoryFilter) result = result.filter(s => s.category === categoryFilter)
    if (teamFilter) result = result.filter(s => s.team === teamFilter)
    if (sortBy === 'team') result = [...result].sort((a, b) => (a.team ?? '').localeCompare(b.team ?? ''))
    else result = [...result].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    return result
  }, [enriched, categoryFilter, teamFilter, sortBy])

  const teams = useMemo(() => {
    const set = new Set<string>()
    for (const s of enriched) {
      if (s.team) set.add(s.team)
    }
    return Array.from(set).sort()
  }, [enriched])

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <p style={{ marginBottom: 12 }}>Sign in to see your missing stickers</p>
        <Link to="/auth" style={{ color: '#4ade80', fontWeight: 700 }}>Sign in</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Missing Stickers</h1>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <select value={selectedAlbumId} onChange={e => setSelectedAlbumId(e.target.value)} style={selectStyle}>
          {albums.map(a => (
            <option key={a.id} value={a.id}>{a.year} – {a.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as StickerCategory | '')} style={{ ...selectStyle, flex: 1 }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
            <option value="">All teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['number', 'team'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                background: sortBy === s ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                border: sortBy === s ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: sortBy === s ? '#4ade80' : '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 14px',
              }}
            >
              Sort by {s}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {missing.length} missing sticker{missing.length !== 1 ? 's' : ''}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {missing.map(s => (
          <div
            key={s.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171', minWidth: 36 }}>#{s.number}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{s.label}</div>
              {s.team && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{s.team}</div>}
            </div>
            <CategoryBadge category={s.category} />
          </div>
        ))}
        {missing.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4ade80', padding: 32, fontSize: 14, fontWeight: 700 }}>
            Complete! All stickers owned.
          </div>
        )}
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
