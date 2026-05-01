import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { StickerChip } from '../components/ui/StickerChip'
import type { StickerWithOwned } from '../types'

// ─── Country helpers ──────────────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  ALG: '🇩🇿', ARG: '🇦🇷', AUS: '🇦🇺', BEL: '🇧🇪',
  BIH: '🇧🇦', BOL: '🇧🇴', BRA: '🇧🇷', CAN: '🇨🇦',
  CHI: '🇨🇱', CIV: '🇨🇮', CMR: '🇨🇲', COL: '🇨🇴',
  CRC: '🇨🇷', CRO: '🇭🇷', CZE: '🇨🇿', DEN: '🇩🇰',
  ECU: '🇪🇨', EGY: '🇪🇬', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸',
  FRA: '🇫🇷', FWC: '🏆',
  GER: '🇩🇪', GHA: '🇬🇭', GRE: '🇬🇷',
  IRA: '🇮🇷', IRN: '🇮🇷', IRQ: '🇮🇶', ITA: '🇮🇹',
  JAP: '🇯🇵', JOR: '🇯🇴', JPN: '🇯🇵',
  KOR: '🇰🇷', KSA: '🇸🇦',
  MAR: '🇲🇦', MEX: '🇲🇽', MOR: '🇲🇦',
  NED: '🇳🇱', NGA: '🇳🇬',
  PAR: '🇵🇾', PER: '🇵🇪', POL: '🇵🇱', POR: '🇵🇹',
  QAT: '🇶🇦', ROU: '🇷🇴', RSA: '🇿🇦',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', SEN: '🇸🇳', SRB: '🇷🇸', SUI: '🇨🇭', SVK: '🇸🇰', SVN: '🇸🇮',
  TUN: '🇹🇳', TUR: '🇹🇷',
  UAE: '🇦🇪', UKR: '🇺🇦', URU: '🇺🇾', USA: '🇺🇸',
  VEN: '🇻🇪', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

interface CountryGroup { country: string; icon: string; nums: string[] }

function groupByCountry(stickers: StickerWithOwned[], showDupCount = false): CountryGroup[] {
  const map = new Map<string, string[]>()
  for (const s of stickers) {
    const code = s.number.match(/^[A-Z]+/)?.[0]
    if (!code) continue
    if (!map.has(code)) map.set(code, [])
    const num = s.number.replace(/^[A-Z]+/, '')
    map.get(code)!.push(num + (showDupCount && s.duplicateCount > 1 ? ` (x${s.duplicateCount})` : ''))
  }
  return Array.from(map.entries()).map(([country, nums]) => ({
    country,
    icon: FLAGS[country] ?? '🌍',
    nums,
  }))
}

function buildCountryMessage(albumYear: number | string, type: 'faltantes' | 'repetidas', groups: CountryGroup[]): string {
  const header = type === 'faltantes'
    ? `Me faltan las siguientes figuritas del Álbum del Mundial ${albumYear}:`
    : `Tengo las siguientes figuritas repetidas del Álbum del Mundial ${albumYear}:`
  return `${header}\n${groups.map(g => `${g.icon} ${g.country}: ${g.nums.join(', ')}`).join('\n')}`
}

// ─── Share view ───────────────────────────────────────────────────────────────

export const ShareView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, ownedByAlbum, duplicatesByAlbum, enrichStickers } = useCollectionStore()
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [copied, setCopied] = useState(false)

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

  const missingMessage = useMemo(() => {
    if (!album || missingList.length === 0) return ''
    return `Me faltan las siguientes figuritas del Álbum del Mundial ${album.year}:\n${missingList.map(s => s.number).join(', ')}`
  }, [album, missingList])

  const dupMessage = useMemo(() => {
    if (!album || dupList.length === 0) return ''
    const parts = dupList.map(s => `${s.number}${s.duplicateCount > 1 ? ` (x${s.duplicateCount})` : ''}`)
    return `Tengo las siguientes figuritas repetidas del Álbum del Mundial ${album.year}:\n${parts.join(', ')}`
  }, [album, dupList])

  const missingGroups = useMemo(
    () => hasCountryCodes ? groupByCountry(missingList) : [],
    [hasCountryCodes, missingList]
  )

  const dupGroups = useMemo(
    () => hasCountryCodes ? groupByCountry(dupList, true) : [],
    [hasCountryCodes, dupList]
  )

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

        {missingMessage && (
          <ShareCard
            label="Compartir faltantes"
            message={missingMessage}
            countryMessage={missingCountryMsg}
            countryGroups={hasCountryCodes ? missingGroups : undefined}
            onCopy={copyText}
            onShare={shareNative}
            copied={copied}
          />
        )}

        {dupMessage && (
          <ShareCard
            label="Compartir repetidas"
            message={dupMessage}
            countryMessage={dupCountryMsg}
            countryGroups={hasCountryCodes ? dupGroups : undefined}
            onCopy={copyText}
            onShare={shareNative}
            copied={copied}
          />
        )}

      </div>
    </div>
  )
}

// ─── Share card ───────────────────────────────────────────────────────────────

interface ShareCardProps {
  label: string
  message: string
  countryMessage?: string
  countryGroups?: CountryGroup[]
  onCopy: (text: string) => void
  onShare: (text: string) => void
  copied: boolean
}

const ShareCard: React.FC<ShareCardProps> = ({
  label, message, countryMessage, countryGroups, onCopy, onShare, copied,
}) => {
  const [tab, setTab] = useState<'list' | 'country'>('list')
  const hasCountry = countryGroups && countryGroups.length > 0
  const activeMessage = tab === 'country' && countryMessage ? countryMessage : message

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>{label}</p>

      {hasCountry && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          <button onClick={() => setTab('list')} style={tabStyle(tab === 'list')}>Lista</button>
          <button onClick={() => setTab('country')} style={tabStyle(tab === 'country')}>Por país</button>
        </div>
      )}

      {tab === 'list' || !hasCountry ? (
        <pre style={previewStyle}>{message}</pre>
      ) : (
        <div style={{ ...previewStyle, whiteSpace: 'normal' }}>
          {countryGroups!.map(g => (
            <div key={g.country} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 17, lineHeight: '1.3', flexShrink: 0 }}>{g.icon}</span>
              <div style={{ fontSize: 12, lineHeight: '1.5' }}>
                <span style={{ fontWeight: 700, color: '#94a3b8' }}>{g.country} </span>
                <span style={{ color: '#cbd5e1' }}>{g.nums.join(', ')}</span>
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
