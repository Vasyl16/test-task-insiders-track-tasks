import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '../../testing/renderWithProviders'
import { useAuth } from './useAuth'
import * as authQueries from '../queries/auth'
import { tokenManager } from '../axios/token-manager'

vi.mock('../queries/auth')
vi.mock('../axios/token-manager', () => ({
  tokenManager: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  },
}))

const user = { id: 'user-1', email: 'jane@example.com', name: 'Jane', createdAt: '2026-01-01' }

function unauthorizedError() {
  return Object.assign(new Error('Unauthorized'), {
    isAxiosError: true,
    response: { status: 401, data: {} },
  })
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is unauthenticated with no query performed when there is no token', () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue(null)
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.isAuthenticated).toBe(false)
    expect(authQueries.getMe).not.toHaveBeenCalled()
  })

  it('is loading while a token is present and getMe has not resolved yet', () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('access-1')
    vi.mocked(authQueries.getMe).mockReturnValue(new Promise(() => {}))
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    expect(result.current.status).toBe('loading')
    expect(result.current.isLoading).toBe(true)
  })

  it('is authenticated once getMe resolves', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('access-1')
    vi.mocked(authQueries.getMe).mockResolvedValue(user)
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user).toEqual(user)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('is unauthenticated (not "error") when getMe comes back 401 — a definitive, non-retried failure', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('stale-access')
    vi.mocked(authQueries.getMe).mockRejectedValue(unauthorizedError())
    const queryClient = createTestQueryClient()

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
    expect(result.current.user).toBeNull()
    // A 401 is definitive — the hook's own retry predicate must skip
    // retrying it, so getMe should only ever be called once.
    expect(authQueries.getMe).toHaveBeenCalledTimes(1)
  })

  it('logout clears tokens, writes auth.me to null, then clears the whole cache', async () => {
    // Mirrors the real tokenManager: once cleared, getAccessToken() reports
    // no token — otherwise the still-enabled query would just refetch and
    // get the mocked user back again, masking the behavior under test.
    let hasAccessToken = true
    vi.mocked(tokenManager.getAccessToken).mockImplementation(() =>
      hasAccessToken ? 'access-1' : null,
    )
    vi.mocked(tokenManager.clearTokens).mockImplementation(() => {
      hasAccessToken = false
    })
    vi.mocked(authQueries.getMe).mockResolvedValue(user)
    vi.mocked(authQueries.logoutRequest).mockResolvedValue(undefined)
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(['unrelated', 'cached', 'query'], 'should be wiped')

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await result.current.logout()

    expect(tokenManager.clearTokens).toHaveBeenCalledTimes(1)
    // setQueryData(auth.me, null) is what notifies this already-mounted
    // hook — its effect is visible on the hook's own (still-subscribed)
    // state, even though the immediately-following clear() then wipes the
    // underlying cache entry entirely (so re-querying it directly afterward
    // would come back `undefined`, not `null`).
    await waitFor(() => expect(result.current.user).toBeNull())
    expect(queryClient.getQueryData(['unrelated', 'cached', 'query'])).toBeUndefined()
  })
})
