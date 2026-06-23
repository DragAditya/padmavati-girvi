import { create } from 'zustand'
import { db, getSettings, updateSettings } from '@/db/database'
import type { AppSettings } from '@/types'

interface SettingsState {
  settings: AppSettings | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const s = await getSettings()
      set({ settings: s, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  update: async (partial: Partial<AppSettings>) => {
    try {
      await updateSettings(partial)
      const s = await getSettings()
      set({ settings: s })
    } catch (err) {
      set({ error: String(err) })
      throw err
    }
  },
}))
