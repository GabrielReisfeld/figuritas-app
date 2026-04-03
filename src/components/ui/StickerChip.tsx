import React, { memo } from 'react'
import type { StickerWithOwned, StickerCategory } from '../../types'

const CATEGORY_COLOR: Record<StickerCategory, string> = {
  player:  '#4ade80',
  badge:   '#fbbf24',
  team:    '#60a5fa',
  stadium: '#a78bfa',
  special: '#22d3ee',
  gold:    '#fb923c',
  other:   '#94a3b8',
}

interface Props {
  sticker: StickerWithOwned
  onToggle: (sticker: StickerWithOwned) => void
  readOnly?: boolean
}

export const StickerChip: React.FC<Props> = memo(({ sticker, onToggle, readOnly = false }) => {
  const { owned, duplicateCount, category } = sticker
  const color = CATEGORY_COLOR[category]

  const borderColor = owned ? color : `${color}44`
  const bgColor     = owned ? `${color}20` : `${color}08`
  const numColor    = owned ? color : `${color}66`

  return (
    <button
      onClick={() => !readOnly && onToggle(sticker)}
      title={sticker.label}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        background: bgColor,
        cursor: readOnly ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        padding: 0,
        gap: 2,
      }}
      aria-pressed={owned}
      aria-label={`${sticker.label} – ${owned ? 'tengo' : 'falta'}`}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: numColor, lineHeight: 1 }}>
        {sticker.number}
      </span>
      {owned && <span style={{ fontSize: 13, lineHeight: 1 }}>✓</span>}

      {/* Duplicate badge */}
      {duplicateCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: '#f59e0b',
            color: '#0f172a',
            fontSize: 9,
            fontWeight: 800,
            borderRadius: 99,
            padding: '1px 4px',
            lineHeight: 1.4,
            pointerEvents: 'none',
          }}
        >
          +{duplicateCount}
        </span>
      )}
    </button>
  )
})

StickerChip.displayName = 'StickerChip'
