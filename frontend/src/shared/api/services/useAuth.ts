import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMe,
  login,
  logoutRequest,
  register,
  type AuthCredentials,
  type RegisterCredentials,
} from '../queries/auth'
import { tokenManager } from '../axios/token-manager'
import { queryKeys } from '../queryKeys'
import type { User } from '../../../entities/user/model/user'

export function useAuth() {
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    enabled: Boolean(tokenManager.getAccessToken()),
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      tokenManager.clearTokens()
      // setQueryData must run *before* clear() — it's the write that
      // reliably notifies the already-mounted useAuth() observer (same
      // "removeQueries doesn't, setQueryData does" behavior confirmed
      // elsewhere in this app) and drives ProtectedRoute's redirect.
      // clear() afterward wipes every other cached query (workspaces,
      // projects, tasks, invites, ...); otherwise they'd survive the logout
      // — stale, and belonging to the wrong account — for whoever logs in
      // next in this same tab, since the QueryClient is one in-memory
      // instance for the whole SPA session, not per-user.
      queryClient.setQueryData(queryKeys.auth.me, null)
      queryClient.clear()
    },
  })

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isLoading,
    isError,
    logout: () => logoutMutation.mutateAsync(),
  }
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: AuthCredentials): Promise<User> => {
      const tokens = await login(credentials)
      tokenManager.setTokens(tokens.accessToken, tokens.refreshToken)
      return getMe()
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials): Promise<User> => {
      const result = await register(credentials)
      tokenManager.setTokens(result.accessToken, result.refreshToken)
      return result.user
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me, user)
    },
  })
}
