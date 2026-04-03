import React from 'react'
import type { StickerCategory } from '../../types'

const COLORS: Record<StickerCategory, string> = {
  team: '#60a5fa',
  player: '#a78bfa',
  badge: '#fbbf24',
  stadium: '#34d399',
  special: '#f472b6',
  gold: '#fcd34d',
  other: '#94a3b8',
}

interface Props {
  category: StickerCategory
  size?: 'sm' | 'md'
}

export const CategoryBadge: React.FC<Props> = ({ category, size = 'sm' }) => (
  <span
    style={{
      background: `${COLORS[category]}22`,
      color: COLORS[category],
      border: `1px solid ${COLORS[category]}55`,
      borderRadius: 4,
      fontSize: size === 'sm' ? 10 : 12,
      fontWeight: 600,
      padding: size === 'sm' ? '1px 5px' : '2px 8px',
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}
  >
    {category}
  </span>
)
