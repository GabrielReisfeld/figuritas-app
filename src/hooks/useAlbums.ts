import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { cacheAlbums, getCachedAlbums } from '../lib/idb'
import type { Album } from '../types'

export function useAlbums() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Show cached immediately
      const cached = await getCachedAlbums()
      if (cached.length > 0 && !cancelled) {
        setAlbums(cached.sort((a, b) => a.year - b.year))
        setLoading(false)
      }

      // Then fetch live
      const { data, error: err } = await supabase
        .from('albums')
        .select('*')
        .order('year', { ascending: true })

      if (cancelled) return
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      if (data) {
        await cacheAlbums(data)
        setAlbums(data)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { albums, loading, error }
}
