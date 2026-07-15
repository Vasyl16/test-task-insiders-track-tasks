import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { tokenManager } from './token-manager'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export function attachInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const accessToken = tokenManager.getAccessToken()
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }
    return config
  })

  let refreshPromise: Promise<string> | null = null

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error) || !error.config) {
        return Promise.reject(error)
      }

      const originalRequest = error.config as RetryableRequestConfig

      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error)
      }

      const refreshToken = tokenManager.getRefreshToken()
      if (!refreshToken) {
        tokenManager.clearTokens()
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        refreshPromise ??= refreshAccessToken(
          instance.defaults.baseURL,
          refreshToken,
        )
        const newAccessToken = await refreshPromise
        refreshPromise = null

        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`)
        return instance(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        tokenManager.clearTokens()
        return Promise.reject(refreshError)
      }
    },
  )
}

// Uses a bare axios call (not the configured instance) so the refresh
// request itself never gets intercepted and retried on its own 401.
async function refreshAccessToken(
  baseURL: string | undefined,
  refreshToken: string,
): Promise<string> {
  const response = await axios.post<{
    accessToken: string
    refreshToken: string
  }>(`${baseURL}/auth/refresh`, { refreshToken })

  const { accessToken, refreshToken: newRefreshToken } = response.data
  tokenManager.setTokens(accessToken, newRefreshToken)
  return accessToken
}
