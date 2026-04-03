export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      albums: {
        Row: {
          id: string
          year: number
          name: string
          total_stickers: number
        }
        Insert: {
          id?: string
          year: number
          name: string
          total_stickers: number
        }
        Update: {
          id?: string
          year?: number
          name?: string
          total_stickers?: number
        }
      }
      stickers: {
        Row: {
          id: string
          album_id: string
          number: string
          label: string
          team: string | null
          category: string
        }
        Insert: {
          id?: string
          album_id: string
          number: string
          label: string
          team?: string | null
          category: string
        }
        Update: {
          id?: string
          album_id?: string
          number?: string
          label?: string
          team?: string | null
          category?: string
        }
      }
      user_collections: {
        Row: {
          id: string
          user_id: string
          album_id: string
        }
        Insert: {
          id?: string
          user_id: string
          album_id: string
        }
        Update: {
          id?: string
          user_id?: string
          album_id?: string
        }
      }
      user_stickers: {
        Row: {
          id: string
          user_collection_id: string
          sticker_id: string
        }
        Insert: {
          id?: string
          user_collection_id: string
          sticker_id: string
        }
        Update: {
          id?: string
          user_collection_id?: string
          sticker_id?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      sticker_category: 'team' | 'player' | 'badge' | 'stadium' | 'special' | 'gold' | 'other'
    }
  }
}
