import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDueDate, isTaskOverdue } from './task'
import type { Task } from './task'

function taskWith(overrides: Partial<Pick<Task, 'dueDate' | 'status'>>) {
  return { dueDate: null, status: 'TODO', ...overrides } satisfies Pick<
    Task,
    'dueDate' | 'status'
  >
}

describe('isTaskOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is false when there is no due date', () => {
    expect(isTaskOverdue(taskWith({ dueDate: null }))).toBe(false)
  })

  it('is false for a DONE task even with a past due date', () => {
    expect(isTaskOverdue(taskWith({ dueDate: '2026-01-01', status: 'DONE' }))).toBe(false)
  })

  it('is true for a past due date on a non-DONE task', () => {
    expect(isTaskOverdue(taskWith({ dueDate: '2026-01-01', status: 'IN_PROGRESS' }))).toBe(true)
  })

  it('is false for a future due date', () => {
    expect(isTaskOverdue(taskWith({ dueDate: '2026-02-01', status: 'TODO' }))).toBe(false)
  })
})

describe('formatDueDate', () => {
  it('formats a date as an abbreviated month + day', () => {
    expect(formatDueDate('2026-03-05')).toMatch(/\w{3}.*5/)
  })
})
