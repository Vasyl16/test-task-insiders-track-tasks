import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
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

// 'error' is distinct from 'unauthenticated': a 401 (or no token at all)
// means we know the user isn't logged in - redirect to /login is correct.
// A 5xx/network failure means we simply couldn't confirm either way, and
// treating that as a logout would kick out an otherwise-valid session over
// a transient blip. Consumers (ProtectedRoute) branch on this instead of a
// single collapsed boolean.
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

function isUnauthorized(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401
}

export function useAuth() {
  const queryClient = useQueryClient()
  const hasToken = Boolean(tokenManager.getAccessToken())

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    enabled: hasToken,
    // Never worth auto-retrying a definitive 401 - it'll just fail again
    // and delays the redirect. Other failures (network blips, 5xx) often
    // self-resolve, so a couple of automatic attempts (v5's default
    // exponential backoff applies) can avoid ever showing the error UI at
    // all for a one-off hiccup.
    retry: (failureCount, err) => !isUnauthorized(err) && failureCount < 2,
  })

  let status: AuthStatus
  if (!hasToken) {
    status = 'unauthenticated'
  } else if (user) {
    // Cached identity wins over a later background failure - an already
    // -authenticated session shouldn't be logged out by a revalidation
    // that happened to fail.
    status = 'authenticated'
  } else if (isLoading) {
    status = 'loading'
  } else if (isUnauthorized(error)) {
    status = 'unauthenticated'
  } else if (isError) {
    status = 'error'
  } else {
    status = 'loading'
  }

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
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isError,
    error,
    retry: refetch,
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
