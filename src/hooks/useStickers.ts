import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { cacheStickers, getCachedStickers } from '../lib/idb'
import type { Sticker, StickerCategory } from '../types'

// ─── 2022 Qatar album section order ──────────────────────────────────────────
// FWC appears twice: FWC1-18 (cover/stadiums) and FWC19-29 (FIFA museum)
const SECTIONS_2022: Array<{ prefix: string; min: number; max: number }> = [
  { prefix: '00',  min: 0,  max: 0  },  // sticker "00"
  { prefix: 'FWC', min: 1,  max: 18 },
  { prefix: 'QAT', min: 1,  max: 20 },
  { prefix: 'ECU', min: 1,  max: 20 },
  { prefix: 'SEN', min: 1,  max: 20 },
  { prefix: 'NED', min: 1,  max: 20 },
  { prefix: 'ENG', min: 1,  max: 20 },
  { prefix: 'IRN', min: 1,  max: 20 },
  { prefix: 'USA', min: 1,  max: 20 },
  { prefix: 'WAL', min: 1,  max: 20 },
  { prefix: 'ARG', min: 1,  max: 20 },
  { prefix: 'KSA', min: 1,  max: 20 },
  { prefix: 'MEX', min: 1,  max: 20 },
  { prefix: 'POL', min: 1,  max: 20 },
  { prefix: 'FRA', min: 1,  max: 20 },
  { prefix: 'AUS', min: 1,  max: 20 },
  { prefix: 'DEN', min: 1,  max: 20 },
  { prefix: 'TUN', min: 1,  max: 20 },
  { prefix: 'ESP', min: 1,  max: 20 },
  { prefix: 'CRC', min: 1,  max: 20 },
  { prefix: 'GER', min: 1,  max: 20 },
  { prefix: 'JPN', min: 1,  max: 20 },
  { prefix: 'BEL', min: 1,  max: 20 },
  { prefix: 'CAN', min: 1,  max: 20 },
  { prefix: 'MAR', min: 1,  max: 20 },
  { prefix: 'CRO', min: 1,  max: 20 },
  { prefix: 'BRA', min: 1,  max: 20 },
  { prefix: 'SRB', min: 1,  max: 20 },
  { prefix: 'SUI', min: 1,  max: 20 },
  { prefix: 'CMR', min: 1,  max: 20 },
  { prefix: 'POR', min: 1,  max: 20 },
  { prefix: 'GHA', min: 1,  max: 20 },
  { prefix: 'URU', min: 1,  max: 20 },
  { prefix: 'KOR', min: 1,  max: 20 },
  { prefix: 'FWC', min: 19, max: 29 }, // FIFA museum
]

function getSortIndex2022(number: string): number {
  if (number === '00') return 0
  const match = number.match(/^([A-Z]+)(\d+)$/)
  if (!match) return 99999
  const prefix = match[1]
  const num = parseInt(match[2])
  for (let i = 0; i < SECTIONS_2022.length; i++) {
    const s = SECTIONS_2022[i]
    if (s.prefix === prefix && num >= s.min && num <= s.max) {
      return i * 100 + num
    }
  }
  return 99999
}

// ─── Generic sort ─────────────────────────────────────────────────────────────

function sortStickers(stickers: Sticker[], albumId: string): Sticker[] {
  const is2022 = albumId === 'a2022000-0000-0000-0000-000000000000'
  return [...stickers].sort((a, b) => {
    if (is2022) return getSortIndex2022(a.number) - getSortIndex2022(b.number)
    return a.number.localeCompare(b.number, undefined, { numeric: true })
  })
}

// ─── Placeholder fill ─────────────────────────────────────────────────────────

function fillPlaceholders(stickers: Sticker[], albumId: string, total: number): Sticker[] {
  if (stickers.length >= total) return stickers
  const defined = new Set(stickers.map(s => s.number))
  const placeholders: Sticker[] = []
  let n = 1
  while (stickers.length + placeholders.length < total) {
    const num = String(n)
    if (!defined.has(num)) {
      placeholders.push({
        id: `placeholder-${albumId}-${num}`,
        album_id: albumId,
        number: num,
        label: `#${num}`,
        team: null,
        category: 'other' as StickerCategory,
      })
    }
    n++
  }
  return sortStickers([...stickers, ...placeholders], albumId)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStickers(albumId: string | undefined, totalStickers = 0) {
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!albumId) return
    let cancelled = false

    async function load() {
      const cached = await getCachedStickers(albumId as string)
      if (cached.length > 0 && !cancelled) {
        setStickers(fillPlaceholders(sortStickers(cached, albumId as string), albumId as string, totalStickers))
        setLoading(false)
      }

      const { data, error: err } = await supabase
        .from('stickers')
        .select('*')
        .eq('album_id', albumId)

      if (cancelled) return
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      if (data) {
        await cacheStickers(data)
        setStickers(fillPlaceholders(sortStickers(data, albumId as string), albumId as string, totalStickers))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [albumId, totalStickers])

  return { stickers, loading, error }
}
