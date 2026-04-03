import React, { useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StickerChip } from '../components/ui/StickerChip'
import { CategoryBadge } from '../components/ui/Badge'
import type { StickerWithOwned, StickerCategory, TeamBreakdown, CategoryBreakdown } from '../types'

const SPECIAL_CATEGORIES: StickerCategory[] = ['badge', 'stadium', 'special', 'gold', 'other']

export const AlbumDetailView: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>()
  const { albums } = useAlbums()
  const album = albums.find(a => a.id === albumId)
  const { stickers, loading } = useStickers(albumId, album?.total_stickers)
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, toggleSticker, enrichStickers, ownedByAlbum } = useCollectionStore()

  useEffect(() => {
    if (user && albumId) {
      loadOwnedForAlbum(user.id, albumId)
    }
  }, [user, albumId, loadOwnedForAlbum])

  const enriched: StickerWithOwned[] = useMemo(
    () => enrichStickers(stickers, albumId ?? ''),
    [stickers, albumId, enrichStickers, ownedByAlbum]  // eslint-disable-line
  )

  const owned = ownedByAlbum[albumId ?? '']?.size ?? 0
  const total = album?.total_stickers ?? 0
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0

  // Team sections
  const teamBreakdowns: TeamBreakdown[] = useMemo(() => {
    const map = new Map<string, StickerWithOwned[]>()
    for (const s of enriched) {
      if (s.team) {
        const arr = map.get(s.team) ?? []
        arr.push(s)
        map.set(s.team, arr)
      }
    }
    return Array.from(map.entries())
      .map(([team, stickers]) => ({
        team,
        stickers,
        owned: stickers.filter(s => s.owned).length,
        total: stickers.length,
      }))
      .sort((a, b) => a.team.localeCompare(b.team))
  }, [enriched])

  // Special category sections
  const categoryBreakdowns: CategoryBreakdown[] = useMemo(() => {
    const map = new Map<StickerCategory, { total: number; owned: number }>()
    for (const s of enriched) {
      if (!s.team) {
        const entry = map.get(s.category) ?? { total: 0, owned: 0 }
        entry.total++
        if (s.owned) entry.owned++
        map.set(s.category, entry)
      }
    }
    return Array.from(map.entries()).map(([category, stats]) => ({ category, ...stats }))
  }, [enriched])

  const handleToggle = useCallback(
    (sticker: StickerWithOwned) => {
      if (!user || !albumId) return
      toggleSticker(user.id, albumId, sticker)
    },
    [user, albumId, toggleSticker]
  )

  if (loading && stickers.length === 0) {
    return <div style={{ padding: 16, color: '#64748b' }}>Loading stickers...</div>
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
            ← Albums
          </Link>
          <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>
            {album?.year} – {album?.name}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: pct === 100 ? '#4ade80' : '#f1f5f9' }}>
            {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} height={8} />
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <Stat label="Owned" value={owned} color="#4ade80" />
          <Stat label="Missing" value={total - owned} color="#f87171" />
          <Stat label="Total" value={total} color="#94a3b8" />
        </div>
      </div>

      {/* Category breakdown */}
      {categoryBreakdowns.length > 0 && (
        <SectionGroup title="Special Categories">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px' }}>
            {categoryBreakdowns.map(cb => (
              <div
                key={cb.category}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CategoryBadge category={cb.category} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {cb.owned}/{cb.total}
                </span>
              </div>
            ))}
          </div>
        </SectionGroup>
      )}

      {/* Non-team stickers */}
      {categoryBreakdowns.some(cb => cb.total > 0) && (
        <>
          {SPECIAL_CATEGORIES.map(cat => {
            const catStickers = enriched.filter(s => !s.team && s.category === cat)
            if (catStickers.length === 0) return null
            return (
              <StickerSection
                key={cat}
                title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                stickers={catStickers}
                onToggle={handleToggle}
                readOnly={!user}
              />
            )
          })}
        </>
      )}

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
          <Link to="/auth" style={{ color: '#4ade80' }}>Sign in</Link> to track your collection
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginTop: 20 }}>
    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', padding: '0 16px', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {title}
    </h2>
    {children}
  </div>
)

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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '0 16px',
        }}
      >
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
