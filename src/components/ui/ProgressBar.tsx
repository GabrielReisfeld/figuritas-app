import React from 'react'

interface Props {
  pct: number
  height?: number
  color?: string
}

export const ProgressBar: React.FC<Props> = ({ pct, height = 6, color = '#4ade80' }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: height,
      height,
      overflow: 'hidden',
      width: '100%',
    }}
  >
    <div
      style={{
        background: color,
        borderRadius: height,
        height: '100%',
        width: `${Math.min(100, pct)}%`,
        transition: 'width 0.3s ease',
      }}
    />
  </div>
)
