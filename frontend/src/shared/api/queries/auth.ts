import { api } from '../axios/instance'
import { tokenManager } from '../axios/token-manager'
import type { User } from '../../../entities/user/model/user'

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends AuthCredentials {
  name: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface RegisterResult extends AuthTokens {
  user: User
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me')
  return response.data
}

export async function login(credentials: AuthCredentials): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>('/auth/login', credentials)
  return response.data
}

export async function register(
  credentials: RegisterCredentials,
): Promise<RegisterResult> {
  const response = await api.post<RegisterResult>('/auth/register', credentials)
  return response.data
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = tokenManager.getRefreshToken()
  if (refreshToken) {
    // skipRefresh: a 401 here means the session's already dead - no point
    // refreshing the access token just to retry a logout call.
    await api
      .post('/auth/logout', { refreshToken }, { skipRefresh: true })
      .catch(() => undefined)
  }
}
