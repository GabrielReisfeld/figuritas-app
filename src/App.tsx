import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AlbumListView } from './views/AlbumListView'
import { AlbumDetailView } from './views/AlbumDetailView'
import { MissingView } from './views/MissingView'
import { DuplicatesView } from './views/DuplicatesView'
import { ShareView, SharedAlbumView } from './views/ShareView'
import { AuthView } from './views/AuthView'
import { useAuthStore } from './store/authStore'
import { useCollectionStore } from './store/collectionStore'
import { syncPendingChanges, registerOnlineListener } from './lib/sync'

export default function App() {
  const { init, user } = useAuthStore()
  const { collectionIds } = useCollectionStore()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!user) return
    async function doSync() {
      for (const collectionId of Object.values(collectionIds)) {
        if (collectionId) {
          await syncPendingChanges(collectionId)
        }
      }
    }
    const cleanup = registerOnlineListener(doSync)
    return cleanup
  }, [user, collectionIds])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/shared/:albumId" element={<AppShell><SharedAlbumView /></AppShell>} />
        <Route path="/*" element={
          <AppShell>
            <Routes>
              <Route index element={<AlbumListView />} />
              <Route path="album/:albumId" element={<AlbumDetailView />} />
              <Route path="missing" element={<MissingView />} />
              <Route path="repetidas" element={<DuplicatesView />} />
              <Route path="share" element={<ShareView />} />
              <Route path="auth" element={<AuthView />} />
            </Routes>
          </AppShell>
        } />
      </Routes>
    </BrowserRouter>
  )
}
