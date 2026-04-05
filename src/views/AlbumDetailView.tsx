import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StickerChip } from '../components/ui/StickerChip'
import type { StickerWithOwned, StickerCategory, TeamBreakdown } from '../types'

const SPECIAL_CATEGORIES: StickerCategory[] = ['special', 'stadium', 'gold', 'badge', 'team', 'other']

const CATEGORY_LABEL: Record<StickerCategory, string> = {
  special:  'Especiales',
  stadium:  'Estadios',
  gold:     'Doradas',
  badge:    'Escudos',
  team:     'Fotos de equipo',
  player:   'Jugadores',
  other:    'Otros',
}

export const AlbumDetailView: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>()
  const { albums } = useAlbums()
  const album = albums.find(a => a.id === albumId)
  const { stickers, loading } = useStickers(albumId, album?.total_stickers)
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, toggleSticker, enrichStickers, ownedByAlbum, markAllOwned, clearAllOwned } = useCollectionStore()
  const [confirming, setConfirming] = useState<'complete' | 'empty' | null>(null)

  useEffect(() => {
    if (user && albumId) loadOwnedForAlbum(user.id, albumId)
  }, [user, albumId, loadOwnedForAlbum])

  const enriched: StickerWithOwned[] = useMemo(
    () => enrichStickers(stickers, albumId ?? ''),
    [stickers, albumId, enrichStickers, ownedByAlbum] // eslint-disable-line
  )

  const owned = ownedByAlbum[albumId ?? '']?.size ?? 0
  const total = album?.total_stickers ?? 0
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0

  const teamBreakdowns: TeamBreakdown[] = useMemo(() => {
    const map = new Map<string, StickerWithOwned[]>()
    for (const s of enriched) {
      if (s.team) {
        const arr = map.get(s.team) ?? []
        arr.push(s)
        map.set(s.team, arr)
      }
    }
    return Array.from(map.entries()).map(([team, ss]) => ({
      team,
      stickers: ss,
      owned: ss.filter(s => s.owned).length,
      total: ss.length,
    }))
  }, [enriched])

  const handleToggle = useCallback(
    (sticker: StickerWithOwned) => {
      if (!user || !albumId) return
      toggleSticker(user.id, albumId, sticker)
    },
    [user, albumId, toggleSticker]
  )

  const handleComplete = async () => {
    if (!user || !albumId) return
    await markAllOwned(user.id, albumId, stickers)
    setConfirming(null)
  }

  const handleEmpty = async () => {
    if (!user || !albumId) return
    await clearAllOwned(user.id, albumId)
    setConfirming(null)
  }

  if (loading && stickers.length === 0) {
    return <div style={{ padding: 16, color: '#64748b' }}>Cargando figuritas...</div>
  }

  return (
    <div>
      {/* Sticky progress header */}
      <div
        style={{
          position: 'sticky',
          top: 56,
          zIndex: 90,
          background: 'rgba(15,15,26,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', marginRight: 8 }}>
            ← Álbumes
          </Link>
          <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>
            {album?.year} – {album?.name}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: pct === 100 ? '#4ade80' : '#f1f5f9' }}>
            {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} height={8} />
        <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
          <Stat label="Tengo" value={owned} color="#4ade80" />
          <Stat label="Faltan" value={total - owned} color="#f87171" />
          <Stat label="Total" value={total} color="#94a3b8" />
          {user && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => setConfirming('complete')} style={bulkBtn('#4ade80')}>✓ Completo</button>
              <button onClick={() => setConfirming('empty')} style={bulkBtn('#f87171')}>✗ Vaciar</button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirming && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#1e1e2e', borderRadius: 16, padding: 24, maxWidth: 300, width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              {confirming === 'complete' ? '¿Marcar álbum completo?' : '¿Vaciar álbum?'}
            </p>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {confirming === 'complete'
                ? 'Todas las figuritas quedarán marcadas como tenidas.'
                : 'Se borrarán todas las figuritas marcadas.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirming(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
              >
                Cancelar
              </button>
              <button
                onClick={confirming === 'complete' ? handleComplete : handleEmpty}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: confirming === 'complete' ? '#4ade80' : '#f87171',
                  color: '#0f172a',
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-team sticker sections */}
      {SPECIAL_CATEGORIES.map(cat => {
        const catStickers = enriched.filter(s => !s.team && s.category === cat)
        if (catStickers.length === 0) return null
        const catOwned = catStickers.filter(s => s.owned).length
        return (
          <StickerSection
            key={cat}
            title={CATEGORY_LABEL[cat]}
            subtitle={`${catOwned}/${catStickers.length}`}
            stickers={catStickers}
            onToggle={handleToggle}
            readOnly={!user}
          />
        )
      })}

      {/* Team sections */}
      {teamBreakdowns.map(tb => (
        <StickerSection
          key={tb.team}
          title={tb.team}
          subtitle={`${tb.owned}/${tb.total}`}
          stickers={tb.stickers}
          onToggle={handleToggle}
          readOnly={!user}
        />
      ))}

      {!user && (
        <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          <Link to="/auth" style={{ color: '#4ade80' }}>Iniciá sesión</Link> para marcar tus figuritas
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StickerSectionProps {
  title: string
  subtitle?: string
  stickers: StickerWithOwned[]
  onToggle: (s: StickerWithOwned) => void
  readOnly: boolean
}

const StickerSection: React.FC<StickerSectionProps> = ({ title, subtitle, stickers, onToggle, readOnly }) => {
  const ownedCount = stickers.filter(s => s.owned).length
  const pct = stickers.length > 0 ? Math.round((ownedCount / stickers.length) * 100) : 0

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{title}</h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>{subtitle ?? `${ownedCount}/${stickers.length}`}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: pct === 100 ? '#4ade80' : '#94a3b8', fontWeight: 700 }}>
            {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} height={4} color={pct === 100 ? '#4ade80' : '#60a5fa'} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px' }}>
        {stickers.map(s => (
          <StickerChip key={s.id} sticker={s} onToggle={onToggle} readOnly={readOnly} />
        ))}
      </div>
    </div>
  )
}

const Stat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{label}</span>
  </div>
)

function bulkBtn(color: string): React.CSSProperties {
  return {
    background: `${color}18`,
    border: `1px solid ${color}55`,
    borderRadius: 6,
    color,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    whiteSpace: 'nowrap',
  }
}