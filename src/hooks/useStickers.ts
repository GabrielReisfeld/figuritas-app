import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { cacheStickers, getCachedStickers } from '../lib/idb'
import type { Sticker, StickerCategory } from '../types'

/** Numeric-aware sort for sticker numbers like "10", "QAT10", "FWC2" */
function compareStickerNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}

/** Fills in placeholder stickers for any gap between defined and total */
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
  const all = [...stickers, ...placeholders]
  all.sort((a, b) => compareStickerNumbers(a.number, b.number))
  return all
}

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
        const sorted = [...cached].sort((a, b) => compareStickerNumbers(a.number, b.number))
        setStickers(fillPlaceholders(sorted, albumId as string, totalStickers))
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
        const sorted = [...data].sort((a, b) => compareStickerNumbers(a.number, b.number))
        setStickers(fillPlaceholders(sorted, albumId as string, totalStickers))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [albumId, totalStickers])

  return { stickers, loading, error }
}

