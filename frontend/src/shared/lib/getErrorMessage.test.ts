import { describe, expect, it } from 'vitest'
import { getErrorMessage, isNotFoundOrForbidden } from './getErrorMessage'

function axiosErrorWith(status: number, message?: string | string[]) {
  return {
    isAxiosError: true,
    response: { status, data: message === undefined ? {} : { message } },
  }
}

describe('getErrorMessage', () => {
  it('returns the backend message when it is a string', () => {
    expect(getErrorMessage(axiosErrorWith(400, 'Email is already registered'), 'fallback')).toBe(
      'Email is already registered',
    )
  })

  it('joins an array of messages with "; "', () => {
    expect(getErrorMessage(axiosErrorWith(400, ['name is required', 'email is invalid']), 'fallback')).toBe(
      'name is required; email is invalid',
    )
  })

  it('falls back when the axios error has no message', () => {
    expect(getErrorMessage(axiosErrorWith(500), 'Something went wrong')).toBe('Something went wrong')
  })

  it('falls back for a non-axios error', () => {
    expect(getErrorMessage(new Error('boom'), 'Something went wrong')).toBe('Something went wrong')
  })
})

describe('isNotFoundOrForbidden', () => {
  it('is true for 404', () => {
    expect(isNotFoundOrForbidden(axiosErrorWith(404))).toBe(true)
  })

  it('is true for 403', () => {
    expect(isNotFoundOrForbidden(axiosErrorWith(403))).toBe(true)
  })

  it('is false for other statuses', () => {
    expect(isNotFoundOrForbidden(axiosErrorWith(500))).toBe(false)
  })

  it('is false for a non-axios error', () => {
    expect(isNotFoundOrForbidden(new Error('boom'))).toBe(false)
  })
})
