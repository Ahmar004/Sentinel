import { create } from 'zustand'
import type { Credentials, User } from '@/domain/types'
import type { Role } from '@/domain/constants'
import { getSentinelClient } from './clientRegistry'

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'error'

export interface SessionState {
  user: User | null
  role: Role | null
  status: SessionStatus
  error: string | null
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

/**
 * FR10: authentication and the one session object every role-dependent
 * decision derives from. Components read `role` from here (or from the
 * `useCurrentRole` selector below), never from a locally re-derived guess.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  role: null,
  status: 'idle',
  error: null,

  login: async (credentials) => {
    set({ status: 'loading', error: null })
    try {
      const session = await getSentinelClient().login(credentials)
      set({ user: session.user, role: session.user.role, status: 'authenticated', error: null })
    } catch (err) {
      // FR10.1: an error must not disclose which field was wrong.
      set({
        user: null,
        role: null,
        status: 'error',
        error: err instanceof Error ? err.message : 'Sign in failed.',
      })
      throw err
    }
  },

  logout: () => {
    set({ user: null, role: null, status: 'idle', error: null })
  },
}))

export function useCurrentRole(): Role | null {
  return useSessionStore((s) => s.role)
}
