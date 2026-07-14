import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/axios/instance'
import { tokenManager } from '../api/axios/token-manager'
import { queryKeys } from '../api/queryKeys'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'
import type { User } from '../types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Read once at mount. Login/register (not implemented yet) will need to
  // invalidate queryKeys.auth.me after acquiring tokens for this to update
  // without a full page reload.
  const hasToken = Boolean(tokenManager.getAccessToken())

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const response = await api.get<User>('/auth/me')
      return response.data
    },
    enabled: hasToken,
    retry: false,
  })

  async function logout() {
    const refreshToken = tokenManager.getRefreshToken()
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined)
    }
    tokenManager.clearTokens()
    queryClient.removeQueries({ queryKey: queryKeys.auth.me })
  }

  const value: AuthContextValue = {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isLoading: hasToken && isLoading,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
