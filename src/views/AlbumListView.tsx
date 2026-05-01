import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import { ProgressBar } from '../components/ui/ProgressBar'
import type { AlbumWithStats } from '../types'
import { albumFlags } from '../lib/flags'

export const AlbumListView: React.FC = () => {
  const { albums, loading } = useAlbums()
  const { user } = useAuthStore()
  const { enrichAlbums, loadOwnedForAlbum } = useCollectionStore()

  useEffect(() => {
    if (!user) return
    for (const album of albums) {
      loadOwnedForAlbum(user.id, album.id)
    }
  }, [albums, user, loadOwnedForAlbum])

  const enriched: AlbumWithStats[] = enrichAlbums(albums, user?.id ?? null)

  if (loading && albums.length === 0) {
    return <LoadingSkeleton />
  }

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Álbumes del Mundial</h1>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>2002 – 2026</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {enriched.map(album => (
          <AlbumCard key={album.id} album={album} isLoggedIn={!!user} />
        ))}
      </div>
    </div>
  )
}

const AlbumCard: React.FC<{ album: AlbumWithStats; isLoggedIn: boolean }> = ({ album, isLoggedIn }) => (
  <Link to={`/album/${album.id}`} style={{ textDecoration: 'none' }}>
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '16px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{album.year}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{album.name}</span>
            {albumFlags(album.name) && (
              <span style={{ fontSize: 16 }}>{albumFlags(album.name)}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {album.total_stickers} figuritas
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: album.pct === 100 ? '#4ade80' : '#f1f5f9' }}>
            {album.pct}%
          </div>
        </div>
      </div>

      <ProgressBar pct={album.pct} />

      {isLoggedIn && (
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <Stat label="Tengo" value={album.owned} color="#4ade80" />
          <Stat label="Faltan" value={album.missing} color="#f87171" />
          <Stat label="Total" value={album.total_stickers} color="#94a3b8" />
          {album.totalDuplicates > 0 && (
            <Stat label="Repetidas" value={album.totalDuplicates} color="#f59e0b" />
          )}
        </div>
      )}
    </div>
  </Link>
)

const Stat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <span style={{ fontSize: 15, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{label}</span>
  </div>
)

const LoadingSkeleton: React.FC = () => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14,
          height: 90,
          animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 1 - i * 0.12,
        }}
      />
    ))}
  </div>
)
