import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sha256 } from '@/utils'
import { db } from '@/db/database'

// Default: admin / padmavati123
// SHA-256 of 'padmavati123'
const DEFAULT_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'

interface AuthState {
  isLoggedIn: boolean
  sessionExpiry: number | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkSession: () => boolean
  changePassword: (newPassword: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      sessionExpiry: null,

      login: async (username: string, password: string): Promise<boolean> => {
        try {
          const hash = await sha256(password)
          const settings = await db.settings.toCollection().first()
          const expectedUser = settings?.username ?? 'admin'
          const expectedHash = settings?.passwordHash ?? DEFAULT_HASH

          if (username === expectedUser && hash === expectedHash) {
            const expiry = Date.now() + 24 * 60 * 60 * 1000 // 24h
            set({ isLoggedIn: true, sessionExpiry: expiry })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      logout: () => {
        set({ isLoggedIn: false, sessionExpiry: null })
      },

      checkSession: (): boolean => {
        const { isLoggedIn, sessionExpiry } = get()
        if (!isLoggedIn || !sessionExpiry) return false
        if (Date.now() > sessionExpiry) {
          set({ isLoggedIn: false, sessionExpiry: null })
          return false
        }
        // Extend session on activity
        set({ sessionExpiry: Date.now() + 24 * 60 * 60 * 1000 })
        return true
      },

      changePassword: async (newPassword: string): Promise<void> => {
        const hash = await sha256(newPassword)
        const s = await db.settings.toCollection().first()
        if (s?.id) {
          await db.settings.update(s.id, { passwordHash: hash, updatedAt: new Date() })
        }
      },
    }),
    {
      name: 'padmavati-auth',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
)
