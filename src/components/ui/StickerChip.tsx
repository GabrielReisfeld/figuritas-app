import React, { memo } from 'react'
import type { StickerWithOwned } from '../../types'

interface Props {
  sticker: StickerWithOwned
  onToggle: (sticker: StickerWithOwned) => void
  readOnly?: boolean
}

export const StickerChip: React.FC<Props> = memo(({ sticker, onToggle, readOnly = false }) => {
  const owned = sticker.owned

  return (
    <button
      onClick={() => !readOnly && onToggle(sticker)}
      title={sticker.label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        borderRadius: 8,
        border: owned ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.15)',
        background: owned ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
        cursor: readOnly ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        padding: 0,
        gap: 2,
      }}
      aria-pressed={owned}
      aria-label={`${sticker.label} – ${owned ? 'owned' : 'missing'}`}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: owned ? '#4ade80' : 'rgba(255,255,255,0.5)',
          lineHeight: 1,
        }}
      >
        {sticker.number}
      </span>
      {owned && (
        <span style={{ fontSize: 14, lineHeight: 1 }}>✓</span>
      )}
    </button>
  )
})

StickerChip.displayName = 'StickerChip'
