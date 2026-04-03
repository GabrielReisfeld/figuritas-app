/**
 * Background sync: flush queued offline changes to Supabase when online.
 */
import { supabase } from './supabase'
import {
  getPendingChanges,
  deletePendingChange,
} from './idb'

export async function syncPendingChanges(collectionId: string) {
  const changes = await getPendingChanges()
  if (changes.length === 0) return

  for (const change of changes) {
    try {
      if (change.action === 'add') {
        const { error } = await supabase
          .from('user_stickers')
          .upsert({ user_collection_id: collectionId, sticker_id: change.sticker_id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_stickers')
          .delete()
          .eq('user_collection_id', collectionId)
          .eq('sticker_id', change.sticker_id)
        if (error) throw error
      }
      await deletePendingChange(change.id)
    } catch (err) {
      // Leave in queue; will retry next sync
      console.warn('[sync] Failed to sync change', change.id, err)
    }
  }
}

export function registerOnlineListener(onSync: () => void) {
  window.addEventListener('online', onSync)
  return () => window.removeEventListener('online', onSync)
}
