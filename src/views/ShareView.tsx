import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { StickerChip } from '../components/ui/StickerChip'
import type { StickerWithOwned } from '../types'
import { CODE_FLAGS, teamFlag } from '../lib/flags'

interface CountryGroupItem { label: string; category: string }
interface CountryGroup { country: string; icon: string; items: CountryGroupItem[] }

const CATEGORY_COLOR: Record<string, string> = {
  player:      '#4ade80',
  badge:       '#fbbf24',
  team:        '#60a5fa',
  stadium:     '#a78bfa',
  special:     '#22d3ee',
  gold:        '#fb923c',
  other:       '#94a3b8',
  'coca-cola': '#ef4444',
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  special:      { label: 'Especiales', icon: '⭐' },
  stadium:      { label: 'Estadios',   icon: '🏟️' },
  gold:         { label: 'Doradas',    icon: '✨' },
  badge:        { label: 'Escudos',    icon: '🛡️' },
  team:         { label: 'Equipos',    icon: '👕' },
  other:        { label: 'Otros',      icon: '🎴' },
  'coca-cola':  { label: 'Coca-Cola',  icon: '🥤' },
}

function addToMap(
  map: Map<string, { icon: string; items: CountryGroupItem[] }>,
  key: string, icon: string, label: string, category: string,
) {
  if (!map.has(key)) map.set(key, { icon, items: [] })
  map.get(key)!.items.push({ label, category })
}

function toGroups(map: Map<string, { icon: string; items: CountryGroupItem[] }>): CountryGroup[] {
  return Array.from(map.entries()).map(([country, { icon, items }]) => ({ country, icon, items }))
}

function dupStr(s: StickerWithOwned, showDupCount: boolean) {
  return showDupCount && s.duplicateCount > 1 ? ` (x${s.duplicateCount})` : ''
}

// For 2022/2026: group by letter prefix in number; fallback to category
function groupByCountry(stickers: StickerWithOwned[], showDupCount = false): CountryGroup[] {
  const map = new Map<string, { icon: string; items: CountryGroupItem[] }>()
  for (const s of stickers) {
    const code = s.number.match(/^[A-Z]+/)?.[0]
    if (code && CODE_FLAGS[code]) {
      addToMap(map, code, CODE_FLAGS[code], s.number.replace(/^[A-Z]+/, '') + dupStr(s, showDupCount), s.category)
    } else {
      const m = CATEGORY_META[s.category] ?? { label: 'Otros', icon: '🎴' }
      addToMap(map, m.label, m.icon, s.number + dupStr(s, showDupCount), s.category)
    }
  }
  return toGroups(map)
}

// For 2002–2018: group by team field; fallback to category
function groupByTeam(stickers: StickerWithOwned[], showDupCount = false): CountryGroup[] {
  const map = new Map<string, { icon: string; items: CountryGroupItem[] }>()
  for (const s of stickers) {
    if (s.team) {
      addToMap(map, s.team, teamFlag(s.team) || '🌍', s.number + dupStr(s, showDupCount), s.category)
    } else {
      const m = CATEGORY_META[s.category] ?? { label: 'Otros', icon: '🎴' }
      addToMap(map, m.label, m.icon, s.number + dupStr(s, showDupCount), s.category)
    }
  }
  return toGroups(map)
}

function buildCountryMessage(albumYear: number | string, type: 'faltantes' | 'repetidas', groups: CountryGroup[]): string {
  const header = type === 'faltantes'
    ? `Me faltan las siguientes figuritas del Álbum del Mundial ${albumYear}:`
    : `Tengo las siguientes figuritas repetidas del Álbum del Mundial ${albumYear}:`
  return `${header}\n${groups.map(g => `${g.icon} ${g.country}: ${g.items.map(i => i.label).join(', ')}`).join('\n')}`
}

// ─── Share view ───────────────────────────────────────────────────────────────

export const ShareView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, ownedByAlbum, duplicatesByAlbum, enrichStickers } = useCollectionStore()
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const effectiveAlbumId = selectedAlbumId || albums[albums.length - 1]?.id || ''
  const album = albums.find(a => a.id === effectiveAlbumId)
  const { stickers } = useStickers(effectiveAlbumId || undefined, album?.total_stickers)

  useEffect(() => {
    if (user && effectiveAlbumId) loadOwnedForAlbum(user.id, effectiveAlbumId)
  }, [user, effectiveAlbumId, loadOwnedForAlbum])

  const enriched = useMemo(
    () => enrichStickers(stickers, effectiveAlbumId),
    [stickers, effectiveAlbumId, enrichStickers, ownedByAlbum, duplicatesByAlbum]  // eslint-disable-line
  )

  const ownedIds = Array.from(ownedByAlbum[effectiveAlbumId] ?? [])

  const missingList = useMemo(() => enriched.filter(s => !s.owned), [enriched])
  const dupList = useMemo(() => enriched.filter(s => s.owned && s.duplicateCount > 0), [enriched])

  const hasCountryCodes = useMemo(() => enriched.some(s => /^[A-Z]/.test(s.number)), [enriched])
  const hasTeamData = useMemo(() => enriched.some(s => !!s.team), [enriched])
  const hasCountryView = hasCountryCodes || hasTeamData

  const missingMessage = useMemo(() => {
    if (!album || missingList.length === 0) return ''
    return `Me faltan las siguientes figuritas del Álbum del Mundial ${album.year}:\n${missingList.map(s => s.number).join(', ')}`
  }, [album, missingList])

  const dupMessage = useMemo(() => {
    if (!album || dupList.length === 0) return ''
    const parts = dupList.map(s => `${s.number}${s.duplicateCount > 1 ? ` (x${s.duplicateCount})` : ''}`)
    return `Tengo las siguientes figuritas repetidas del Álbum del Mundial ${album.year}:\n${parts.join(', ')}`
  }, [album, dupList])

  const missingGroups = useMemo(() => {
    if (!hasCountryView) return []
    return hasCountryCodes ? groupByCountry(missingList) : groupByTeam(missingList)
  }, [hasCountryView, hasCountryCodes, missingList])

  const dupGroups = useMemo(() => {
    if (!hasCountryView) return []
    return hasCountryCodes ? groupByCountry(dupList, true) : groupByTeam(dupList, true)
  }, [hasCountryView, hasCountryCodes, dupList])

  const missingCountryMsg = useMemo(
    () => album && missingGroups.length > 0 ? buildCountryMessage(album.year, 'faltantes', missingGroups) : '',
    [album, missingGroups]
  )

  const dupCountryMsg = useMemo(
    () => album && dupGroups.length > 0 ? buildCountryMessage(album.year, 'repetidas', dupGroups) : '',
    [album, dupGroups]
  )

  async function copyText(text: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
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

      <select value={effectiveAlbumId} onChange={e => setSelectedAlbumId(e.target.value)} style={selectStyle}>
        {albums.map(a => <option key={a.id} value={a.id}>{a.year} – {a.name}</option>)}
      </select>

      <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
        {ownedIds.length} de {album?.total_stickers ?? 0} figuritas tenidas
        {dupList.length > 0 && ` · ${dupList.reduce((s, x) => s + x.duplicateCount, 0)} repetidas`}
      </div>

      <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: 10, marginTop: 20, alignItems: isDesktop ? 'flex-start' : 'stretch' }}>

        {missingMessage && (
          <ShareCard
            label="Compartir faltantes"
            labelColor="#f87171"
            stickers={missingList}
            message={missingMessage}
            countryMessage={missingCountryMsg}
            countryGroups={hasCountryView ? missingGroups : undefined}
            onCopy={copyText}
            onShare={shareNative}
            copied={copied}
            isDesktop={isDesktop}
          />
        )}

        {dupMessage && (
          <ShareCard
            label="Compartir repetidas"
            labelColor="#f59e0b"
            stickers={dupList}
            message={dupMessage}
            countryMessage={dupCountryMsg}
            countryGroups={hasCountryView ? dupGroups : undefined}
            onCopy={copyText}
            onShare={shareNative}
            copied={copied}
            isDesktop={isDesktop}
          />
        )}

      </div>
    </div>
  )
}

// ─── Share card ───────────────────────────────────────────────────────────────

interface ShareCardProps {
  label: string
  labelColor: string
  stickers: StickerWithOwned[]
  message: string
  countryMessage?: string
  countryGroups?: CountryGroup[]
  onCopy: (text: string) => void
  onShare: (text: string) => void
  copied: boolean
  isDesktop?: boolean
}

const ShareCard: React.FC<ShareCardProps> = ({
  label, labelColor, stickers, message, countryMessage, countryGroups, onCopy, onShare, copied, isDesktop,
}) => {
  const [tab, setTab] = useState<'list' | 'country'>(
    () => (countryGroups && countryGroups.length > 0) ? 'country' : 'list'
  )
  const hasCountry = countryGroups && countryGroups.length > 0
  const activeMessage = tab === 'country' && countryMessage ? countryMessage : message
  const dynPreviewStyle: React.CSSProperties = isDesktop
    ? { ...previewStyle, maxHeight: 'none', overflow: 'visible' }
    : previewStyle

  return (
    <div style={{ ...cardStyle, ...(isDesktop ? { flex: 1 } : {}) }}>
      <p style={{ fontSize: 15, color: labelColor, marginBottom: 10, fontWeight: 700 }}>{label}</p>

      {hasCountry && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          <button onClick={() => setTab('list')} style={tabStyle(tab === 'list')}>Lista</button>
          <button onClick={() => setTab('country')} style={tabStyle(tab === 'country')}>Por país</button>
        </div>
      )}

      {tab === 'list' || !hasCountry ? (
        <div style={dynPreviewStyle}>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>{message.split('\n')[0]}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px 0', lineHeight: '1.9' }}>
            {stickers.map((s, i) => (
              <span key={s.id}>
                <span style={{ color: CATEGORY_COLOR[s.category] ?? '#94a3b8', fontSize: 11, fontWeight: 600 }}>
                  {s.number}{s.duplicateCount > 1 ? ` (x${s.duplicateCount})` : ''}
                </span>
                {i < stickers.length - 1 && <span style={{ color: '#475569', fontSize: 11 }}>, </span>}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ ...dynPreviewStyle, whiteSpace: 'normal' }}>
          {countryGroups!.map(g => (
            <div key={g.country} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 17, lineHeight: '1.3', flexShrink: 0 }}>{g.icon}</span>
              <div style={{ fontSize: 12, lineHeight: '1.6' }}>
                <span style={{ fontWeight: 700, color: '#94a3b8' }}>{g.country} </span>
                {g.items.map((item, i) => (
                  <span key={i}>
                    <span style={{ color: CATEGORY_COLOR[item.category] ?? '#94a3b8', fontWeight: 600 }}>
                      {item.label}
                    </span>
                    {i < g.items.length - 1 && <span style={{ color: '#475569' }}>, </span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onCopy(activeMessage)} style={{ ...btnStyle('#4ade80'), flex: 1 }}>
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button onClick={() => onShare(activeMessage)} style={{ ...btnStyle('#60a5fa'), flex: 1 }}>
            ↗ Compartir
          </button>
        )}
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

const previewStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#94a3b8',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  background: 'rgba(0,0,0,0.2)',
  borderRadius: 8,
  padding: 10,
  margin: '0 0 10px',
  maxHeight: 200,
  overflow: 'auto',
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 8,
    color: active ? '#f1f5f9' : '#64748b',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: active ? 700 : 400,
    padding: '5px 12px',
  }
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
