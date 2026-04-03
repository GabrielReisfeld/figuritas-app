import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuthStore()
  const online = useOnlineStatus()
  const location = useLocation()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f0f1a', color: '#f1f5f9' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(15,15,26,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 16px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚽</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9', letterSpacing: -0.3 }}>
            Figuritas
          </span>
        </Link>

        <div style={{ flex: 1 }} />

        {!online && (
          <span
            style={{
              fontSize: 11,
              background: '#f59e0b22',
              color: '#f59e0b',
              border: '1px solid #f59e0b55',
              borderRadius: 4,
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            Sin conexión
          </span>
        )}

        {user ? (
          <button
            onClick={signOut}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 12,
              padding: '4px 12px',
            }}
          >
            Salir
          </button>
        ) : (
          <Link
            to="/auth"
            style={{
              background: '#4ade80',
              border: 'none',
              borderRadius: 6,
              color: '#0f172a',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 12px',
              textDecoration: 'none',
            }}
          >
            Entrar
          </Link>
        )}
      </header>

      {/* Bottom nav */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(15,15,26,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path + '/')) ||
            (item.path !== '/' && location.pathname === item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                textDecoration: 'none',
                color: active ? '#4ade80' : '#64748b',
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, paddingBottom: 68 }}>
        {children}
      </main>
    </div>
  )
}

const NAV_ITEMS = [
  { path: '/',          label: 'Álbumes',   icon: '📚' },
  { path: '/missing',   label: 'Faltantes', icon: '🔍' },
  { path: '/repetidas', label: 'Repetidas', icon: '🔄' },
  { path: '/share',     label: 'Compartir', icon: '🔗' },
]
