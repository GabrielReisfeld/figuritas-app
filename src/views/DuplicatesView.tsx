import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAlbums } from '../hooks/useAlbums'
import { useStickers } from '../hooks/useStickers'
import { useCollectionStore } from '../store/collectionStore'
import { useAuthStore } from '../store/authStore'
import type { StickerWithOwned } from '../types'
import { teamFlag } from '../lib/flags'

export const DuplicatesView: React.FC = () => {
  const { albums } = useAlbums()
  const { user } = useAuthStore()
  const { loadOwnedForAlbum, enrichStickers, ownedByAlbum, duplicatesByAlbum, setDuplicateCount, pushLocalDuplicatesToServer } = useCollectionStore()

  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'ok' | 'error' | null>(null)

  const effectiveAlbumId = selectedAlbumId || albums[albums.length - 1]?.id || ''
  const album = albums.find(a => a.id === effectiveAlbumId)
  const { stickers } = useStickers(effectiveAlbumId || undefined, album?.total_stickers)

  useEffect(() => {
    if (user && effectiveAlbumId) {
      setDirty(false)
      loadOwnedForAlbum(user.id, effectiveAlbumId)
    }
  }, [user, effectiveAlbumId, loadOwnedForAlbum])

  const enriched = useMemo(
    () => enrichStickers(stickers, effectiveAlbumId),
    [stickers, effectiveAlbumId, enrichStickers, ownedByAlbum, duplicatesByAlbum]  // eslint-disable-line
  )

  const owned: StickerWithOwned[] = useMemo(
    () => enriched.filter(s => s.owned),
    [enriched]
  )

  const withDuplicates = useMemo(
    () => enriched.filter(s => s.owned && s.duplicateCount > 0),
    [enriched]
  )

  const totalDups = useMemo(
    () => withDuplicates.reduce((sum, s) => sum + s.duplicateCount, 0),
    [withDuplicates]
  )

  const handleChange = (sticker: StickerWithOwned, delta: number) => {
    if (!user || !effectiveAlbumId) return
    const next = Math.max(0, sticker.duplicateCount + delta)
    setDuplicateCount(user.id, effectiveAlbumId, sticker, next)
    setDirty(true)
    setSaveResult(null)
  }

  const handleSave = async () => {
    if (!user || !effectiveAlbumId) return
    setSaving(true)
    setSaveResult(null)
    try {
      await pushLocalDuplicatesToServer(user.id, effectiveAlbumId)
      setDirty(false)
      setSaveResult('ok')
    } catch {
      setSaveResult('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveResult(null), 3000)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <p style={{ marginBottom: 12 }}>Iniciá sesión para gestionar repetidas</p>
        <Link to="/auth" style={{ color: '#4ade80', fontWeight: 700 }}>Entrar</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Repetidas</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Usá + / − para registrar cuántas copias extra tenés de cada figurita
      </p>

      <select value={effectiveAlbumId} onChange={e => setSelectedAlbumId(e.target.value)} style={selectStyle}>
        {albums.map(a => <option key={a.id} value={a.id}>{a.year} – {a.name}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 16, margin: '16px 0', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{owned.length}</span>
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>figuritas tenidas</span>
        </div>
        <div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{totalDups}</span>
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>repetidas en total</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: dirty ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${dirty ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6,
              color: dirty ? '#4ade80' : '#475569',
              cursor: saving || !dirty ? 'default' : 'pointer',
              padding: '4px 10px',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saveResult === 'ok' && <span style={{ fontSize: 11, color: '#4ade80' }}>✓ Guardado</span>}
          {saveResult === 'error' && <span style={{ fontSize: 11, color: '#f87171' }}>Error al guardar</span>}
        </div>
      </div>

      {/* Owned stickers — all, sorted by album order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {owned.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 32, fontSize: 14 }}>
            No tenés figuritas marcadas en este álbum
          </div>
        )}
        {owned.map(s => (
          <div
            key={s.id}
            style={{
              background: s.duplicateCount > 0 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${s.duplicateCount > 0 ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', minWidth: 44 }}>{s.number}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
              {s.team && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{teamFlag(s.team)} {s.team}</div>}
            </div>
            {/* Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button onClick={() => handleChange(s, -1)} disabled={s.duplicateCount === 0} style={counterBtn(s.duplicateCount === 0)}>−</button>
              <span style={{ fontSize: 14, fontWeight: 800, color: s.duplicateCount > 0 ? '#f59e0b' : '#64748b', minWidth: 20, textAlign: 'center' }}>
                {s.duplicateCount}
              </span>
              <button onClick={() => handleChange(s, +1)} style={counterBtn(false)}>+</button>
            </div>
          </div>
        ))}
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

function counterBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
    color: disabled ? '#334155' : '#f1f5f9',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 16,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  }
}
