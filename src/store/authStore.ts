import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  init: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signUpWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
