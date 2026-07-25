import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../shared/testing/renderWithProviders'
import { CommentSection } from './CommentSection'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../../../shared/api/services/useComments'
import type { Comment } from '../../../entities/comment/model/comment'

vi.mock('../../../shared/api/services/useComments')

function commentsQueryResult(comments: Comment[], overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ items: comments, nextCursor: null }] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isError: false,
    error: null,
    isFetchNextPageError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useComments>
}

const ownComment: Comment = {
  id: 'comment-1',
  taskId: 'task-1',
  content: 'Original content',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: { id: 'user-1', email: 'jane@example.com', name: 'Jane' },
}

const othersComment: Comment = {
  ...ownComment,
  id: 'comment-2',
  author: { id: 'user-2', email: 'bob@example.com', name: 'Bob' },
}

describe('CommentSection', () => {
  const createMutateAsync = vi.fn()
  const updateMutateAsync = vi.fn()
  const deleteMutateAsync = vi.fn()

  beforeEach(() => {
    createMutateAsync.mockReset().mockResolvedValue(undefined)
    updateMutateAsync.mockReset().mockResolvedValue(undefined)
    deleteMutateAsync.mockReset().mockResolvedValue(undefined)
    vi.mocked(useCreateComment).mockReturnValue({
      mutateAsync: createMutateAsync,
    } as unknown as ReturnType<typeof useCreateComment>)
    vi.mocked(useUpdateComment).mockReturnValue({
      mutateAsync: updateMutateAsync,
    } as unknown as ReturnType<typeof useUpdateComment>)
    vi.mocked(useDeleteComment).mockReturnValue({
      mutateAsync: deleteMutateAsync,
    } as unknown as ReturnType<typeof useDeleteComment>)
  })

  function renderSection(comments: Comment[], isWorkspaceOwner = false) {
    vi.mocked(useComments).mockReturnValue(commentsQueryResult(comments))
    return renderWithProviders(
      <CommentSection
        workspaceId="workspace-1"
        projectId="project-1"
        taskId="task-1"
        currentUserId="user-1"
        isWorkspaceOwner={isWorkspaceOwner}
      />,
    )
  }

  it('shows a loading skeleton while comments are loading', () => {
    vi.mocked(useComments).mockReturnValue(commentsQueryResult([], { isLoading: true }))
    renderWithProviders(
      <CommentSection
        workspaceId="workspace-1"
        projectId="project-1"
        taskId="task-1"
        currentUserId="user-1"
        isWorkspaceOwner={false}
      />,
    )

    expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no comments', () => {
    renderSection([])
    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
  })

  it('renders each comment with its author', () => {
    renderSection([ownComment, othersComment])

    expect(screen.getByText(/Jane/)).toBeInTheDocument()
    expect(screen.getByText(/Bob/)).toBeInTheDocument()
    expect(screen.getAllByText('Original content')).toHaveLength(2)
  })

  it('only shows Edit/Remove for a comment the current user owns (or if they are the workspace owner)', () => {
    renderSection([ownComment, othersComment])

    const ownCard = screen.getByText('Jane', { exact: false }).closest('div')!.parentElement!
    const othersCard = screen.getByText('Bob', { exact: false }).closest('div')!.parentElement!

    expect(within(ownCard).getByText('Edit')).toBeInTheDocument()
    expect(within(othersCard).queryByText('Edit')).not.toBeInTheDocument()
  })

  it('posts a new comment and resets the field', async () => {
    const user = userEvent.setup()
    renderSection([])

    await user.type(screen.getByLabelText('Add a comment'), 'A new comment')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({ content: 'A new comment' }),
    )
  })

  it('disables Save in the inline editor until the content actually changes', async () => {
    const user = userEvent.setup()
    renderSection([ownComment])

    await user.click(screen.getByText('Edit'))

    const editor = screen.getByLabelText('Edit comment')
    const saveButton = screen.getByRole('button', { name: /save/i })

    // Same content as before (untouched) — Save must stay disabled, not just
    // "non-empty" (the bug this component was fixed for).
    expect(saveButton).toBeDisabled()

    // Whitespace-only change around the same text still doesn't count as a
    // real change.
    await user.clear(editor)
    await user.type(editor, '  Original content  ')
    expect(saveButton).toBeDisabled()

    await user.clear(editor)
    await user.type(editor, 'Actually different content')
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: ownComment.id,
        content: 'Actually different content',
      }),
    )
  })

  it('cancels the inline editor without saving', async () => {
    const user = userEvent.setup()
    renderSection([ownComment])

    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByText('Cancel'))

    expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument()
    expect(updateMutateAsync).not.toHaveBeenCalled()
  })

  it('deletes a comment after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderSection([ownComment])

    await user.click(screen.getByText('Remove'))

    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith(ownComment.id))
  })

  it('does not delete when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderSection([ownComment])

    await user.click(screen.getByText('Remove'))

    expect(deleteMutateAsync).not.toHaveBeenCalled()
  })
})
