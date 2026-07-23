import { isAxiosError } from 'axios'

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') {
      return message
    }
    // The backend normalizes this to a string itself (AllExceptionsFilter),
    // but this is defensive: any response that still ends up array-shaped
    // (a validation failure listing every invalid field, in particular)
    // should still show the real message instead of falling back to a
    // generic one.
    if (Array.isArray(message) && message.every((entry) => typeof entry === 'string')) {
      return message.join('; ')
    }
  }
  return fallback
}

// 404 (resource genuinely gone) and 403 (not a member/no access) are the
// only cases where "this doesn't exist, or you don't have access" is an
// honest message — everything else (network failure, 500, timeout) is a
// real error and should say so instead of implying the resource is missing.
export function isNotFoundOrForbidden(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false
  }
  return error.response?.status === 404 || error.response?.status === 403
}
