import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { attachInterceptors } from './interceptors'
import { tokenManager } from './token-manager'
import { queryClient } from '../queryClient'
import { queryKeys } from '../queryKeys'

vi.mock('./token-manager', () => ({
  tokenManager: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  },
}))

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

function unauthorizedError(config: InternalAxiosRequestConfig) {
  return Object.assign(new Error('Unauthorized'), {
    isAxiosError: true,
    config,
    response: { status: 401, data: {}, headers: {}, config },
  })
}

describe('attachInterceptors', () => {
  let instance: AxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    instance = axios.create({ baseURL: 'http://test.local' })
    attachInterceptors(instance)
  })

  it('attaches the current access token as a Bearer header', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('access-123')
    const seenConfigs: InternalAxiosRequestConfig[] = []
    instance.defaults.adapter = (config) => {
      seenConfigs.push(config)
      return Promise.resolve({ data: 'ok', status: 200, statusText: 'OK', headers: {}, config })
    }

    await instance.get('/whoami')

    expect(seenConfigs[0].headers.get('Authorization')).toBe('Bearer access-123')
  })

  it('does not attach an Authorization header when there is no access token', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue(null)
    const seenConfigs: InternalAxiosRequestConfig[] = []
    instance.defaults.adapter = (config) => {
      seenConfigs.push(config)
      return Promise.resolve({ data: 'ok', status: 200, statusText: 'OK', headers: {}, config })
    }

    await instance.get('/whoami')

    expect(seenConfigs[0].headers.get('Authorization')).toBeUndefined()
  })

  it('refreshes the access token on a 401 and retries the original request once', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('expired-access')
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue('refresh-1')
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    })

    instance.defaults.adapter = (config: RetryableConfig) => {
      if (config._retry) {
        return Promise.resolve({
          data: 'ok',
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.reject(unauthorizedError(config))
    }

    const response = await instance.get('/protected')

    expect(response.data).toBe('ok')
    expect(postSpy).toHaveBeenCalledWith('http://test.local/auth/refresh', {
      refreshToken: 'refresh-1',
    })
    expect(tokenManager.setTokens).toHaveBeenCalledWith('new-access', 'new-refresh')
  })

  it('clears auth state when there is no refresh token to fall back on', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('expired-access')
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue(null)
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData')
    instance.defaults.adapter = (config) => Promise.reject(unauthorizedError(config))

    await expect(instance.get('/protected')).rejects.toBeTruthy()

    expect(tokenManager.clearTokens).toHaveBeenCalledTimes(1)
    expect(setQueryDataSpy).toHaveBeenCalledWith(queryKeys.auth.me, null)
  })

  it('clears auth state when the refresh token itself is rejected as invalid', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('expired-access')
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue('bad-refresh')
    vi.spyOn(axios, 'post').mockRejectedValue(
      Object.assign(new Error('invalid refresh token'), {
        isAxiosError: true,
        response: { status: 401, data: {}, headers: {} },
      }),
    )
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData')
    instance.defaults.adapter = (config) => Promise.reject(unauthorizedError(config))

    await expect(instance.get('/protected')).rejects.toBeTruthy()

    expect(tokenManager.clearTokens).toHaveBeenCalledTimes(1)
    expect(setQueryDataSpy).toHaveBeenCalledWith(queryKeys.auth.me, null)
  })

  it('leaves tokens alone when the refresh attempt fails for a non-auth reason', async () => {
    vi.mocked(tokenManager.getAccessToken).mockReturnValue('expired-access')
    vi.mocked(tokenManager.getRefreshToken).mockReturnValue('refresh-1')
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('network error'))
    instance.defaults.adapter = (config) => Promise.reject(unauthorizedError(config))

    await expect(instance.get('/protected')).rejects.toBeTruthy()

    expect(tokenManager.clearTokens).not.toHaveBeenCalled()
  })
})
