import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import type { StickerCategory, StickerWithOwned } from '../types'
import { teamFlag } from '../lib/flags'
import { CATEGORY_LABEL } from '../lib/categories'

const CATEGORIES: StickerCategory[] = ['player', 'badge', 'team', 'stadium', 'special', 'gold', 'other']

export const MissingView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, enrichStickers, ownedByAlbum } = useCollectionStore()

  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<StickerCategory | ''>('')
  const [teamFilter, setTeamFilter] = useState<string>('')

  const effectiveAlbumId = selectedAlbumId || albums[albums.length - 1]?.id || ''
  const album = albums.find(a => a.id === effectiveAlbumId)
  const { stickers } = useStickers(effectiveAlbumId || undefined, album?.total_stickers)

  useEffect(() => {
    if (user && effectiveAlbumId) loadOwnedForAlbum(user.id, effectiveAlbumId)
  }, [user, effectiveAlbumId, loadOwnedForAlbum])

  const enriched = useMemo(
    () => enrichStickers(stickers, effectiveAlbumId),
    [stickers, effectiveAlbumId, enrichStickers, ownedByAlbum]  // eslint-disable-line
  )

  const missing: StickerWithOwned[] = useMemo(() => {
    let result = enriched.filter(s => !s.owned)
    if (categoryFilter) result = result.filter(s => s.category === categoryFilter)
    if (teamFilter) result = result.filter(s => s.team === teamFilter)
    return result
  }, [enriched, categoryFilter, teamFilter])

  const teams = useMemo(() => {
    const set = new Set<string>()
    for (const s of enriched) if (s.team) set.add(s.team)
    return Array.from(set)
  }, [enriched])

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <p style={{ marginBottom: 12 }}>Iniciá sesión para ver tus figuritas faltantes</p>
        <Link to="/auth" style={{ color: '#4ade80', fontWeight: 700 }}>Entrar</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Faltantes</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <select value={effectiveAlbumId} onChange={e => setSelectedAlbumId(e.target.value)} style={selectStyle}>
          {albums.map(a => <option key={a.id} value={a.id}>{a.year} – {a.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as StickerCategory | '')} style={{ ...selectStyle, flex: 1 }}>
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
            <option value="">Todos los equipos</option>
            {teams.map(t => <option key={t} value={t}>{teamFlag(t)} {t}</option>)}
          </select>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {missing.length} figurita{missing.length !== 1 ? 's' : ''} faltante{missing.length !== 1 ? 's' : ''}
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
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171', minWidth: 40 }}>{s.number}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{s.label}</div>
              {s.team && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{teamFlag(s.team)} {s.team}</div>}
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>{CATEGORY_LABEL[s.category]}</span>
          </div>
        ))}
        {missing.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4ade80', padding: 32, fontSize: 14, fontWeight: 700 }}>
            ¡Álbum completo! 🎉
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
